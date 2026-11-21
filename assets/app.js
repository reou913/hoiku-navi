// =====================================================================
// 保育ナビ（仮）共通の部品
//   ・Supabase とのつなぎ
//   ・資料の一覧（絞り込み・検索）
//   ・AIへの質問（ひなた・しおり）
// 各ページの最後で Hoiku.xxx() を呼んで使う。
// =====================================================================
(function () {
  "use strict";

  const cfg = window.HOIKU_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- 案内役の顔（SVG） ----------
  const FACES = {
    parent: `<svg class="face" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#FFE3B8"/>
      <g fill="#F2A33A">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path transform="rotate(${a} 32 32)" d="M32 1l3 7h-6z"/>`).join("")}</g>
      <circle cx="32" cy="35" r="19" fill="#FFD7BE"/>
      <path d="M13 33c0-12 8-19 19-19s19 7 19 19c-4-6-10-8-14-8-3 4-9 6-15 5-4 0-7 1-9 3z" fill="#8A4B2A"/>
      <circle cx="25" cy="37" r="2.2" fill="#3A2418"/><circle cx="39" cy="37" r="2.2" fill="#3A2418"/>
      <circle cx="21" cy="42" r="3" fill="#FF9C86" opacity=".6"/><circle cx="43" cy="42" r="3" fill="#FF9C86" opacity=".6"/>
      <path d="M27 44c3 3 7 3 10 0" stroke="#3A2418" stroke-width="2" fill="none" stroke-linecap="round"/>
    </svg>`,
    staff: `<svg class="face" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#DDE5FA"/>
      <path d="M46 4v18l-4-3-4 3V4z" fill="#3F5BA9"/>
      <circle cx="32" cy="35" r="19" fill="#F7D9C4"/>
      <path d="M13 34c0-13 8-20 19-20s19 7 19 20c-3-5-8-9-19-9s-16 4-19 9z" fill="#2E2A3A"/>
      <circle cx="25" cy="38" r="5" fill="none" stroke="#2E2A3A" stroke-width="1.8"/>
      <circle cx="39" cy="38" r="5" fill="none" stroke="#2E2A3A" stroke-width="1.8"/>
      <path d="M30 38h4" stroke="#2E2A3A" stroke-width="1.8"/>
      <circle cx="25" cy="38" r="1.6" fill="#2E2A3A"/><circle cx="39" cy="38" r="1.6" fill="#2E2A3A"/>
      <path d="M28 46c2.5 2 5.5 2 8 0" stroke="#2E2A3A" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`,
    facility: `<svg class="face" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#D7F0E3"/>
      <path d="M14 32 32 17l18 15v16H14z" fill="#FFFFFF"/>
      <path d="M11 33 32 15l21 18" stroke="#23845F" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="28" y="36" width="8" height="12" rx="2" fill="#F2A33A"/>
      <circle cx="21" cy="36" r="3" fill="#7EC8E3"/><circle cx="43" cy="36" r="3" fill="#7EC8E3"/>
    </svg>`,
  };

  // ---------- Supabase ----------
  function ready() {
    return Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_KEY && window.supabase);
  }
  let _db = null;
  function db() {
    if (!_db) _db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    return _db;
  }
  function showSetup(el, msg) {
    if (!el) return;
    el.hidden = false;
    el.textContent = msg || "config.js に Supabase の URL と公開用の鍵を書くと、ここに情報が出ます。";
  }

  // 本文（body）は画面からは読めないので、列を指定して取り出す
  const DOC_COLS = "id,title,issuer_level,issuer,audience,audiences,ages,visibility,category,url,file_path,file_type,source_updated,summary,headings,keywords,faq,updated_at";

  async function fetchDocs() {
    const { data, error } = await db().from("hoiku_documents").select(DOC_COLS)
      .order("issuer_level").order("title");
    if (error) throw error;
    return data || [];
  }

  // ---------- 資料の一覧 ----------
  const LEVEL_ORDER = { "国": 0, "県": 1, "市": 2, "園": 3 };
  const AGES = [["nyuyoji", "乳幼児"], ["shogaku", "小学生"], ["chugaku", "中学生"], ["koko", "高校生"]];
  const AGE_LABEL = Object.fromEntries(AGES);
  // その資料が、その人向けか（audiences の列がまだ空の資料は、前からある audience の列で決める）
  function forWho(d, who) {
    if (Array.isArray(d.audiences) && d.audiences.length) return d.audiences.includes(who);
    if (who === "student") return false;
    return d.audience === "both" || d.audience === who;
  }

  function renderDocList(root, docs, opts = {}) {
    const state = { level: "", category: "", age: opts.age || "", q: opts.q || "" };
    const agesHere = AGES.filter(([k]) => docs.some((d) => (d.ages || []).includes(k)));
    const levels = [...new Set(docs.map((d) => d.issuer_level))].sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);
    const cats = [...new Set(docs.map((d) => d.category))].sort();
    root.innerHTML = `
      <div class="filters">
        <input class="search" type="search" placeholder="ことばでさがす（例：保育料、奨学金、アレルギー）" aria-label="資料をことばでさがす">
        <div class="chips" data-k="level" role="group" aria-label="発行元で絞り込む">
          <button class="chip" aria-pressed="true" data-v="">すべて</button>
          ${levels.map((l) => `<button class="chip" aria-pressed="false" data-v="${esc(l)}">${esc(l)}${l === "園" ? "内資料" : "の資料"}</button>`).join("")}
        </div>
        ${agesHere.length ? `<div class="chips" data-k="age" role="group" aria-label="子どもの年齢で絞り込む">
          <button class="chip" aria-pressed="${!state.age}" data-v="">すべての年齢</button>
          ${agesHere.map(([k, l]) => `<button class="chip" aria-pressed="${state.age === k}" data-v="${k}">${l}</button>`).join("")}
        </div>` : ""}
        <div class="chips" data-k="category" role="group" aria-label="分野で絞り込む">
          <button class="chip" aria-pressed="true" data-v="">すべての分野</button>
          ${cats.map((c) => `<button class="chip" aria-pressed="false" data-v="${esc(c)}">${esc(c)}</button>`).join("")}
        </div>
        <div class="result-count" aria-live="polite"></div>
      </div>
      <div class="doc-list"></div>`;
    const list = $(".doc-list", root);
    const count = $(".result-count", root);

    function hay(d) {
      return [d.title, d.issuer, d.summary, d.category, (d.keywords || []).join(" "),
        (d.headings || []).map((h) => h.title).join(" "), (d.faq || []).join(" ")].join(" ").normalize("NFKC").toLowerCase();
    }
    function draw() {
      const q = state.q.normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean);
      const shown = docs.filter((d) =>
        (!state.level || d.issuer_level === state.level) &&
        (!state.category || d.category === state.category) &&
        (!state.age || !(d.ages || []).length || d.ages.includes(state.age)) &&   // 年齢の印がない資料は、どの年齢でも出す
        q.every((w) => hay(d).includes(w))
      ).sort((a, b) => LEVEL_ORDER[a.issuer_level] - LEVEL_ORDER[b.issuer_level]);
      count.textContent = `${shown.length}件の資料`;
      if (!shown.length) {
        list.innerHTML = `<div class="empty">${docs.length ? "当てはまる資料がありません。ことばを変えるか、上の質問欄で聞いてみてください。" : "まだ公開している資料がありません。"}</div>`;
        return;
      }
      list.innerHTML = shown.map((d) => {
        const heads = (d.headings || []).filter((h) => h.title);
        const link = d.visibility === "internal"
          ? `<button class="btn ghost small" data-open="${esc(d.file_path)}">元のファイルを開く</button>`
          : d.url ? `<a class="btn ghost small" href="${esc(d.url)}" target="_blank" rel="noopener">元の資料を開く</a>` : "";
        const del = opts.onDelete && d.visibility === "internal"
          ? `<button class="btn ghost small" data-del="${d.id}">消す</button>` : "";
        return `<article class="doc">
          <div class="doc-top"><span class="level" data-l="${esc(d.issuer_level)}">${esc(d.issuer_level)}</span>
            <span>${esc(d.issuer || "")}</span><span>・${esc(d.category)}</span>
            ${(d.ages || []).map((a) => `<span class="age">${esc(AGE_LABEL[a] || a)}</span>`).join("")}</div>
          <h3>${esc(d.title)}</h3>
          ${d.summary ? `<p class="summary">${esc(d.summary)}</p>` : ""}
          ${heads.length ? `<details><summary>見出し（${heads.length}）</summary><ol>${heads.map((h) =>
            `<li>${esc(h.title)}${h.page ? `<span>p.${esc(h.page)}</span>` : ""}</li>`).join("")}</ol></details>` : ""}
          ${(d.keywords || []).length ? `<div class="kw">${d.keywords.slice(0, 10).map((k) => `<span>${esc(k)}</span>`).join("")}</div>` : ""}
          <div class="doc-foot"><span>${d.source_updated ? `資料の時点：${esc(d.source_updated)}` : ""}</span>
            <span class="row">${del}${link}</span></div>
        </article>`;
      }).join("");
    }

    $(".search", root).value = state.q;
    $(".search", root).addEventListener("input", (e) => { state.q = e.target.value; draw(); });
    root.querySelectorAll(".chips").forEach((group) => {
      group.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        group.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
        state[group.dataset.k] = b.dataset.v;
        draw();
      });
    });
    list.addEventListener("click", async (e) => {
      const open = e.target.closest("[data-open]");
      if (open) {
        // 園内資料のファイルは非公開。5分だけ使える一時的なURLを作って開く
        const w = window.open("", "_blank");
        const { data, error } = await db().storage.from("hoiku-internal").createSignedUrl(open.dataset.open, 300);
        if (error || !data) { if (w) w.close(); alert("ファイルを開けませんでした。"); return; }
        if (w) w.location = data.signedUrl; else location.href = data.signedUrl;
      }
      const del = e.target.closest("[data-del]");
      if (del && opts.onDelete) opts.onDelete(Number(del.dataset.del));
    });
    draw();
  }

  // ---------- 2文字ずつの組（ことばでさがすときに使う。Edge Function と同じ考え方） ----------
  const STOP = new Set(["です", "ます", "てい", "ので", "くだ", "ださ", "さい", "につ", "つい", "いて", "あり", "りま", "しょ", "ょう", "どう", "なに", "何で", "でき", "よう", "うな", "こと", "とき", "には", "のは", "した", "して"]);
  function bigrams(s) {
    const out = new Set();
    const t = String(s).normalize("NFKC").toLowerCase().replace(/[\s、。・「」『』（）()［］\[\]？?！!：:,.／/\-ー〜~]+/g, " ");
    for (const part of t.split(" ")) {
      const ch = [...part];
      if (ch.length === 1) out.add(ch[0]);
      for (let i = 0; i < ch.length - 1; i++) { const b = ch[i] + ch[i + 1]; if (!STOP.has(b)) out.add(b); }
    }
    return out;
  }

  // ---------- AIへの質問 ----------
  const COOLDOWN_SEC = 20;
  const PERSONAL = /(\d{2,4}-\d{2,4}-\d{3,4})|(\d{10,11})|([\w.+-]+@[\w-]+\.[\w.]+)|(\d{3}-\d{4})/;

  function setupAsk(root, audience) {
    const GUIDES = {
      staff: { name: "しおり", sub: "保育者・先生向けの資料係", hint: "例：嘔吐したときの消毒のしかたは？",
        examples: ["嘔吐物の処理と消毒のしかたは？", "インフルエンザの登園のめやすは？", "保育所の変更届はどこに出す？"] },
      student: { name: "ひなた", sub: "中高生のための案内役", hint: "例：高校の授業料の支援はある？",
        examples: ["高校の授業料の支援はある？", "返さなくてよい奨学金はある？", "学校のことで相談できるところは？"] },
      parent: { name: "ひなた", sub: "保護者向けの案内役", hint: "例：4月から入園するには、いつまでに申し込む？",
        examples: ["4月入園の申し込みはいつまで？", "3歳からの保育料は無料？", "小学生の就学援助とは？"] },
    };
    const guide = GUIDES[audience] || GUIDES.parent;
    const max = 300;
    root.innerHTML = `
      <div class="ask-head">${FACES[audience]}
        <div><h2>${guide.name}に聞いてみる</h2><p>${guide.sub}。このサイトの資料だけをもとに答えます。</p></div></div>
      <div class="ask-box">
        <textarea maxlength="${max}" placeholder="${esc(guide.hint)}" aria-label="${guide.name}への質問"></textarea>
        <button class="mic" type="button" aria-pressed="false" aria-label="声で入力" hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </button>
      </div>
      <div class="ask-row"><span class="count">0 / ${max}</span><button class="btn send" type="button">聞いてみる</button></div>
      <div class="examples">${guide.examples.map((x) => `<button type="button">${esc(x)}</button>`).join("")}</div>
      <p class="privacy">${audience === "student"
        ? "質問の内容は、サイトをよくするために記録するよ。自分や友だちの名前、電話番号、学校名など、個人の情報は書かないでね。"
        : "質問の内容は、サイトをよくするために記録します。お子さんの名前や電話番号など、個人の情報は書かないでください。"}</p>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="answers"></div>
      <p class="disclaimer">AIの答えはまちがえることがあります。大事なことは、元の資料や問い合わせ先で確かめてください。体調が急に悪いときは、迷わず119番へ。</p>`;

    const ta = $("textarea", root), send = $(".send", root), status = $(".status", root),
      answers = $(".answers", root), counter = $(".count", root), mic = $(".mic", root);
    const endpoint = cfg.SUPABASE_URL ? `${cfg.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/hoiku-ask` : "";
    const KEY = `hoiku-ask-last-${audience}`;

    const updateCount = () => { counter.textContent = `${[...ta.value].length} / ${max}`; };
    ta.addEventListener("input", updateCount);
    $(".examples", root).addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) { ta.value = b.textContent; updateCount(); ta.focus(); }
    });

    function setStatus(msg, isError) { status.textContent = msg; status.classList.toggle("error", Boolean(isError)); }

    function lastTime() { try { return Number(localStorage.getItem(KEY) || 0); } catch { return 0; } }
    function saveTime() { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* 保存できなくても動く */ } }

    async function ask() {
      const question = ta.value.replace(/\s+/g, " ").trim();
      if (!question) return setStatus("質問を入れてください。", true);
      if (PERSONAL.test(question)) return setStatus("電話番号やメールアドレスのような文字があります。消してから聞いてください。", true);
      if (!endpoint || !cfg.SUPABASE_KEY) return setStatus("まだ準備中です（config.js の設定が必要です）。", true);
      const wait = COOLDOWN_SEC - Math.floor((Date.now() - lastTime()) / 1000);
      if (wait > 0) return setStatus(`続けて聞くときは、あと${wait}秒待ってください。`, true);

      send.disabled = true;
      setStatus(`${guide.name}が資料を読んでいます…`);
      saveTime();
      const q = document.createElement("div");
      q.className = "bubble-q";
      q.textContent = question;
      answers.prepend(q);

      try {
        const headers = { "Content-Type": "application/json", apikey: cfg.SUPABASE_KEY };
        // 保育者がログインしていれば、その人の鍵を付ける（園内資料も読めるようになる）
        let token = "";
        if (ready()) {
          const { data } = await db().auth.getSession();
          token = data?.session?.access_token || "";
        }
        if (token) headers.Authorization = `Bearer ${token}`;
        else if (cfg.SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.SUPABASE_KEY}`;

        const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ question, audience }) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || `${guide.name}がうまく答えられませんでした。`);

        const a = document.createElement("div");
        a.className = "bubble-a";
        const cited = new Set([...String(json.answer).matchAll(/資料\s*(\d+)/g)].map((m) => Number(m[1])));
        const srcs = (json.sources || []).filter((s) => cited.has(s.n));
        a.innerHTML = `${FACES[audience]}<div class="body"></div>`;
        const body = $(".body", a);
        body.textContent = json.answer;
        if (srcs.length) {
          const ul = document.createElement("ul");
          ul.className = "cite-list";
          ul.innerHTML = srcs.map((s) => `<li><b>資料${s.n}</b>　${
            s.url && /^https:\/\//.test(s.url) ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
              : `${esc(s.title)}${s.internal ? "（園内資料）" : ""}`}</li>`).join("");
          body.appendChild(ul);
        }
        q.after(a);
        ta.value = "";
        updateCount();
        setStatus("");
      } catch (e) {
        const msg = e instanceof TypeError
          ? `${guide.name}につながりませんでした。通信の状態を確かめて、もう一度ためしてください。`
          : e.message;
        setStatus(msg, true);
        q.remove();
      } finally {
        send.disabled = false;
      }
    }
    send.addEventListener("click", ask);
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask(); });

    attachMic(ta, mic, setStatus, max, updateCount);
  }

  // ---------- 声で入力（使えるブラウザだけボタンを出す） ----------
  function attachMic(ta, mic, setStatus, max, onUpdate) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !mic) return;
    mic.hidden = false;
    let rec = null;
    mic.addEventListener("click", () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = "ja-JP";
      rec.interimResults = true;
      const base = ta.value;
      rec.onresult = (ev) => {
        let t = "";
        for (const r of ev.results) t += r[0].transcript;
        ta.value = (base + t).slice(0, max);
        if (onUpdate) onUpdate();
      };
      rec.onerror = (ev) => setStatus(ev.error === "not-allowed" ? "マイクが使えません。ブラウザの設定で許可してください。" : "うまく聞き取れませんでした。", true);
      rec.onend = () => { rec = null; mic.setAttribute("aria-pressed", "false"); };
      mic.setAttribute("aria-pressed", "true");
      setStatus("聞いています…話し終わったら、もう一度マイクを押してください。");
      rec.start();
    });
  }

  // ---------- 表示の切りかえ（自動 → ライト → ダーク） ----------
  (function setupTheme() {
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    const LABEL = { auto: "表示：自動", light: "表示：ライト", dark: "表示：ダーク" };
    const ORDER = ["auto", "light", "dark"];
    const read = () => { try { return localStorage.getItem("hoiku-theme") || "auto"; } catch { return "auto"; } };
    function apply(t) {
      if (t === "auto") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = t;
      btn.textContent = LABEL[t];
      // スマホの上の帯の色も合わせる
      const dark = t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
      document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.content = dark ? "#171412" : "#FBF7F0"; });
    }
    apply(read());
    btn.addEventListener("click", () => {
      const next = ORDER[(ORDER.indexOf(read()) + 1) % ORDER.length];
      try { if (next === "auto") localStorage.removeItem("hoiku-theme"); else localStorage.setItem("hoiku-theme", next); } catch { /* 保存できなくても切りかえる */ }
      apply(next);
    });
  })();

  FACES.student = FACES.parent;   // 中高生のページもひなたが担当

  window.Hoiku = { cfg, $, esc, db, ready, showSetup, fetchDocs, renderDocList, setupAsk, attachMic, bigrams, forWho, AGE_LABEL, FACES, PERSONAL, COOLDOWN_SEC };
})();
