// questions.js
// 防災対策診断の質問データ（記事の10問をベースに構成）

const QUESTIONS = [
  {
    id: "housing",
    title: "住居について教えてください",
    desc: "今お住まいの建物の種類を選んでください。",
    type: "single",
    options: [
      { value: "house", label: "🏠　戸建て" },
      { value: "apartment_low", label: "🏢　マンション・低層〜中層" },
      { value: "apartment_high", label: "🏢　マンション・高層（タワー含む）" },
      { value: "rental", label: "🔑　賃貸（アパート・マンション）" }
    ]
  },
  {
    id: "family",
    title: "家族の人数を教えてください",
    desc: "0の場合はそのままでOKです。大人が1人以上いれば次へ進めます",
    type: "counter",
    options: [
      { value: "adult",   label: "大人",          emoji: "🧑" },
      { value: "infant",  label: "乳幼児",         emoji: "👶" },
      { value: "child",   label: "小・中学生",     emoji: "🧒" },
      { value: "elderly", label: "高齢者（65歳以上）", emoji: "👴" },
      { value: "pet",     label: "ペット",         emoji: "🐾" }
    ]
  },
  {
    id: "daytime",
    title: "平日の日中、家にいるのは誰ですか？",
    desc: "災害は時間を選びません。日中の状況を把握しておくことが大切です。",
    type: "single",
    options: [
      { value: "all_out", label: "全員が外出している（仕事・学校）" },
      { value: "someone_home", label: "誰かが必ず家にいる" },
      { value: "varies", label: "日によって異なる" }
    ]
  },
  {
    id: "hazard_map",
    title: "ハザードマップで自宅の災害リスクを確認しましたか？",
    desc: '国土交通省の<a href="https://disaportal.gsi.go.jp/" target="_blank" rel="noopener" class="note-link">ハザードマップポータルサイト</a>から確認できます',
    note: true,
    type: "multi",
    options: [
      { value: "flood_confirmed",     label: "✅　確認済み（洪水・浸水リスクあり）" },
      { value: "landslide_confirmed", label: "✅　確認済み（土砂災害リスクあり）" },
      { value: "low_risk_confirmed",  label: "✅　確認済み（リスクは低い）" },
      { value: "not_checked",         label: "❌　確認したことがない" }
    ]
  },
  {
    id: "flood_risk",
    title: "洪水・浸水のリスクはありますか？",
    desc: "ハザードマップでの想定や、過去の浸水歴を踏まえて選んでください。",
    type: "single",
    options: [
      { value: "high", label: "リスクが高い地域（想定浸水深が深い）" },
      { value: "some", label: "多少リスクがある" },
      { value: "low", label: "リスクは低い・わからない" }
    ]
  },
  {
    id: "stock",
    title: "食べ物・飲み物の備蓄はどのくらいありますか？",
    desc: "1人1日あたり水3ℓが目安です。",
    type: "single",
    options: [
      { value: "stock_7days", label: "7日分以上ある" },
      { value: "stock_3days", label: "3日分程度ある" },
      { value: "stock_little", label: "少しだけある" },
      { value: "stock_none", label: "ほとんどない" }
    ]
  },
  {
    id: "go_bag",
    title: "非常持ち出し袋の準備はありますか？",
    desc: "家族全員分・中身の鮮度も含めて選んでください。",
    type: "single",
    options: [
      { value: "go_bag_full", label: "全員分あり、中身も最近見直した" },
      { value: "go_bag_old", label: "あるが数年前のまま" },
      { value: "go_bag_partial", label: "一部の家族分しかない" },
      { value: "go_bag_none", label: "用意していない" }
    ]
  },
  {
    id: "evacuation",
    title: "避難場所・避難経路を知っていますか？",
    desc: "指定避難所までの道のりを実際に歩いたことがあるかも考慮してください。",
    type: "single",
    options: [
      { value: "evac_walked", label: "知っていて、実際に歩いたこともある" },
      { value: "evac_known", label: "場所は知っているが歩いたことはない" },
      { value: "evac_unknown", label: "把握していない" }
    ]
  },
  {
    id: "contact",
    title: "災害時の家族の連絡方法は決めていますか？",
    desc: "安否確認の手段や集合場所の話し合いについて選んでください。",
    type: "single",
    options: [
      { value: "contact_set", label: "話し合って決めている" },
      { value: "contact_vague", label: "なんとなく共有している" },
      { value: "contact_none", label: "決めていない" }
    ]
  },
  {
    id: "car",
    title: "車の所有・避難への利用について教えてください",
    desc: "ガソリンの備えについても考慮してください。",
    type: "single",
    options: [
      { value: "car_ready", label: "車があり、ガソリンも半分以下にしない習慣がある" },
      { value: "car_unready", label: "車はあるが備えは特にない" },
      { value: "car_none", label: "車は所有していない" }
    ]
  }
];
