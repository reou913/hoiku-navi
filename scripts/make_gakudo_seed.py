"""放課後児童クラブの一覧（data/gakudo.tsv）から、hoiku_facilities に入れるSQLを作る。
出典：薩摩川内市 子育て応援ガイド p.49・50「放課後児童クラブ」（令和8年9月のPDF）
使い方: python3 scripts/make_gakudo_seed.py > supabase/hoiku_gakudo_seed.sql
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = "https://www.city.satsumasendai.lg.jp/material/files/group/20/houkagojidoukurabu.pdf"
AS_OF = "令和8年9月時点（市の子育て応援ガイド p.49・50）"
CLOSED = {"15", "24"}   # 資料に「休所中」とあるクラブ
# 小学校区 → 地域
AREA = {"樋脇": "樋脇", "市比野": "樋脇", "入来": "入来", "副田": "入来", "東郷": "東郷",
        "祁答院": "祁答院", "里": "里", "手打": "下甑"}


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


rows = []
for r in csv.DictReader(open(ROOT / "data" / "gakudo.tsv", encoding="utf-8"), delimiter="\t"):
    note = []
    if r["no"] in CLOSED:
        note.append("休所中（令和8年9月の市の資料より）")
    if r["設置場所"]:
        note.append(f"場所：{r['設置場所']}")
    vals = [r["名前"], "放課後児童クラブ", AREA.get(r["校区"], "川内"), r["所在地"], r["電話"],
            r["定員"], f"平日 {r['平日']}", r["学校休業日"], r["校区"], r["経営主体"], "小学生",
            "利用料はクラブごとにちがいます。各クラブに問い合わせてください。", "。".join(note), AS_OF, SOURCE_URL]
    rows.append("  (" + ", ".join(q(v) for v in vals) + ")")

print(f"""-- =====================================================================
-- 放課後児童クラブ（学童）{len(rows)}か所を hoiku_facilities に入れる
-- 出典：{AS_OF}
-- hoiku_setup.sql のあとに、SQL Editor に貼り付けて「Run」。何回実行しても大丈夫です。
-- =====================================================================
insert into public.hoiku_facilities
  (name, type, area, address, phone, capacity, open_hours, hours_holiday, school, operator, target,
   fees_note, note, info_as_of, source_url)
values
{",\n".join(rows)}
on conflict (name, type) do update set
  area = excluded.area, address = excluded.address, phone = excluded.phone, capacity = excluded.capacity,
  open_hours = excluded.open_hours, hours_holiday = excluded.hours_holiday, school = excluded.school,
  operator = excluded.operator, target = excluded.target, fees_note = excluded.fees_note,
  note = excluded.note, info_as_of = excluded.info_as_of, source_url = excluded.source_url, updated_at = now();
""")
