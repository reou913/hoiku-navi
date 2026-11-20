// =====================================================================
// 園をさがす：一覧・絞り込み・スライドショー
// =====================================================================
(async function () {
  "use strict";
  const { $, esc, db, ready } = Hoiku;
  const listEl = $("#facs");

  if (!ready()) {
    Hoiku.showSetup($("#setup"));
    listEl.innerHTML = "";
    return;
  }

  let rows = [];
  try {
    const { data, error } = await db().from("hoiku_facilities").select("*").order("type").order("name");
    if (error) throw error;
    rows = data || [];
  } catch (e) {
    console.error(e);
    listEl.innerHTML = '<div class="empty">園の情報を読みこめませんでした。時間をおいて開き直してください。</div>';
    return;
  }

  // ---------- 絞り込み ----------
  const TYPE_ORDER = ["認定こども園", "保育所", "幼稚園", "小規模保育", "事業所内保育", "へき地保育所", "企業主導型保育", "認可外保育施設",
    "放課後児童クラブ", "児童発達支援", "放課後等デイサービス"];
  const AREA_ORDER = ["川内", "樋脇", "入来", "東郷", "祁答院", "里", "上甑", "下甑", "鹿島"];
  // 大きな分け方：保育園・こども園・幼稚園 ／ 学童 ／ 発達支援
  const GROUPS = [
    { key: "nursery", label: "保育園・こども園・幼稚園" },
    { key: "gakudo", label: "学童（放課後児童クラブ）" },
    { key: "hattatsu", label: "発達支援" },
  ];
  const groupOf = (r) => r.type === "放課後児童クラブ" ? "gakudo"
    : (r.type === "児童発達支援" || r.type === "放課後等デイサービス") ? "hattatsu" : "nursery";
  const params = new URLSearchParams(location.search);
  const state = { group: GROUPS.some((g) => g.key === params.get("g")) ? params.get("g") : "", type: "", area: "", school: "", q: "", only1go: false };
  const byOrder = (order) => (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99);

  // 絞り込みのボタンを作る（labels で表示名を変えられる）
  function chips(el, key, values, allLabel, labels = {}) {
    const cur = state[key];
    el.innerHTML = `<button class="chip" aria-pressed="${!cur}" data-v="">${allLabel}</button>` +
      values.map((v) => `<button class="chip" aria-pressed="${cur === v}" data-v="${esc(v)}">${esc(labels[v] || v)}</button>`).join("");
  }
  function onChip(el, key, after) {
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      el.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
      state[key] = b.dataset.v;
      if (after) after();
      draw();
    });
  }
  const groupsHere = GROUPS.filter((g) => rows.some((r) => groupOf(r) === g.key));
  chips($("#fac-group"), "group", groupsHere.map((g) => g.key), "すべての施設", Object.fromEntries(GROUPS.map((g) => [g.key, g.label])));
  // 大きな分け方を変えたら、その中の種類・小学校区のボタンを作り直す
  function rebuildSub() {
    const inGroup = rows.filter((r) => !state.group || groupOf(r) === state.group);
    state.type = ""; state.school = "";
    const types = [...new Set(inGroup.map((r) => r.type))].sort(byOrder(TYPE_ORDER));
    chips($("#fac-type"), "type", types, "すべての種類");
    $("#fac-type").hidden = types.length < 2;
    const schools = [...new Set(inGroup.filter((r) => r.school).map((r) => r.school))];
    chips($("#fac-school"), "school", schools, "すべての小学校区");
    $("#fac-school").hidden = state.group !== "gakudo";
    $("#fac-1go-row").hidden = state.group === "gakudo" || state.group === "hattatsu";
    if ($("#fac-1go-row").hidden) { state.only1go = false; $("#fac-1go").checked = false; }
    $("#money").hidden = state.group === "gakudo" || state.group === "hattatsu";
  }
  onChip($("#fac-group"), "group", rebuildSub);
  onChip($("#fac-type"), "type");
  onChip($("#fac-school"), "school");
  chips($("#fac-area"), "area", [...new Set(rows.map((r) => r.area))].sort(byOrder(AREA_ORDER)), "すべての地域");
  onChip($("#fac-area"), "area");
  rebuildSub();
  state.q = params.get("q") || "";
  // トップの検索の「すべて見る」から来たとき：検索で見つかった施設だけを出す
  state.ids = params.get("ids") ? new Set(params.get("ids").split(",").map(Number).filter(Boolean)) : null;
  if (state.ids) {
    const from = $("#fac-from");
    from.hidden = false;
    from.innerHTML = `トップの検索「${esc(params.get("from") || "")}」の結果だけを表示しています。<button type="button" class="btn ghost small">すべての施設を表示</button>`;
    from.querySelector("button").addEventListener("click", () => {
      state.ids = null; from.hidden = true;
      history.replaceState(null, "", "facilities.html");
      draw();
    });
    // 一覧は下のほうにあるので、検索の結果が見えるところまで動かす
    requestAnimationFrame(() => from.scrollIntoView({ block: "start" }));
  }
  $("#fac-q").value = state.q;
  $("#fac-q").addEventListener("input", (e) => { state.q = e.target.value; draw(); });
  $("#fac-1go").addEventListener("change", (e) => { state.only1go = e.target.checked; draw(); });

  const has1go = (r) => Boolean(r.kyoiku_capacity) || r.type === "幼稚園";

  // ---------- 小さな道具 ----------
  function tel(phone) {
    const p = String(phone || "").replace(/[^\d-]/g, "");
    if (!p) return "";
    return p.startsWith("0") ? p : `0996-${p}`;   // 市外局番がなければ 0996（川内）
  }
  const people = (v) => (v ? (/^\d+$/.test(v) ? `${v}人` : v) : "");
  function hue(name) {
    let h = 0;
    for (const c of name) h = (h * 31 + c.codePointAt(0)) % 360;
    return h;
  }
  // 写真がないときの仮の画像（園舎・園庭・教室）
  function placeholder(kind, name) {
    const h = hue(name);
    const sky = `hsl(${h} 70% 88%)`, wall = `hsl(${(h + 30) % 360} 60% 96%)`, roof = `hsl(${h} 55% 55%)`, ground = `hsl(${(h + 90) % 360} 45% 72%)`;
    if (kind === 0) {
      return `<svg viewBox="0 0 320 180" role="img" aria-label="園舎のイメージ（仮の画像）"><rect width="320" height="180" fill="${sky}"/>
        <circle cx="270" cy="38" r="18" fill="#FFD36B"/><rect y="140" width="320" height="40" fill="${ground}"/>
        <path d="M70 80 160 34l90 46z" fill="${roof}"/><rect x="82" y="80" width="156" height="62" fill="${wall}"/>
        <rect x="148" y="104" width="24" height="38" rx="4" fill="${roof}"/>
        ${[96, 120, 186, 210].map((x) => `<rect x="${x}" y="92" width="16" height="16" rx="3" fill="#9FD3EA"/>`).join("")}</svg>`;
    }
    if (kind === 1) {
      return `<svg viewBox="0 0 320 180" role="img" aria-label="園庭のイメージ（仮の画像）"><rect width="320" height="180" fill="${sky}"/>
        <rect y="118" width="320" height="62" fill="${ground}"/><circle cx="60" cy="96" r="30" fill="hsl(${(h + 100) % 360} 45% 55%)"/>
        <rect x="56" y="110" width="8" height="24" fill="#8A5A3A"/>
        <path d="M170 132V70h8v62M230 132V70h8v62M170 74h68" stroke="${roof}" stroke-width="5" fill="none"/>
        <path d="M200 78v30M206 78v30" stroke="#777" stroke-width="2"/><rect x="194" y="106" width="18" height="5" fill="${roof}"/>
        <path d="M110 132l26-40h10l-26 40z" fill="#F2A33A"/></svg>`;
    }
    return `<svg viewBox="0 0 320 180" role="img" aria-label="教室のイメージ（仮の画像）"><rect width="320" height="180" fill="${wall}"/>
      <rect y="132" width="320" height="48" fill="hsl(${(h + 30) % 360} 40% 80%)"/>
      <rect x="40" y="36" width="110" height="64" rx="6" fill="${sky}" stroke="${roof}" stroke-width="4"/>
      <path d="M95 36v64M40 68h110" stroke="${roof}" stroke-width="3"/>
      ${[0, 1, 2, 3, 4].map((i) => `<circle cx="${190 + i * 22}" cy="52" r="8" fill="hsl(${(h + i * 60) % 360} 70% 70%)"/>`).join("")}
      <path d="M178 52h112" stroke="#999" stroke-width="1.5"/>
      <rect x="180" y="104" width="90" height="10" rx="3" fill="${roof}"/><rect x="186" y="114" width="6" height="18" fill="${roof}"/><rect x="258" y="114" width="6" height="18" fill="${roof}"/></svg>`;
  }

  function slideshow(r) {
    const photos = Array.isArray(r.photos) ? r.photos.filter((p) => p && p.path) : [];
    const base = `${Hoiku.cfg.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/hoiku-photos/`;
    const slides = photos.length
      ? photos.map((p) => `<figure class="slide"><img loading="lazy" src="${esc(base + p.path.split("/").map(encodeURIComponent).join("/"))}" alt="${esc(p.caption || r.name)}">
          ${p.caption || p.credit ? `<figcaption>${esc([p.caption, p.credit && `写真：${p.credit}`].filter(Boolean).join("　"))}</figcaption>` : ""}</figure>`)
      : [0, 1, 2].map((k) => `<figure class="slide">${placeholder(k, r.name)}<figcaption>${(groupOf(r) === "nursery" ? ["園舎", "園庭", "教室"] : ["建物", "外あそび", "室内"])[k]}</figcaption></figure>`);
    return `<div class="slides" data-slides>
      <div class="slide-track" tabindex="0" aria-label="${esc(r.name)}の画像">${slides.join("")}</div>
      ${photos.length ? "" : `<span class="temp-label">仮の画像（写真は${groupOf(r) === "nursery" ? "園" : "施設"}の許可をもらってから）</span>`}
      ${slides.length > 1 ? `<button class="slide-btn prev" type="button" aria-label="前の画像">‹</button>
        <button class="slide-btn next" type="button" aria-label="次の画像">›</button>
        <div class="dots">${slides.map((_, i) => `<span class="${i ? "" : "on"}"></span>`).join("")}</div>` : ""}
    </div>`;
  }

  function card(r) {
    const phone = tel(r.phone);
    const g = groupOf(r);
    const fees = g !== "nursery"
      ? `<div class="fees"><b>利用料</b>${esc(r.fees_note || "施設に確かめてください。")}</div>`
      : Array.isArray(r.fees) && r.fees.length
      ? `<div class="fees"><b>費用（園の情報）</b>${r.fees.map((f) => `${esc(f.item)}：${esc(f.amount)}${f.note ? `（${esc(f.note)}）` : ""}`).join("<br>")}${r.fees_note ? `<br>${esc(r.fees_note)}` : ""}</div>`
      : `<div class="fees"><b>費用</b>給食費・預かり保育・延長保育・入園料などは、園に確かめてください。</div>`;
    const facts = g === "gakudo" ? [
      ["小学校区", r.school],
      ["定員", people(r.capacity)],
      ["開所時間", r.open_hours],
      ["学校が休みの日", r.hours_holiday],
      ["経営", r.operator],
    ].filter(([, v]) => v) : g === "hattatsu" ? [
      ["対象", r.target],
      ["定員", people(r.capacity)],
      ["開所時間", r.open_hours],
      ["経営", r.operator],
    ].filter(([, v]) => v) : [
      ["保育の定員", people(r.capacity)],
      ["1号（教育）の定員", people(r.kyoiku_capacity)],
      ["1号の募集人数", has1go(r) ? (r.recruit_1go || "園に確認") : ""],
      ["保育標準時間", r.hours_standard],
      ["保育短時間", r.hours_short],
      ["開所時間", r.open_hours],
    ].filter(([, v]) => v);
    const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("鹿児島県薩摩川内市" + r.address)}`;
    return `<article class="fac">
      ${slideshow(r)}
      <div class="fac-body">
        <h3><span class="type">${esc(r.type)}</span>${/休所中/.test(r.note) ? '<span class="closed">休所中</span>' : ""}${esc(r.name)}</h3>
        <p class="addr">${esc(r.area)}・${esc(r.address)}</p>
        <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        ${fees}
        ${r.note ? `<p class="asof">${esc(r.note)}</p>` : ""}
        <div class="fac-actions">
          ${phone ? `<a class="btn ghost small" href="tel:${esc(phone)}">電話 ${esc(phone)}</a>` : ""}
          <a class="btn ghost small" href="${esc(map)}" target="_blank" rel="noopener">地図</a>
          ${r.website && /^https?:\/\//.test(r.website) ? `<a class="btn ghost small" href="${esc(r.website)}" target="_blank" rel="noopener">HP</a>` : ""}
        </div>
        <p class="asof">情報の時点：${esc(r.info_as_of || "不明")}${r.source_url ? `　<a href="${esc(r.source_url)}" target="_blank" rel="noopener">出典（市の資料）</a>` : ""}</p>
      </div>
    </article>`;
  }

  function draw() {
    const q = state.q.normalize("NFKC").trim();
    const shown = rows.filter((r) =>
      (!state.ids || state.ids.has(r.id)) &&
      (!state.group || groupOf(r) === state.group) &&
      (!state.type || r.type === state.type) &&
      (!state.school || r.school === state.school) &&
      (!state.area || r.area === state.area) &&
      (!state.only1go || has1go(r)) &&
      (!q || `${r.name}${r.address}${r.area}${r.school}`.normalize("NFKC").includes(q))
    );
    $("#fac-count").textContent = `${shown.length}か所`;
    listEl.innerHTML = shown.length ? shown.map(card).join("") : '<div class="empty">当てはまる施設がありません。</div>';
  }

  // ---------- スライドショーの動き ----------
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".slide-btn");
    if (!btn) return;
    const track = btn.closest("[data-slides]").querySelector(".slide-track");
    const dir = btn.classList.contains("next") ? 1 : -1;
    const w = track.clientWidth;
    const max = track.scrollWidth - w;
    let left = track.scrollLeft + dir * w;
    if (left > max + 2) left = 0;            // 最後の次は最初へ
    if (left < -2) left = max;               // 最初の前は最後へ
    track.scrollTo({ left, behavior: "smooth" });
  });
  listEl.addEventListener("scroll", (e) => {
    const track = e.target;
    if (!track.classList || !track.classList.contains("slide-track")) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    track.parentElement.querySelectorAll(".dots span").forEach((d, k) => d.classList.toggle("on", k === i));
  }, true);

  draw();
})();
