// =====================================================================
// 保育ナビ（仮）の設定（ここだけ書きかえます）
//
// Supabase の画面 →「Project Settings」→「API Keys」で確認できます。
// 便利サイトの config.js と同じ値でかまいません（同じプロジェクトを使うため）。
//   SUPABASE_URL ：Project URL（https://xxxx.supabase.co の形）
//   SUPABASE_KEY ：公開用の鍵（Publishable key か anon public の鍵）
//
// ※ 公開用の鍵は、GitHub に上げても大丈夫です（データは RLS で守られています）。
// ※ Claude の API キー、service_role の鍵、巡回の合言葉は、ぜったいにここに書かないでください。
// =====================================================================
window.HOIKU_CONFIG = {
  SUPABASE_URL: "https://mtctyeezzycwqoyfjdmd.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZUDkLIqizJXlLmHA7xw_Fw_QWBKy_vy"
};