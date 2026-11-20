-- =====================================================================
-- 保育情報閲覧システム（仮名）：データベースの準備
-- Supabase の「SQL Editor」に全部貼り付けて「Run」を1回押します。
-- 何回実行しても大丈夫です。
-- 便利サイト・じんとりマップ・補助金サイトのテーブルや設定には触りません。
-- このシステムのものには、すべて hoiku_ を付けています。
-- （revoke があるので注意の画面が出ますが、データは消えません）
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 保育者の名簿（hoiku_staff）
--    ここに載っている人だけが「園内資料」を見たり登録したりできる。
--    ※ このプロジェクトは匿名ログインがオンなので、
--      「ログインしている」だけでは保育者として扱わない。名簿に載っているかで決める。
-- ---------------------------------------------------------------------
create table if not exists public.hoiku_staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.hoiku_staff is '保育情報システムの保育者名簿。れおさんが Table Editor か SQL で追加する';

-- 自分が名簿に載っているか（保育者か）を調べる関数
create or replace function public.hoiku_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.hoiku_staff where user_id = (select auth.uid())
  );
$$;

revoke all on function public.hoiku_is_staff() from public, anon;
grant execute on function public.hoiku_is_staff() to authenticated;


-- ---------------------------------------------------------------------
-- 2. 資料（hoiku_documents）
--    国・県・市の公開資料と、園内資料（手順書など）をまとめて入れる。
--    索引カード（要約・見出し・キーワード）と、元の本文（body）を持つ。
-- ---------------------------------------------------------------------
create table if not exists public.hoiku_documents (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  checked_at     timestamptz,                        -- 巡回で最後に確かめた日時

  title          text not null check (char_length(title) between 1 and 200),
  issuer_level   text not null check (issuer_level in ('国', '県', '市', '園')),
  issuer         text not null default '',           -- 例：こども家庭庁、薩摩川内市 子育て支援課
  audience       text not null check (audience in ('parent', 'staff', 'both')),
  visibility     text not null default 'public' check (visibility in ('public', 'internal')),
  category       text not null default 'その他',

  url            text,                               -- 元の資料のURL（公開資料）
  file_path      text,                               -- 園内資料のファイルの置き場所（Storage）
  file_type      text not null default 'pdf' check (file_type in ('pdf', 'html', 'docx', 'xlsx', 'txt')),
  source_updated text,                               -- 資料に書かれた更新日（分かれば）

  -- 索引カード（Claude が作る）
  summary        text not null default '',
  headings       jsonb not null default '[]'::jsonb, -- [{"title":"登園のめやす","page":45}]
  keywords       text[] not null default '{}',
  faq            text[] not null default '{}',

  -- 元の本文（[p.3] のようにページの印が入る）。画面からは読めない
  body           text not null default '',
  body_chars     integer not null default 0,
  content_hash   text not null default '',

  published      boolean not null default false,     -- れおさんが確かめたら true にする
  status         text not null default 'ok' check (status in ('ok', 'index_error')),

  -- 公開資料と園内資料で、必要なものがそろっているか
  constraint hoiku_documents_where check (
    (visibility = 'public'   and url is not null) or
    (visibility = 'internal' and file_path is not null)
  )
);

comment on table public.hoiku_documents is '保育情報システムの資料。published=true のものだけ画面に出る。body は Edge Function だけが読む';

create unique index if not exists hoiku_documents_url on public.hoiku_documents (url) where url is not null;
create index if not exists hoiku_documents_list on public.hoiku_documents (published, visibility, audience);


-- ---------------------------------------------------------------------
-- 3. 市内の施設（hoiku_facilities）：保育園・こども園・幼稚園・学童・発達支援
-- ---------------------------------------------------------------------
create table if not exists public.hoiku_facilities (
  id              bigint generated always as identity primary key,
  updated_at      timestamptz not null default now(),

  name            text not null,
  type            text not null,                     -- 認定こども園、保育所、小規模保育、幼稚園、認可外保育施設 など
  area            text not null default '',          -- 川内、樋脇、入来、東郷、祁答院、里、上甑、下甑、鹿島
  address         text not null default '',
  phone           text not null default '',
  website         text not null default '',

  capacity        text not null default '',          -- 2号・3号（保育）の定員
  kyoiku_capacity text not null default '',          -- 1号（教育）の定員
  hours_standard  text not null default '',          -- 保育標準時間
  hours_short     text not null default '',          -- 保育短時間
  open_hours      text not null default '',          -- 認可外などの開所時間

  school          text not null default '',          -- 小学校区（学童）
  operator        text not null default '',          -- 経営主体（学童・発達支援）
  target          text not null default '',          -- 対象（例：小学生、0〜6歳）
  hours_holiday   text not null default '',          -- 学校休業日の開所時間（学童）
  recruit_1go     text not null default '',          -- 1号認定の募集人数（分かれば）
  fees            jsonb not null default '[]'::jsonb,-- [{"item":"預かり保育","amount":"1日300円","note":""}]
  fees_note       text not null default '',
  photos          jsonb not null default '[]'::jsonb,-- [{"path":"園名/1.jpg","caption":"園庭","credit":"園の提供"}]
  note            text not null default '',

  info_as_of      text not null default '',          -- 情報の時点（例：令和8年11月1日現在）
  source_url      text not null default '',
  published       boolean not null default true,

  -- 同じ園が「認定こども園」と「認可外保育施設（2歳児クラス）」の両方に載ることがあるので、名前と種類の組で1行
  constraint hoiku_facilities_name_type unique (name, type)
);

-- あとから足した列（学童・発達支援のため）。すでに表がある場合も、この文で足される
alter table public.hoiku_facilities add column if not exists school        text not null default '';
alter table public.hoiku_facilities add column if not exists operator      text not null default '';
alter table public.hoiku_facilities add column if not exists target        text not null default '';
alter table public.hoiku_facilities add column if not exists hours_holiday text not null default '';

comment on table public.hoiku_facilities is '薩摩川内市内の園・学童・発達支援の施設。写真は園の許可を得たものだけを hoiku-photos に入れる';


-- ---------------------------------------------------------------------
-- 4. AIへの質問の記録（hoiku_questions）
--    質問・回答・日時・どちらのページか、だけ。IPアドレスなどは保存しない。
-- ---------------------------------------------------------------------
create table if not exists public.hoiku_questions (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  audience    text not null,                         -- parent=保護者ページ、staff=保育者ページ、all=トップの検索
  question    text not null check (char_length(question) between 1 and 300),
  answer      text,
  doc_ids     bigint[] not null default '{}',        -- 答えるときに読んだ資料
  status      text not null default 'ok' check (status in ('ok', 'error')),
  model       text
);

create index if not exists hoiku_questions_created_at on public.hoiku_questions (created_at);

-- どのページからの質問か（あとから「トップの検索（all）」を足したので、作り直す形にしている）
alter table public.hoiku_questions drop constraint if exists hoiku_questions_audience_check;
alter table public.hoiku_questions add constraint hoiku_questions_audience_check
  check (audience in ('parent', 'staff', 'all'));


-- ---------------------------------------------------------------------
-- 5. RLS（行ごとのルール）
-- ---------------------------------------------------------------------
alter table public.hoiku_staff      enable row level security;
alter table public.hoiku_documents  enable row level security;
alter table public.hoiku_facilities enable row level security;
alter table public.hoiku_questions  enable row level security;

-- 保育者名簿：自分の行だけ見られる（自分が保育者かを画面で確かめるため）
drop policy if exists "自分の名簿だけ見られる" on public.hoiku_staff;
create policy "自分の名簿だけ見られる"
  on public.hoiku_staff for select
  to authenticated
  using (user_id = (select auth.uid()));

-- 資料：公開してよい公開資料は、だれでも見られる
drop policy if exists "公開資料はだれでも見られる" on public.hoiku_documents;
create policy "公開資料はだれでも見られる"
  on public.hoiku_documents for select
  to anon, authenticated
  using (published and visibility = 'public');

-- 資料：園内資料は、名簿に載っている保育者だけ見られる
drop policy if exists "園内資料は保育者だけ見られる" on public.hoiku_documents;
create policy "園内資料は保育者だけ見られる"
  on public.hoiku_documents for select
  to authenticated
  using (published and visibility = 'internal' and (select public.hoiku_is_staff()));

-- 園：公開してよいものは、だれでも見られる
drop policy if exists "園の情報はだれでも見られる" on public.hoiku_facilities;
create policy "園の情報はだれでも見られる"
  on public.hoiku_facilities for select
  to anon, authenticated
  using (published);

-- 質問の記録：ルールを作らない → 画面からはだれも読めない・書けない


-- ---------------------------------------------------------------------
-- 6. 権限（GRANT）
--    書きこみは、画面からは一切させない。Edge Function（service_role）だけが書く。
--    資料の本文（body）は、画面からは読めないように、列を指定して許可する。
-- ---------------------------------------------------------------------
revoke all on public.hoiku_staff      from anon, authenticated;
revoke all on public.hoiku_documents  from anon, authenticated;
revoke all on public.hoiku_facilities from anon, authenticated;
revoke all on public.hoiku_questions  from anon, authenticated;

grant select on public.hoiku_staff to authenticated;

grant select (id, created_at, updated_at, checked_at, title, issuer_level, issuer, audience, visibility,
              category, url, file_path, file_type, source_updated, summary, headings, keywords, faq,
              body_chars, published)
  on public.hoiku_documents to anon, authenticated;

grant select on public.hoiku_facilities to anon, authenticated;

grant select, insert, update, delete on public.hoiku_staff, public.hoiku_documents,
  public.hoiku_facilities to service_role;
grant select, insert on public.hoiku_questions to service_role;


-- ---------------------------------------------------------------------
-- 7. ファイル置き場（Storage）
--    hoiku-internal：園内資料の元ファイル。非公開。保育者だけが入れる・見る
--    hoiku-photos  ：園の写真。公開。入れるのはれおさん（ダッシュボードから）だけ
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('hoiku-internal', 'hoiku-internal', false, 20971520)   -- 20MB まで
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('hoiku-photos', 'hoiku-photos', true, 5242880)         -- 5MB まで
on conflict (id) do nothing;

drop policy if exists "hoiku 園内資料を保育者が見る"   on storage.objects;
drop policy if exists "hoiku 園内資料を保育者が入れる" on storage.objects;

create policy "hoiku 園内資料を保育者が見る"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'hoiku-internal' and (select public.hoiku_is_staff()));

create policy "hoiku 園内資料を保育者が入れる"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hoiku-internal' and (select public.hoiku_is_staff()));

-- 消すときは Edge Function（service_role）が行うので、削除のルールは作らない。


-- ---------------------------------------------------------------------
-- 8. 保育者を名簿に追加するとき（例）
--    ① Authentication → Users →「Add user」→「Create new user」でメールとパスワードを作る
--       （「Auto Confirm User」にチェック）
--    ② その人の「User UID」をコピーして、下の文の '…' に入れて実行する
-- ---------------------------------------------------------------------
-- insert into public.hoiku_staff (user_id, name)
-- values ('ここに User UID', '見本こども園 れお');
