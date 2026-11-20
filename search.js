// =====================================================================
// トップページの「まとめてさがす」
//   ・ことばでさがす …… 画面の中だけで探す（無料・すぐ）
//   ・AIにまとめてもらう …… hoiku-ask（audience: "all"）に聞き、要約と検索結果を受け取る
// どちらも「保護者向けの資料」「保育者向けの資料」「園」の3つに分けて表示する。
// =====================================================================
(function () {
  "use strict";
  const { $, esc, db, ready, cfg } = Hoiku;
  const root = $("#finder");
  const MAX = 300;

  root.innerHTML = `
    <div class="finder-head">
      <h2>まとめてさがす</h2>
      <p>保護者向けの資料・保育者向けの資料・市内の園や学童を、いっしょに探します。</p>
    </div>
    <div class="mode" role="radiogroup" aria-label="さがし方">
      <button type="button" role="radio" aria-checked="true" data-mode="word">ことばでさがす</button>
      <button type="button" role="radio" aria-checked="false" data-mode="ai">AIにまとめてもらう</button>
    </div>
    <div class="ask-box finder-box">
      <textarea rows="2" maxlength="${MAX}" placeholder="例：嘔吐、1号認定、可愛小の学童" aria-label="さがすことば"></textarea>
      <button class="mic" type="button" aria-pressed="false" aria-label="声で入力" hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
      </button>
    </div>
    <div class="ask-row"><span class="mode-note"></span><button class="btn go" type="button">さがす</button></div>
    <div class="examples">
      ${["4月入園の申し込みはいつまで？", "嘔吐したときの消毒", "1号認定で通える園", "可愛小の学童"].map((x) => `<button type="button">${esc(x)}</button>`).join("")}
    </div>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="finder-results" hidden>
      <div class="finder-answer" hidden></div>
      <div class="groups">
        <section class="group" data-g="parent"><h3><span class="dot"></span>保護者向けの資料</h3><div class="items"></div></section>
        <section class="group" data-g="staff"><h3><span class="dot"></span>保育者向けの資料</h3><div class="items"></div></section>
        <section class="group" data-g="facilities"><h3><span class="dot"></span>園・学童</h3><div class="items"></div></section>
      </div>
    </div>`;

  const ta = $("textarea", root), go = $(".go", root), status = $(".status", root), note = $(".mode-note", root);
  const results = $(".finder-results", root), answerEl = $(".finder-answer", root);
  let mode = "word";

  function setStatus(msg, isError) { status.textContent = msg; status.classList.toggle("error", Boolean(isError)); }
  function setMode(m) {
    mode = m;
    root.querySelectorAll(".mode button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.mode === m)));
    note.textContent = m === "ai" ? "AIが資料を読んで、答えの要点をまとめます（20秒に1回まで）" : "すぐに結果が出ます";
    go.textContent = m === "ai" ? "AIにまとめてもらう" : "さがす";
  }
  setMode("word");
  root.querySelector(".mode").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
  $(".examples", root).addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { ta.value = b.textContent; ta.focus(); } });
  Hoiku.attachMic(ta, $(".mic", root), setStatus, MAX);
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); run(); } });
  go.addEventListener("click", run);

  // ---------- 結果を出す ----------
  const pageOf = { parent: "parent.html", staff: "staff.html" };
  function docItem(d, g) {
    const more = `${pageOf[g]}?q=${encodeURIComponent(d.title)}`;
    return `<article class="hit">
      <div class="doc-top"><span class="level" data-l="${esc(d.issuer_level)}">${esc(d.issuer_level)}</span>
        ${d.n ? `<span class="ref">資料${d.n}</span>` : ""}<span>${esc(d.category || "")}</span></div>
      <h4>${esc(d.title)}</h4>
      ${d.summary ? `<p>${esc(d.summary)}</p>` : ""}
      <div class="row">
        ${d.url && /^https:\/\//.test(d.url) ? `<a class="btn ghost small" href="${esc(d.url)}" target="_blank" rel="noopener">元の資料</a>` : ""}
        <a class="btn ghost small" href="${more}">${g === "parent" ? "保護者" : "保育者"}のページで見る</a>
      </div></article>`;
  }
  function facItem(f) {
    const people = (v) => (v ? (/^\d+$/.test(v) ? `${v}人` : v) : "");
    const gakudo = f.type === "放課後児童クラブ";
    const facts = gakudo
      ? [f.school && `${f.school}小学校区`, f.capacity && `定員 ${people(f.capacity)}`, f.open_hours].filter(Boolean).join("・")
      : [f.capacity && `保育 ${people(f.capacity)}`, f.kyoiku_capacity && `1号 ${people(f.kyoiku_capacity)}`].filter(Boolean).join("・");
    return `<article class="hit">
      <div class="doc-top"><span class="type">${esc(f.type)}</span><span>${esc(f.area)}</span>${/休所中/.test(f.note || "") ? '<span class="closed">休所中</span>' : ""}</div>
      <h4>${esc(f.name)}</h4>
      <p>${esc(f.address)}${facts ? `　${gakudo ? "" : "定員："}${esc(facts)}` : ""}</p>
      <div class="row"><a class="btn ghost small" href="facilities.html?q=${encodeURIComponent(f.name)}">くわしく見る</a></div></article>`;
  }
  function show(groups, q) {
    results.hidden = false;
    for (const g of ["parent", "staff", "facilities"]) {
      const box = root.querySelector(`.group[data-g="${g}"]`);
      const items = groups[g] || [];
      const total = g === "facilities" ? (groups.facilities_total ?? items.length) : items.length;
      box.querySelector("h3").dataset.count = total > items.length ? `${total}か所中${items.length}` : `${items.length}件`;
      const more = g === "facilities" ? `facilities.html?q=${encodeURIComponent(q)}` : `${pageOf[g]}`;
      box.querySelector(".items").innerHTML = items.length
        ? items.map((x) => (g === "facilities" ? facItem(x) : docItem(x, g))).join("") +
          (g === "facilities" && total > items.length
            ? `<a class="btn small all-link" href="facilities.html?ids=${(groups.facilities_ids || []).join(",")}&from=${encodeURIComponent(q)}">${total}か所すべて見る</a>` : "")
        : `<p class="none">見つかりませんでした。<a href="${more}">${g === "facilities" ? "施設の一覧" : g === "parent" ? "保護者のページ" : "保育者のページ"}</a>から探せます。</p>`;
    }
  }

  // ---------- ことばでさがす（画面の中だけ） ----------
  let cache = null;
  async function loadAll() {
    if (cache) return cache;
    const [docs, fac] = await Promise.all([
      Hoiku.fetchDocs(),
      db().from("hoiku_facilities").select("id,name,type,area,address,phone,capacity,kyoiku_capacity,hours_standard,open_hours,hours_holiday,school,operator,target,note,info_as_of").then((r) => {
        if (r.error) throw r.error;
        return r.data || [];
      }),
    ]);
    cache = { docs: docs.filter((d) => d.visibility === "public"), fac };
    return cache;
  }
  function rank(q, rows, fieldsOf, keep) {
    const qb = Hoiku.bigrams(q);
    const texts = rows.map((r) => fieldsOf(r).map(([t, w]) => [String(t || "").normalize("NFKC").toLowerCase(), w]));
    const wt = new Map();
    for (const b of qb) {
      const df = texts.filter((fs) => fs.some(([t]) => t.includes(b))).length;
      wt.set(b, df ? Math.log(1 + rows.length / df) * (kanaOnly(b) ? 0.3 : 1) : 0);
    }
    const scored = rows.map((r, i) => {
      let s = 0;
      for (const [t, w] of texts[i]) for (const b of qb) if (t.includes(b)) s += w * wt.get(b);
      return { r, s };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    const top = scored[0]?.s ?? 0;
    return scored.filter((x) => x.s >= top * 0.35).slice(0, keep).map((x) => x.r);
  }
  // 園をさがす（Edge Function の rankFacilities と同じ考え方）
  const AREAS = ["川内", "樋脇", "入来", "東郷", "祁答院", "里", "上甑", "下甑", "鹿島"];
  const kanaOnly = (b) => /^[\u3041-\u309f]+$/.test(b);
  function findFacilities(q, rows) {
    const qn = q.normalize("NFKC").replace(/薩摩川内(市)?/g, "");
    let pool = rows, narrowed = false;
    // 学童・発達支援を聞いているか
    const wantsGakudo = /学童|児童クラブ|放課後児童/.test(qn);
    if (wantsGakudo) { pool = pool.filter((r) => r.type === "放課後児童クラブ"); narrowed = true; }
    else if (/発達|療育|放課後等デイ|放デイ/.test(qn)) { pool = pool.filter((r) => r.type === "児童発達支援" || r.type === "放課後等デイサービス"); narrowed = true; }
    // 保育園・こども園・幼稚園を聞いているときは、学童・発達支援を外す
    else if (/保育|幼稚園|こども園|園/.test(qn)) { pool = pool.filter((r) => !["放課後児童クラブ", "児童発達支援", "放課後等デイサービス"].includes(r.type)); }
    // 場所：小学校区 → 町名 → 地域 の順に見る
    const schools = [...new Set(rows.map((r) => r.school).filter((sc) => sc && qn.includes(sc)))];
    const areas = AREAS.filter((a) => qn.includes(a) && !(a === "里" && /里[帰親]/.test(qn)));
    const towns = [...new Set(rows.map((r) => (r.address.match(/^(.+?町)/) || [])[1]).filter((t) => t && qn.includes(t)))];
    // 小学校区は、学童を聞いているときだけ使う（「樋脇」は小学校区でも地域でもあるので、地域の学童もいっしょに出す）
    if (wantsGakudo && schools.length) { pool = pool.filter((r) => schools.includes(r.school) || areas.includes(r.area) || towns.some((t) => r.address.startsWith(t))); narrowed = true; }
    else if (towns.length) { pool = pool.filter((r) => towns.some((t) => r.address.startsWith(t))); narrowed = true; }
    else if (areas.length) { pool = pool.filter((r) => areas.includes(r.area)); narrowed = true; }
    if (/1号|一号|幼稚園|教育標準/.test(qn)) { pool = pool.filter((r) => r.kyoiku_capacity || r.type === "幼稚園"); narrowed = true; }
    else if (/こども園/.test(qn)) { pool = pool.filter((r) => r.type === "認定こども園"); narrowed = true; }
    const qb = Hoiku.bigrams(qn);
    const scored = pool.map((r) => {
      const t = `${r.name} ${r.type} ${r.school || ""} ${r.note}`.normalize("NFKC").toLowerCase();
      let s = 0;
      for (const b of qb) if (t.includes(b)) s += kanaOnly(b) ? 0.3 : 1;
      return { r, s };
    }).sort((a, b) => b.s - a.s);
    return (narrowed ? scored : scored.filter((x) => x.s >= 2))
      .sort((a, b) => b.s - a.s || a.r.name.localeCompare(b.r.name, "ja")).map((x) => x.r);
  }

  async function wordSearch(q) {
    const { docs, fac } = await loadAll();
    const docFields = (d) => [[d.title, 3], [(d.keywords || []).join(" "), 3], [(d.headings || []).map((h) => h.title).join(" "), 2],
      [(d.faq || []).join(" "), 2], [`${d.summary} ${d.category} ${d.issuer}`, 1]];
    const hits = rank(q, docs, docFields, 20);
    const facs = findFacilities(q, fac);
    return {
      facilities_total: facs.length,
      facilities_ids: facs.map((f) => f.id),
      parent: hits.filter((d) => d.audience !== "staff").slice(0, 4),
      staff: hits.filter((d) => d.audience !== "parent").slice(0, 4),
      facilities: facs.slice(0, 6),
    };
  }

  // ---------- AIにまとめてもらう ----------
  const KEY = "hoiku-ask-last-all";
  const lastTime = () => { try { return Number(localStorage.getItem(KEY) || 0); } catch { return 0; } };
  const saveTime = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* 保存できなくても動く */ } };

  async function aiSearch(q) {
    const endpoint = `${cfg.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/hoiku-ask`;
    const headers = { "Content-Type": "application/json", apikey: cfg.SUPABASE_KEY };
    if (cfg.SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = `Bearer ${cfg.SUPABASE_KEY}`;
    const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ question: q, audience: "all" }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "AIがうまく答えられませんでした。");
    return json;
  }

  async function run() {
    const q = ta.value.replace(/\s+/g, " ").trim();
    if (!q) return setStatus("さがすことばを入れてください。", true);
    if (!ready()) return setStatus("まだ準備中です（config.js の設定が必要です）。", true);
    if (Hoiku.PERSONAL.test(q)) return setStatus("電話番号やメールアドレスのような文字があります。消してからさがしてください。", true);

    if (mode === "word") {
      answerEl.hidden = true;
      try {
        show(await wordSearch(q), q);
        setStatus("");
      } catch (e) {
        console.error(e);
        setStatus("読みこめませんでした。時間をおいて、もう一度ためしてください。", true);
      }
      return;
    }

    const wait = Hoiku.COOLDOWN_SEC - Math.floor((Date.now() - lastTime()) / 1000);
    if (wait > 0) return setStatus(`AIで続けてさがすときは、あと${wait}秒待ってください。「ことばでさがす」ならすぐ使えます。`, true);
    go.disabled = true;
    saveTime();
    setStatus("AIが保護者向け・保育者向けの資料と、園の一覧を読んでいます…");
    try {
      const json = await aiSearch(q);
      const cited = new Set([...String(json.answer).matchAll(/資料\s*(\d+)/g)].map((m) => Number(m[1])));
      const srcs = (json.sources || []).filter((s) => cited.has(s.n));
      answerEl.hidden = false;
      answerEl.innerHTML = `<div class="bubble-a">${Hoiku.FACES.facility}<div class="body"></div></div>`;
      const body = $(".body", answerEl);
      body.textContent = json.answer;
      if (srcs.length) {
        const ul = document.createElement("ul");
        ul.className = "cite-list";
        ul.innerHTML = srcs.map((s) => `<li><b>資料${s.n}</b>　${s.url && /^https:\/\//.test(s.url)
          ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</li>`).join("");
        body.appendChild(ul);
      }
      show(json.groups || {}, q);
      setStatus("");
    } catch (e) {
      setStatus(e instanceof TypeError ? "AIにつながりませんでした。通信の状態を確かめて、もう一度ためしてください。" : e.message, true);
    } finally {
      go.disabled = false;
    }
  }
})();
