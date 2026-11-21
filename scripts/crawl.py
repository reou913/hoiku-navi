"""保育・子どもに関する国・県・市の資料を集めて、Supabase に登録するスクリプト。

使い方（GitHub Actions が毎週自動で動かす。手元で試すときも同じ）
  python3 scripts/crawl.py            いつもの巡回
  python3 scripts/crawl.py --dry-run  登録はせず、文字を取り出せるかだけ確かめる（合言葉がなくても動く）

必要な値（GitHub の Settings → Secrets and variables → Actions に入れる）
  HOIKU_ADMIN_URL      hoiku-admin の URL（https://（プロジェクトID）.supabase.co/functions/v1/hoiku-admin）
  HOIKU_CRAWLER_TOKEN  巡回用の合言葉（Supabase の Secrets と同じもの）

巡回する資料は sources.json に書いてあります。
  documents … 決まった資料（URLを1つずつ書く）
  watch     … 見張るページ（そのページにリンクされた PDF・Word・Excel を見つけて登録する。
              "pages": true なら、リンク先のふつうのページも登録する）

新しく見つかった資料は「公開しない（published=false）」のまま登録されます。
れおさんが Supabase の Table Editor で中身を確かめてから、published を true にします。

相手のサーバーに負担をかけないためのルール
  ・robots.txt で「見ないで」と書かれたページは開かない
  ・1つ開くごとに数秒あける
  ・1回の巡回で開くファイルの数に上限をつける
"""

import argparse
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "sources.json"
REPORT_FILE = ROOT / ".report.md"

JST = timezone(timedelta(hours=9))
USER_AGENT = "satsumasendai-hoiku-info/1.0 (+GitHub Pages; weekly crawl)"
DELAY_SECONDS = 3.0
MAX_FILES = 200           # 1回の巡回で開くファイル・ページの上限（変わっていないものも数える。3秒ずつで約10分）
MAX_DOWNLOAD = 30 * 1024 * 1024
TIMEOUT = 60
FILE_EXT = {".pdf": "pdf", ".docx": "docx", ".xlsx": "xlsx"}
OLD_EXT = {".doc", ".xls", ".ppt", ".pptx", ".jtd", ".zip"}   # 読めない形式


# ===== Webページを読む部品 =====
class PageParser(HTMLParser):
    """本文の文字と、リンク（href と文字）を集める。メニューやスクリプトは除く"""

    SKIP = {"script", "style", "nav", "header", "footer", "noscript", "form", "aside"}
    BLOCK = {"p", "div", "li", "tr", "br", "h1", "h2", "h3", "h4", "h5", "h6", "dt", "dd",
             "section", "article", "table", "caption"}
    CELL = {"td", "th"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.links, self.title, self.h1 = [], [], "", ""
        self._skip, self._href, self._atext, self._in = 0, None, [], None

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        if self._skip:
            return
        if tag in ("title", "h1"):
            self._in = tag
        if tag in self.BLOCK:
            self.parts.append("\n")
        if tag in self.CELL:
            self.parts.append(" | ")
        if tag == "a":
            self._href = dict(attrs).get("href")
            self._atext = []

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
            return
        if tag == self._in:
            self._in = None
        if tag == "a" and self._href is not None:
            self.links.append((self._href, " ".join("".join(self._atext).split())))
            self._href = None

    def handle_data(self, data):
        if self._in == "title":
            self.title += data
            return
        if self._skip:
            return
        if self._in == "h1":
            self.h1 += data
        self.parts.append(data)
        if self._href is not None:
            self._atext.append(data)

    def text(self):
        raw = "".join(self.parts)
        lines = [" ".join(l.split()) for l in raw.split("\n")]
        return "\n".join(l for l in lines if l and l != "|")


# ===== ファイルから文字を取り出す =====
def text_from_pdf(data: bytes) -> tuple[str, int]:
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    # 印刷やコピーを制限する鍵がかかったPDF（開くのにパスワードは要らないもの）は、空のパスワードで鍵を外す
    if reader.is_encrypted:
        reader.decrypt("")
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            t = page.extract_text() or ""
        except Exception:  # 1ページ読めなくても、ほかのページは読む
            t = ""
        t = "\n".join(" ".join(l.split()) for l in t.splitlines() if l.strip())
        pages.append(f"[p.{i}]\n{t}")
    return "\n".join(pages), len(reader.pages)


def text_from_docx(data: bytes) -> str:
    import docx
    d = docx.Document(io.BytesIO(data))
    out = [p.text for p in d.paragraphs if p.text.strip()]
    for t in d.tables:
        for row in t.rows:
            cells = [c.text.strip() for c in row.cells]
            if any(cells):
                out.append(" | ".join(cells))
    return "\n".join(out)


def text_from_xlsx(data: bytes) -> str:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        out.append(f"## シート：{ws.title}")
        for row in ws.iter_rows(values_only=True):
            cells = ["" if v is None else str(v).strip() for v in row]
            while cells and not cells[-1]:
                cells.pop()
            if any(cells):
                out.append(" | ".join(cells))
    return "\n".join(out)


def clean_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).replace("\u0000", "")
    return re.sub(r"\n{3,}", "\n\n", s).strip()


# ===== 通信 =====
_robots: dict[str, urllib.robotparser.RobotFileParser | None] = {}
_last = [0.0]


def allowed(url: str) -> bool:
    p = urllib.parse.urlsplit(url)
    base = f"{p.scheme}://{p.netloc}"
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            req = urllib.request.Request(base + "/robots.txt", headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=20) as r:
                rp.parse(r.read().decode("utf-8", "replace").splitlines())
            _robots[base] = rp
        except Exception:
            _robots[base] = None   # robots.txt がなければ、制限なしとして扱う
    rp = _robots[base]
    return True if rp is None else rp.can_fetch(USER_AGENT, url)


def download(url: str) -> tuple[bytes, str]:
    wait = DELAY_SECONDS - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            ctype = r.headers.get("Content-Type", "")
            data = r.read(MAX_DOWNLOAD + 1)
    finally:
        _last[0] = time.time()
    if len(data) > MAX_DOWNLOAD:
        raise ValueError("ファイルが大きすぎます（30MBまで）")
    return data, ctype


def kind_of(url: str, ctype: str = "") -> str:
    ext = Path(urllib.parse.urlsplit(url).path).suffix.lower()
    if ext in FILE_EXT:
        return FILE_EXT[ext]
    if ext in OLD_EXT:
        return "old"
    if "pdf" in ctype:
        return "pdf"
    return "html"


def decode_html(data: bytes, ctype: str) -> str:
    m = re.search(r"charset=([\w\-]+)", ctype) or re.search(rb'charset=["\']?([\w\-]+)', data[:2000])
    enc = (m.group(1).decode() if isinstance(m.group(1), bytes) else m.group(1)) if m else "utf-8"
    try:
        return data.decode(enc, "replace")
    except LookupError:
        return data.decode("utf-8", "replace")


def extract(url: str) -> dict:
    """URL を開いて、{text, file_type, title, pages, links} を返す"""
    if not allowed(url):
        raise PermissionError("robots.txt で巡回が止められています")
    data, ctype = download(url)
    kind = kind_of(url, ctype)
    if kind == "old":
        raise ValueError("古い形式（.doc / .xls など）は読めません")
    if kind == "pdf":
        text, pages = text_from_pdf(data)
        body_chars = len(re.sub(r"\[p\.\d+\]|\s", "", text))
        if pages and body_chars / pages < 20:
            raise ValueError("文字の入っていないPDF（スキャン）のようです")
        return {"text": clean_text(text), "file_type": "pdf", "title": "", "links": []}
    if kind == "docx":
        return {"text": clean_text(text_from_docx(data)), "file_type": "docx", "title": "", "links": []}
    if kind == "xlsx":
        return {"text": clean_text(text_from_xlsx(data)), "file_type": "xlsx", "title": "", "links": []}
    parser = PageParser()
    parser.feed(decode_html(data, ctype))
    title = " ".join((parser.h1 or parser.title).split())
    links = [(urllib.parse.urljoin(url, h), t) for h, t in parser.links if h and not h.startswith(("#", "mailto:", "tel:"))]
    return {"text": clean_text(parser.text()), "file_type": "html", "title": title, "links": links}


# ===== hoiku-admin を呼ぶ =====
def call_admin(payload: dict) -> dict:
    url = os.environ["HOIKU_ADMIN_URL"]
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-hoiku-token": os.environ["HOIKU_CRAWLER_TOKEN"]},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        try:
            detail = json.loads(detail).get("error", detail)
        except ValueError:
            pass
        raise RuntimeError(f"hoiku-admin {e.code}: {detail}") from None


# ===== 本体 =====
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sources", default=str(SOURCES_FILE), help="巡回先の一覧（ふだんは sources.json）")
    ap.add_argument("--delay", type=float, default=None, help="1つ開くごとにあける秒数（ふだんは3秒）")
    args = ap.parse_args()
    if args.delay is not None:
        global DELAY_SECONDS
        DELAY_SECONDS = max(args.delay, 0.0)

    sources = json.loads(Path(args.sources).read_text(encoding="utf-8"))
    report = {"new": [], "updated": [], "index_error": [], "failed": [], "retired": [], "same": 0, "skipped": 0}
    known: dict[str, dict] = {}
    if not args.dry_run:
        known = {d["url"]: d for d in call_admin({"action": "list"})}
    opened = [0]

    def register(url: str, meta: dict, title: str, title_from: str):
        if opened[0] >= MAX_FILES:
            report["skipped"] += 1
            return
        opened[0] += 1
        try:
            got = extract(url)
        except Exception as e:
            report["failed"].append((title or url, url, str(e)))
            print(f"✗ {url}: {e}")
            return
        text = got["text"]
        name = meta.get("title") or got["title"] or title or url
        print(f"・{name}（{got['file_type']}、{len(text)}字）")
        if args.dry_run:
            report["same"] += 1
            return
        try:
            res = call_admin({
                "action": "upsert", "url": url, "title": name, "title_from": title_from,
                "issuer_level": meta["issuer_level"], "issuer": meta.get("issuer", ""),
                "audience": meta.get("audience", "auto"), "category": meta.get("category", "auto"),
                "audiences": meta.get("audiences", "auto"), "ages": meta.get("ages", "auto"),
                "file_type": got["file_type"], "text": text,
                "publish": bool(meta.get("publish")),   # auto_publish の見張りだけ true
            })
        except Exception as e:
            report["failed"].append((name, url, str(e)))
            print(f"  ✗ 登録できませんでした: {e}")
            return
        r = res.get("result")
        if r == "same":
            report["same"] += 1
        else:
            report.setdefault(r, []).append((res.get("title", name), url, "公開中" if res.get("published") else "未公開"))
            print(f"  → {r}")

    # 1. 決まった資料
    for d in sources.get("documents", []):
        if not d.get("enabled", True):
            continue
        register(d["url"], d, d.get("title", ""), "sources")

    # 2. 見張るページ
    #   ・リンクされた PDF・Word・Excel を探す
    #   ・"pages": true のときは、同じサイトのふつうのページ（.html）も拾う
    #     （市の「子育て」の目次ページから、予防接種・手当などのページを集めるため）
    #     ページのリンクにはメニューも混ざるので、include_words（拾うことば）を必ず書く
    explicit = {d["url"] for d in sources.get("documents", [])}   # documents に書いたものは二重に登録しない
    seen_all: set[str] = set()
    for w in sources.get("watch", []):
        if not w.get("enabled", True):
            continue
        try:
            page = extract(w["url"])
        except Exception as e:
            report["failed"].append((w.get("name", w["url"]), w["url"], str(e)))
            continue
        words = w.get("include_words") or []
        exclude = w.get("exclude_words") or []
        want_pages = bool(w.get("pages")) and bool(words)
        host = urllib.parse.urlsplit(w["url"]).netloc
        # 毎週の週報など：keep_latest 件だけ（ページの上にある新しいものから）拾い、auto_publish ならすぐ公開する
        keep_latest = int(w.get("keep_latest") or 0)
        limit = keep_latest or w.get("max_files", 10)
        kept: list[str] = []
        count = 0
        for href, text in page["links"]:
            href = href.split("#")[0]
            kind = kind_of(href)
            is_file = kind in ("pdf", "docx", "xlsx")
            is_page = (want_pages and kind == "html" and urllib.parse.urlsplit(href).netloc == host
                       and href.endswith(".html") and not href.endswith("index.html"))   # 目次のページは拾わない
            if not (is_file or is_page) or href in seen_all or href in explicit or href == w["url"]:
                continue
            label = re.sub(r"[（(](PDF|Word|Excel|ワード|エクセル)[^）)]*[）)]", "", text, flags=re.I).strip()
            if words and not any(k in label for k in words):
                continue
            if any(k in label for k in exclude):
                continue
            if count >= limit:
                break
            seen_all.add(href)
            count += 1
            kept.append(href)
            meta = {k: w[k] for k in ("issuer_level", "issuer", "audience", "audiences", "ages", "category") if k in w}
            meta["publish"] = bool(w.get("auto_publish"))
            register(href, meta, label, "link")

        # 古い週報の公開をやめる（retire_prefix で始まるURLのうち、今回拾った kept 以外）
        if w.get("retire_prefix") and kept and not args.dry_run:
            try:
                res = call_admin({"action": "retire", "prefix": w["retire_prefix"], "keep": kept})
                for r in res.get("retired", []):
                    report["retired"].append((r["title"], r["url"], "古い週のため非公開にしました"))
            except Exception as e:
                report["failed"].append((w.get("name", w["url"]), w["url"], f"古い資料の非公開に失敗: {e}"))

    # 3. 報告を書く
    now = datetime.now(JST).strftime("%Y-%m-%d %H:%M")
    lines = [f"{now} の巡回の結果です。", ""]

    def section(key, head, note=""):
        rows = report.get(key) or []
        if rows:
            lines.append(f"### {head}（{len(rows)}件）")
            if note:
                lines.append(note)
            for t, u, extra in rows:
                lines.append(f"- [{t}]({u}) … {extra}")
            lines.append("")

    section("new", "新しく見つかった資料",
            "「未公開」のものは、Supabase の Table Editor → hoiku_documents で要約と見出しを確かめ、よければ published を true にしてください。"
            "「公開中」のものは、毎週の週報など auto_publish にした資料で、自動で公開しています。")
    section("updated", "中身が変わった資料", "索引カードを作り直しました。公開中のものは、そのまま公開されています。")
    section("index_error", "索引カードを作れなかった資料", "次の巡回でもう一度作ります。続くときは Edge Function の Logs を見てください。")
    section("retired", "公開をやめた古い資料", "毎週の週報などで、新しい週が出たので古い週を非公開にしました。")
    section("failed", "開けなかった・読めなかった資料",
            "URLが変わったか、古い形式・スキャンのPDFかもしれません。sources.json を直すか、保育者ページの「園内資料の登録」から文字にしたものを入れてください。")
    lines.append(f"変わりなし：{report['same']}件　上限で後回し：{report['skipped']}件")
    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))

    notify = len(report["new"]) + len(report["updated"]) + len(report.get("index_error", [])) + len(report["failed"])
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(f"notify_count={notify}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
