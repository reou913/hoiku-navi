// =====================================================================
// 保育者のページ：ログイン、園内資料の登録・削除、資料の一覧
// =====================================================================
(async function () {
  "use strict";
  const { $, db, ready } = Hoiku;
  const docsEl = $("#docs");

  Hoiku.setupAsk($("#ask"), "staff");
  if (!ready()) {
    Hoiku.showSetup($("#setup"));
    docsEl.innerHTML = "";
    $("#staff-area").hidden = true;
    return;
  }

  let isStaff = false;

  // ---------- 一覧 ----------
  async function loadDocs() {
    try {
      const docs = await Hoiku.fetchDocs();   // RLS により、保育者のときだけ園内資料も返ってくる
      Hoiku.renderDocList(docsEl, docs, { onDelete: isStaff ? removeDoc : null, q: new URLSearchParams(location.search).get("q") || "" });
    } catch (e) {
      console.error(e);
      docsEl.innerHTML = '<div class="empty">資料を読みこめませんでした。時間をおいて開き直してください。</div>';
    }
  }

  // ---------- ログイン ----------
  async function refresh() {
    const { data } = await db().auth.getSession();
    const session = data.session;
    isStaff = false;
    if (session && !session.user.is_anonymous) {
      const { data: ok } = await db().rpc("hoiku_is_staff");
      isStaff = ok === true;
      if (!isStaff) {
        $("#login-status").textContent = "このアカウントは、保育者の名簿に登録されていません。";
        $("#login-status").classList.add("error");
        await db().auth.signOut();
      }
    }
    $("#login-panel").hidden = isStaff;
    $("#staff-panel").hidden = !isStaff;
    await loadDocs();
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("#login-status");
    st.classList.remove("error");
    st.textContent = "確かめています…";
    const { error } = await db().auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#pw").value });
    if (error) {
      st.textContent = "メールアドレスかパスワードがちがいます。";
      st.classList.add("error");
      return;
    }
    st.textContent = "";
    $("#pw").value = "";
    await refresh();
  });

  $("#logout").addEventListener("click", async () => {
    await db().auth.signOut();
    await refresh();
  });

  // ---------- ファイルから文字を取り出す（ブラウザの中で行う） ----------
  const LIBS = {
    pdf: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    pdfWorker: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    pdfCMaps: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
    pdfFonts: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/",
    docx: "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js",
    xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  };
  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error("部品を読みこめませんでした。通信を確かめてください。"));
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }

  async function textFromFile(file, ext) {
    const buf = await file.arrayBuffer();
    if (ext === "pdf") {
      await loadScript(LIBS.pdf);
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
      // 日本語のPDFは、文字の対応表（CMap）がないと文字を取り出せないので、場所を教える
      const pdf = await window.pdfjsLib.getDocument({
        data: buf, cMapUrl: LIBS.pdfCMaps, cMapPacked: true, standardFontDataUrl: LIBS.pdfFonts,
      }).promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const content = await (await pdf.getPage(i)).getTextContent();
        // 行が変わるところ（hasEOL）で改行を入れる
        const text = content.items.map((it) => it.str + (it.hasEOL ? "\n" : "")).join("");
        pages.push(`[p.${i}]\n${text.trim()}`);
      }
      const chars = pages.join("").replace(/\[p\.\d+\]|\s/g, "").length;
      if (chars / Math.max(pdf.numPages, 1) < 20) {
        throw new Error("このPDFには文字が入っていないようです（スキャンしたPDF）。Googleドライブで文字にして、下の「文字を直接貼る」に貼ってください。");
      }
      return pages.join("\n");
    }
    if (ext === "docx") {
      await loadScript(LIBS.docx);
      const r = await window.mammoth.extractRawText({ arrayBuffer: buf });
      return r.value;
    }
    if (ext === "xlsx") {
      await loadScript(LIBS.xlsx);
      const wb = window.XLSX.read(buf, { type: "array" });
      return wb.SheetNames.map((n) =>
        `## シート：${n}\n` + window.XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " | ", blankrows: false })
      ).join("\n");
    }
    return new TextDecoder("utf-8").decode(buf);
  }

  // ---------- 登録 ----------
  const adminUrl = `${Hoiku.cfg.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/hoiku-admin`;

  async function callAdmin(payload) {
    const { data } = await db().auth.getSession();
    const res = await fetch(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: Hoiku.cfg.SUPABASE_KEY,
        Authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "登録の係（hoiku-admin）につながりませんでした。");
    return json;
  }

  $("#upload-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("#upload-status");
    const btn = $("#upload-btn");
    const file = $("#file").files[0];
    const title = $("#doc-title").value.trim();
    st.classList.remove("error");
    if (!file || !title) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const type = { pdf: "pdf", docx: "docx", xlsx: "xlsx", txt: "txt", md: "txt" }[ext];
    if (!type) { st.textContent = "PDF・Word（.docx）・Excel（.xlsx）・テキストだけ登録できます。"; st.classList.add("error"); return; }
    if (file.size > 20 * 1024 * 1024) { st.textContent = "20MBまでのファイルにしてください。"; st.classList.add("error"); return; }

    btn.disabled = true;
    let path = "";
    try {
      st.textContent = "文字を取り出しています…";
      const pasted = $("#paste").value.trim();
      const text = pasted || await textFromFile(file, ext);
      if (text.replace(/\s/g, "").length < 30) throw new Error("文字がほとんど取り出せませんでした。");

      st.textContent = "ファイルを保存しています…";
      // 日本語のファイル名は使わず、日時と乱数で名前を付ける（元の名前は「資料の名前」に残る）
      path = `docs/${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const up = await db().storage.from("hoiku-internal").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw new Error("ファイルを保存できませんでした：" + up.error.message);

      st.textContent = "しおりが索引カード（要約・見出し）を作っています…（30秒ほど）";
      const row = await callAdmin({ action: "add_internal", title, category: $("#doc-cat").value, file_path: path, file_type: type, text });
      st.textContent = row.status === "ok"
        ? "登録しました。下の一覧に出ています。"
        : "登録しましたが、索引カードは作れませんでした（本文での検索はできます）。";
      e.target.reset();
      await loadDocs();
    } catch (err) {
      console.error(err);
      st.textContent = err.message;
      st.classList.add("error");
    } finally {
      btn.disabled = false;
    }
  });

  async function removeDoc(id) {
    if (!confirm("この園内資料を消しますか？元のファイルも消えます。")) return;
    try {
      await callAdmin({ action: "delete_internal", id });
      await loadDocs();
    } catch (err) {
      alert(err.message);
    }
  }

  db().auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") { $("#login-panel").hidden = false; $("#staff-panel").hidden = true; } });
  await refresh();
})();
