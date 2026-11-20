# 保育ナビ（仮）の設定手順

保育情報閲覧システム（仮名）を公開するまでの手順です。上から順に進めます。
Supabase は**便利サイトと同じプロジェクト**を使います。このシステムのものには、すべて `hoiku` が付いています。

## ファイルの一覧

| ファイル | 置き場所 | 中身 |
| --- | --- | --- |
| `index.html` | GitHub | トップページ（まとめてさがす＋3つの入口） |
| `parent.html` | GitHub | 保護者向け（資料の一覧＋ひなたに質問） |
| `staff.html` | GitHub | 保育者向け（資料の一覧＋しおりに質問＋園内資料の登録） |
| `facilities.html` | GitHub | 施設をさがす（園54か所＋学童47か所、スライドショー） |
| `assets/` | GitHub | 見た目（app.css）と動き（app.js・search.js・staff.js・facilities.js） |
| `config.js` | GitHub | Supabase の URL と公開用の鍵（ここだけ書きかえる） |
| `sources.json` | GitHub | 巡回する資料の一覧 |
| `scripts/crawl.py` | GitHub | 巡回のプログラム |
| `.github/workflows/crawl.yml` | GitHub | 毎週月曜の朝6時に巡回する設定 |
| `supabase/hoiku_setup.sql` | SQL Editor に貼る | テーブル・RLS・権限・ファイル置き場 |
| `supabase/hoiku_facilities_seed.sql` | SQL Editor に貼る | 市内の54園（市の保育施設等一覧より） |
| `supabase/hoiku_gakudo_seed.sql` | SQL Editor に貼る | 放課後児童クラブ47か所（市の子育て応援ガイド p.49・50 より） |
| `data/gakudo.tsv` | GitHub | 学童の一覧の元データ（直したら `scripts/make_gakudo_seed.py` でSQLを作り直す） |
| `supabase/functions/hoiku-ask/index.ts` | Edge Function に貼る | AIの質問（ひなた・しおり） |
| `supabase/functions/hoiku-admin/index.ts` | Edge Function に貼る | 資料の登録と索引カードづくり |
| `samples/` | 手元で使う | 登録を試すための、架空の園の資料（Word・Excel・PDF・テキスト） |

## 1. データベースを作る（Supabase）

1. 「SQL Editor」で `supabase/hoiku_setup.sql` を全部貼り付けて「Run」
   - 「Potential issue detected」が出たら「Run query」（revoke が入っているため。ほかのデータは消えません）
2. 続けて `supabase/hoiku_facilities_seed.sql` を貼り付けて「Run」
3. 続けて `supabase/hoiku_gakudo_seed.sql` を貼り付けて「Run」（学童47か所）
4. 「Table Editor」に `hoiku_documents`、`hoiku_facilities`（101行）、`hoiku_questions`、`hoiku_staff` があれば成功
5. 「Storage」に `hoiku-internal`（非公開）と `hoiku-photos`（公開）があれば成功

## 2. 巡回の合言葉を決めて、Secrets に入れる

巡回（GitHub）が資料を登録するときに使う合言葉です。

1. 20文字以上の、ほかで使っていない文字列を作る（例：パスワード管理アプリの「パスワード生成」で32文字）
2. Supabase の「Edge Functions」→「Secrets」で、名前 `HOIKU_CRAWLER_TOKEN`、値に合言葉を入れて保存
3. `ANTHROPIC_API_KEY` は登録ずみなので、そのままでよい

## 3. Edge Function を2つ作る

補助金サイトのときと同じやり方です。**Deploy を押す前に名前を付けます**（あとから変えてもURLは変わりません）。

| 名前 | 貼るファイル |
| --- | --- |
| `hoiku-ask` | `supabase/functions/hoiku-ask/index.ts` |
| `hoiku-admin` | `supabase/functions/hoiku-admin/index.ts` |

1. 「Edge Functions」→「Deploy a new function」→「Via Editor」
2. 名前を入れ、最初のコードを全部消して、ファイルの中身を貼り付け →「Deploy function」
3. できた関数の「Details」で「Verify JWT（Enforce JWT verification）」を**オフ**にして保存（2つとも）
   - 守りは関数の中で行っています（合言葉、保育者の名簿、回数の上限、呼んでよいサイト）

## 4. config.js を書く

便利サイトの `config.js` と同じ値を入れます。

```js
window.HOIKU_CONFIG = {
  SUPABASE_URL: "https://（プロジェクトID）.supabase.co",
  SUPABASE_KEY: "sb_publishable_……"
};
```

## 5. GitHub に上げて公開する

1. 新しいリポジトリを作る（例：`hoiku-navi`）
2. ファイルを全部アップロードする
   - `.github` フォルダは、Mac だと見えないことがあります。補助金サイトのときと同じく、`github` という名前で上げてから、Codespaces で `git mv github .github` → commit → push
3. 「Settings」→「Pages」で、Branch を `main` にして保存
4. 「Settings」→「Secrets and variables」→「Actions」→「New repository secret」で2つ入れる

| 名前 | 値 |
| --- | --- |
| `HOIKU_ADMIN_URL` | `https://（プロジェクトID）.supabase.co/functions/v1/hoiku-admin` |
| `HOIKU_CRAWLER_TOKEN` | 2で決めた合言葉（Supabase と同じもの） |

## 6. はじめての巡回

1. GitHub の「Actions」→「保育の資料を巡回」→「Run workflow」
2. 数分で終わると、「Issues」に「保育の資料：確かめてください」ができる
3. Supabase の「Table Editor」→ `hoiku_documents` を開き、1行ずつ確かめる
   - `summary`（要約）、`headings`（見出し）、`audience`（保護者向け parent／保育者向け staff／両方 both）が正しいか
   - よければ `published` を `true` にする → 画面に出る
4. 次の巡回からは、新しい資料や中身が変わった資料だけが Issue に出ます

## 7. 保育者のアカウントを作る

1. 「Authentication」→「Users」→「Add user」→「Create new user」
   - メールとパスワードを入れ、「Auto Confirm User」にチェック
2. できたユーザーの「User UID」をコピー
3. 「SQL Editor」で次を実行（'…' を書きかえる）

```sql
insert into public.hoiku_staff (user_id, name)
values ('ここに User UID', '見本こども園 れお');
```

4. `staff.html` でログインし、`samples` フォルダの架空の資料を登録して試す

※ このプロジェクトは匿名ログインがオンですが、名簿（hoiku_staff）に載っていない人は、ログインしていても園内資料を見られません。

## 8. 確かめること

- [ ] トップの「まとめてさがす」で、「ことばでさがす」と「AIにまとめてもらう」の両方を試す
- [ ] `parent.html` で、ひなたが出典（資料1 など）を付けて答える
- [ ] `staff.html` でログインすると、園内資料が一覧に出て、しおりの答えにも使われる
- [ ] ログアウトすると、園内資料が消える
- [ ] `facilities.html` で101か所が出て、「学童」を選ぶと小学校区で絞り込める
- [ ] Anthropic Console の「Limits」で、月の使用額の上限を決めておく

## 使いすぎ対策と守り

| 対策 | 中身 |
| --- | --- |
| 質問の長さ | 300文字まで |
| 続けて送れない | 画面で20秒待つ |
| サイト全体の上限 | 1分に10回、1日（日本時間）に300回まで（`hoiku-ask` の上の「設定」で変えられる） |
| 呼んでよいサイト | ブラウザからは `https://reou913.github.io` のページだけ |
| 資料の本文 | 画面からは読めない（列ごとの権限）。AIの関数だけが読む |
| 園内資料 | 名簿に載った保育者だけが見る・登録する。ファイルは非公開の置き場 |
| 巡回 | 合言葉がないと登録できない。新しい資料は公開しないまま入る |

## トップの「まとめてさがす」

トップページの検索ボックス（マイク入力つき）で、保護者向けの資料・保育者向けの資料・市内の園を、いっしょに探します。

| さがし方 | しくみ | お金 |
| --- | --- | --- |
| ことばでさがす | 画面の中だけで、索引カード（タイトル・キーワード・見出し）と園の一覧から探す | かからない |
| AIにまとめてもらう | `hoiku-ask` に `audience: "all"` で聞く。答えの要点（案内役「保育ナビ」）と、3つの見出しに分けた結果が返る | Claude の分（質問1回と同じ） |

- トップの検索では、園内資料は使いません（ログインしていない人も使うため）
- 園は、地域名（樋脇など）や町名（平佐町など）、「1号」「幼稚園」「こども園」があれば、それでしぼりこみます。それ以外は、園の名前がはっきり重なるときだけ出します
- 結果の「保護者のページで見る」「園の情報を見る」を押すと、そのページで同じ資料・園にしぼった状態で開きます
- 記録（`hoiku_questions`）では、トップからの質問は `audience` が `all` になります

## AIが資料を探すしくみ

1. 質問を2文字ずつに区切り（「午睡で」→「午睡」「睡で」）、索引カード（タイトル・キーワード・見出し・よくある質問）とくらべて点数をつける
2. 多くの資料に出てくる組（「のと」など）は軽く、少ない資料にしか出ない組（「午睡」など）は重く数える
3. 点の高い資料を最大4つ選び、その本文の中から、質問に近いページを取り出す
4. 取り出したページと園の一覧だけを Claude に渡し、（資料1 p.12）のように出典を付けて答えさせる

資料が数百を超えて探しにくくなったら、「ベクトル検索（pgvector）」という方法に進めます。

## うまくいかないとき

| 症状 | 原因と直し方 |
| --- | --- |
| 「…につながりませんでした」 | 関数の名前がちがう、または Verify JWT がオン。「Edge Functions」の一覧で URL と設定を確かめる |
| 巡回が「合言葉がちがいます」で止まる | GitHub と Supabase の `HOIKU_CRAWLER_TOKEN` が同じか確かめる |
| 巡回で「文字の入っていないPDF」 | スキャンしたPDF。Googleドライブで文字にして、保育者ページの「文字を直接貼る」から登録 |
| 古い形式（.doc、.xls）が入らない | 読めない形式なので、巡回では飛ばしています |
| 公開にしたのにAIが使わない | `status` が `ok` か確かめる（`index_error` は次の巡回で作り直す） |
| 園内資料の登録で「索引カードは作れませんでした」 | 本文での検索はできます。Edge Function `hoiku-admin` の「Logs」で理由を見る |

## sources.json について

- `checked` が空のものは、URLをまだ確かめていない候補です。最初の巡回の Issue で、開けたかどうかを確かめてください
- `enabled: false` の2つ（保育所保育指針、事故防止ガイドライン）は、こども家庭庁のページで正しいURLを確かめてから `true` にします
- 「費用のきほん」（facilities.html）は、令和8年度の手引きの内容です。年度が変わったら書きかえます

## 学童・発達支援について

- 学童（放課後児童クラブ）は、市の子育て応援ガイド（令和8年9月のPDF）の表を読み取って入れています。No.15「青山児童クラブ」と No.24「児童クラブCocoact」は、資料に「休所中」とあるので、画面に「休所中」と出ます
- 学童の資料はスキャンしたPDFなので、巡回では読めません。新しい一覧が出たら `data/gakudo.tsv` を直して、SQLを作り直します
- 発達支援（児童発達支援・放課後等デイサービス）は、入れ物（種類・絞り込み・AIの探し方）だけ用意してあります。事業所の一覧が手に入ったら、学童と同じ形で足します
