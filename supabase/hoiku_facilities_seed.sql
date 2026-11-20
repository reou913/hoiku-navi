-- =====================================================================
-- 市内の園（hoiku_facilities）の最初のデータ（54件）
-- 出典：薩摩川内市の「保育施設等一覧」「私立幼稚園・認定こども園（1号認定）」
--       「企業主導型保育事業所・認可外保育施設」のページ（令和9年4月の予定（令和8年11月1日現在））
-- hoiku_setup.sql のあとに、SQL Editor に貼り付けて「Run」。
-- 何回実行しても大丈夫です（同じ名前・種類の園は、市の情報の列だけ上書きします）。
-- 費用・1号の募集人数・写真は、園に確かめてから Table Editor で入れます。
-- =====================================================================
insert into public.hoiku_facilities
  (name, type, area, address, phone, website, capacity, kyoiku_capacity,
   hours_standard, hours_short, open_hours, note, info_as_of, source_url)
values
  ('せんだい幼稚園', '認定こども園', '川内', '平佐町3590番地2', '20-1280', 'http://www.s-kinder.com/', '60', '180', '7時～18時', '8時～16時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('青山幼稚園', '認定こども園', '川内', '青山町4194番地', '20-0775', 'http://ishihara.ed.jp/index.html', '60', '120', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('のぞみこども園', '認定こども園', '川内', '大小路町54番16号', '22-3744', '', '125', '35', '7時～18時', '8時～16時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('鹿児島純心大学附属純心幼稚園', '認定こども園', '川内', '隈之城町1001番地', '23-6168', 'http://www.k-junshin.ac.jp/kodomo/', '70', '110', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('川内すわこども園', '認定こども園', '川内', '御陵下町19番5号', '22-2764', 'http://www.sendaisuwa.com/', '165', '15', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('りぼんこども園', '認定こども園', '川内', '天辰町1866番地1', '24-8181', '', '70', '15', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('みくにキッズ保育園', '認定こども園', '川内', '御陵下町11番9号', '22-3974', '', '90', '15', '7時～18時', '7時～15時', '', '学校法人新田学園', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('高江こども園', '認定こども園', '川内', '高江町1875番地', '27-2225', '', '45', '10', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('川内すわこども園SECOND', '認定こども園', '川内', '中郷3丁目327番地1', '24-8400', '', '90', '35', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('さつま川内こども園', '認定こども園', '川内', '田崎町206番地1', '29-5101', '', '60', '15', '7時～18時', '8時～16時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('せいくんこども園', '認定こども園', '川内', '平佐町2843番地1', '20-1123', '', '45', '15', '7時～18時', '8時30分～16時30分', '', '系列園（認定こども園「青山幼稚園」）', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('愛こども園', '認定こども園', '川内', '天辰町74番地 AITOWN天辰集合住宅1階', '24-8811', '', '40', '15', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('水引こども園', '認定こども園', '川内', '水引町4795番地', '26-2124', '', '55', '5', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('せんだい中央こども園', '認定こども園', '川内', '平佐1丁目111番地', '23-5700', '', '25', '10', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('川内聖母幼稚園', '認定こども園', '川内', '若松町2番20号', '22-3877', '', '36', '24', '7時30分～18時30分', '8時30分～16時30分', '', '1歳児クラスからです（0歳児のお預かりはありません）', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('高城こども園', '認定こども園', '川内', '高城町1445番地', '30-2920', '', '50', '10', '7時～18時', '8時30分～16時30分', '', '令和9年4月から認定こども園として認可予定', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('すわこども園', '認定こども園', '樋脇', '樋脇町市比野550番地', '38-1193', 'http://www.suwa-kodomoen.com/', '80', '10', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('善福寺こども園', '認定こども園', '樋脇', '樋脇町塔之原1177番地', '37-2103', '', '30', '15', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('びぼあ', '認定こども園', '入来', '入来町副田6046番地25', '44-4381', '', '50', '15', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('入来こども園', '認定こども園', '入来', '入来町浦之名7517番地3', '44-2391', '', '30', '10', '7時～18時', '8時～16時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('若あゆこども園', '認定こども園', '東郷', '東郷町斧渕4490番地1', '42-1106', '', '80', '15', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('なかよしこども園', '認定こども園', '祁答院', '祁答院町藺牟田295番地1', '56-0033', '', '30', '10', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('川内隣保館保育園', '保育所', '川内', '白和町9番5号', '23-4798', '', '90', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('隈之城保育園', '保育所', '川内', '隈之城町1434番地', '22-3619', '', '90', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('永利保育園', '保育所', '川内', '百次町1069番地22', '22-5620', '', '90', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('清涼保育園', '保育所', '川内', '小倉町605番地3', '22-2461', '', '70', '', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('西風園', '保育所', '川内', '西方町2605番地1', '28-0049', '', '20', '', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('あさひ保育園', '保育所', '川内', '中村町7126番地2', '29-2714', '', '40', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('育英保育園', '保育所', '川内', '中郷四丁目187番地', '22-3467', 'http://www5.synapse.ne.jp/ikuei/', '120', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('平佐保育園', '保育所', '川内', '平佐町3879番地2', '23-2552', '', '100', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('青山保育園', '保育所', '川内', '青山町3586番地4', '25-3324', '', '90', '', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('清水丘保育園', '保育所', '川内', '宮里町3048番地9', '25-4522', 'http://kiyomizugaokahoikuen.net/', '80', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('勝目保育園', '保育所', '川内', '勝目町5315番地71', '20-2243', '', '90', '', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('共同保育所ひまわり園', '保育所', '川内', '中郷町5629番地', '25-1528', '', '70', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('さとのもり保育園', '保育所', '川内', '永利町4134番地1', '20-8151', '', '70', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('大村保育園', '保育所', '祁答院', '祁答院町下手3001番地2', '55-0126', '', '30', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('大王児園', '小規模保育', '川内', '大王町3番1号', '22-3857', '', '19', '', '7時～18時', '8時～16時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('チャイルドルーム・マミィ', '小規模保育', '川内', '原田町28番16号', '29-3288', '', '12', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('さくらんぼ保育園', '小規模保育', '川内', '中郷四丁目211番地', '22-0377', '', '19', '', '7時～18時', '8時30分～16時30分', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('中郷保育園', '小規模保育', '川内', '中郷四丁目28番地1', '20-7288', '', '12', '', '7時～18時', '8時30分～16時30分', '', '系列園（認定こども園「青山幼稚園」）', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('のびのびっこ保育園', '小規模保育', '川内', '中郷四丁目95番地', '22-8096', '', '19', '', '7時～18時', '9時～17時', '', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('ちゅうりっぷ園', '事業所内保育', '川内', '永利町4000番地2', '20-5770', '', '40', '', '7時～18時', '8時30分～16時30分', '', '定員は、従業員枠と地域枠の定員を合計したものです', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('みくに大樟保育園', '事業所内保育', '川内', '御陵下町11番9号', '22-3974', '', '19', '', '7時～18時', '7時～15時', '', '学校法人新田学園。定員は従業員枠と地域枠の合計。0歳児は従業員枠のみの受け入れ', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('里保育園', 'へき地保育所', '里', '里町里1900番地2', '09969-3-2145', '', '19', '', '', '', '8時～18時', '入退所の問い合わせは甑島振興局地域振興課（09969-2-0001）', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('下甑保育園', 'へき地保育所', '下甑', '下甑町青瀬382番地', '09969-5-1117', '', '19', '', '', '', '8時～18時', '入退所の問い合わせは甑島振興局地域振興課（09969-2-0001）', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/16678.html'),
  ('みくに幼稚園', '幼稚園', '川内', '御陵下町11番9号', '22-3974', '', '', '', '', '', '', '施設給付型私立幼稚園', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/kosodate_kyoiku/kosodate/4/6812.html'),
  ('なでしこ保育園（済生会病院内）', '企業主導型保育', '川内', '原田町2番26号', '26-1366', '', '40', '', '', '', '7時30分～18時30分', '地域枠：有り', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('すくすく保育園', '企業主導型保育', '川内', '勝目町5244番地1', '25-0323', '', '30', '', '', '', '7時～19時', '地域枠：有り', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('いつき保育園', '企業主導型保育', '川内', '東大小路町26番14号', '26-1717', '', '12', '', '', '', '7時30分～20時30分', '地域枠：有り', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('保育ルームゆう', '企業主導型保育', '川内', '平佐1丁目111番地', '23-6666', '', '12', '', '', '', '7時～19時', '地域枠：無し', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('おてんと保育園', '企業主導型保育', '川内', '神田町2番3号', '29-3625', '', '12', '', '', '', '7時～19時', '地域枠：有り', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('ナーサリールーム ohana', '企業主導型保育', '川内', '水引町3247番地1', '31-2000', '', '12', '', '', '', '7時～20時', '地域枠：有り', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('川内聖母幼稚園', '認可外保育施設', '川内', '若松町2番20号', '22-3877', '', '12（2歳児）', '', '', '', '8時40分～14時（預かり保育有り）', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html'),
  ('あゆみ園（高江記念病院）', '認可外保育施設', '川内', '横馬場町8番11号', '23-6000', '', '10', '', '', '', '7時45分～19時30分', '', '令和9年4月の予定（令和8年11月1日現在）', 'https://www.city.satsumasendai.lg.jp/soshiki/1026/1/1/3/2460.html')
on conflict (name, type) do update set
  area = excluded.area, address = excluded.address, phone = excluded.phone,
  capacity = excluded.capacity, kyoiku_capacity = excluded.kyoiku_capacity,
  hours_standard = excluded.hours_standard, hours_short = excluded.hours_short,
  open_hours = excluded.open_hours, info_as_of = excluded.info_as_of,
  source_url = excluded.source_url, updated_at = now(),
  website = case when public.hoiku_facilities.website = '' then excluded.website else public.hoiku_facilities.website end;

