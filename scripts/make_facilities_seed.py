"""便利帳で確かめた園の一覧（childcare.json）から、hoiku_facilities に入れるSQLを作る。
使い方: python3 scripts/make_facilities_seed.py （便利帳の）data/childcare.json > supabase/hoiku_facilities_seed.sql
"""
import json, sys

src = json.load(open(sys.argv[1], encoding="utf-8"))
# 地域子育て支援センターの一覧（市のページ）に載っていた園のHP
WEBSITES = {
    "育英保育園": "http://www5.synapse.ne.jp/ikuei/",
    "清水丘保育園": "http://kiyomizugaokahoikuen.net/",
    "鹿児島純心大学附属純心幼稚園": "http://www.k-junshin.ac.jp/kodomo/",
    "青山幼稚園": "http://ishihara.ed.jp/index.html",
    "せんだい幼稚園": "http://www.s-kinder.com/",
    "川内すわこども園": "http://www.sendaisuwa.com/",
    "すわこども園": "http://www.suwa-kodomoen.com/",
}
TYPE = {"認可保育所": "保育所", "へき地保育所（甑島）": "へき地保育所", "認可外保育": "認可外保育施設"}

def q(s):
    return "'" + str(s).replace("'", "''") + "'"

rows = []
for i in src["items"]:
    note = i.get("note", "")
    if i.get("regional_slot"):
        note = (note + "。" if note else "") + "地域枠：" + i["regional_slot"]
    vals = [i["name"], TYPE.get(i["type"], i["type"]), i["area"], i["address"], i["phone"],
            WEBSITES.get(i["name"], ""), i["capacity"], i["kyoiku_capacity"], i["hours_standard"],
            i["hours_short"], i["open_hours"], note, src["as_of"], i["source_url"]]
    rows.append("  (" + ", ".join(q(v) for v in vals) + ")")

print("""-- =====================================================================
-- 市内の園（hoiku_facilities）の最初のデータ（{n}件）
-- 出典：薩摩川内市の「保育施設等一覧」「私立幼稚園・認定こども園（1号認定）」
--       「企業主導型保育事業所・認可外保育施設」のページ（{as_of}）
-- hoiku_setup.sql のあとに、SQL Editor に貼り付けて「Run」。
-- 何回実行しても大丈夫です（同じ名前・種類の園は、市の情報の列だけ上書きします）。
-- 費用・1号の募集人数・写真は、園に確かめてから Table Editor で入れます。
-- =====================================================================
insert into public.hoiku_facilities
  (name, type, area, address, phone, website, capacity, kyoiku_capacity,
   hours_standard, hours_short, open_hours, note, info_as_of, source_url)
values
{rows}
on conflict (name, type) do update set
  area = excluded.area, address = excluded.address, phone = excluded.phone,
  capacity = excluded.capacity, kyoiku_capacity = excluded.kyoiku_capacity,
  hours_standard = excluded.hours_standard, hours_short = excluded.hours_short,
  open_hours = excluded.open_hours, info_as_of = excluded.info_as_of,
  source_url = excluded.source_url, updated_at = now(),
  website = case when public.hoiku_facilities.website = '' then excluded.website else public.hoiku_facilities.website end;
""".format(n=len(rows), as_of=src["as_of"], rows=",\n".join(rows)))
