// logic.js
// 回答 -> 現状サマリー / 優先度付き対策リスト / 週末行動計画 を生成するルールベースエンジン

/**
 * 対策マスタ。各対策に id, title, detail, weekendLabel, baseWeight(基礎優先度) を持つ。
 * conditionで「この対策が必要かどうか」を判定し、scoreで優先度を加点する。
 */
const MEASURES = [
  {
    id: "stock_increase",
    title: "備蓄を7日分まで拡充する",
    detail: "目標は最低3日、できれば7日分。水は1人1日3ℓが目安です。レトルトや缶詰、家族の食べやすいものを優先して追加しましょう。",
    weekendLabel: "水と食料の備蓄を増やす（追加購入）",
    condition: (a) => ["stock_little", "stock_none", "stock_3days"].includes(a.stock),
    score: (a) => {
      if (a.stock === "stock_none") return 30;
      if (a.stock === "stock_little") return 24;
      if (a.stock === "stock_3days") return 14;
      return 0;
    }
  },
  {
    id: "go_bag_update",
    title: "非常持ち出し袋を点検・更新する",
    detail: "中身の賞味期限切れやサイズが合わないものを交換しましょう。子どもがいる場合は軽量・防寒着・お菓子・安心グッズも準備を。",
    weekendLabel: "非常持ち出し袋（大人用）を点検・中身を更新",
    condition: (a) => ["go_bag_old", "go_bag_partial", "go_bag_none"].includes(a.go_bag),
    score: (a) => {
      if (a.go_bag === "go_bag_none") return 26;
      if (a.go_bag === "go_bag_partial") return 20;
      if (a.go_bag === "go_bag_old") return 14;
      return 0;
    }
  },
  {
    id: "go_bag_child",
    title: "子ども用の非常持ち出し袋を用意する",
    detail: "軽量で持ちやすいもの、防寒着、お菓子、安心できるおもちゃなどを入れておきましょう。",
    weekendLabel: "子ども用の非常持ち出し袋を新しく準備",
    condition: (a) => ((a.family?.infant || 0) > 0 || (a.family?.child || 0) > 0) &&
                       ["go_bag_partial", "go_bag_none", "go_bag_old"].includes(a.go_bag),
    score: () => 18
  },
  {
    id: "flood_vertical",
    title: "洪水対策：垂直避難の準備をする",
    detail: "家の2階に最低限の備蓄を移動し、家族で「垂直避難」のシミュレーションをしておきましょう。",
    weekendLabel: "2階に最低限の備蓄を移動（垂直避難対策）",
    condition: (a) => a.hazard_map === "flood_confirmed",
    score: () => 26
  },
  {
    id: "flood_simulation",
    title: "洪水対策：家族で避難シミュレーション",
    detail: "洪水時はどのタイミングで車を使わない判断をするか、家族で話し合っておきましょう。",
    weekendLabel: "家族で垂直避難シミュレーション（洪水想定）",
    condition: (a) => a.hazard_map === "flood_confirmed",
    score: () => 18
  },
  {
    id: "landslide_prep",
    title: "土砂災害に備えた早期避難の準備をする",
    detail: "土砂災害は前兆が短く、早めの避難が命を守ります。大雨・警戒情報が出たら即座に避難できるよう、避難場所・ルート・タイミングを家族で確認しておきましょう。",
    weekendLabel: "土砂災害の避難タイミング・ルートを家族で確認",
    condition: (a) => a.hazard_map === "landslide_confirmed",
    score: () => 24
  },
  {
    id: "info_tools",
    title: "情報収集手段を確保する",
    detail: "手回しラジオ・モバイルバッテリーを準備し、自治体の防災アプリやSNSをすぐ確認できるよう設定しておきましょう。",
    weekendLabel: "情報収集手段を整える（手回しラジオ・モバイルバッテリー購入）",
    condition: () => true,
    score: (a) => (a.hazard_map === "not_checked" ? 10 : 6)
  },
  {
    id: "evac_route_check",
    title: "避難所までのルートを実際に確認する",
    detail: "地図上で知っているだけでなく、実際に歩いてルートと所要時間を確認しておくと安心です。",
    weekendLabel: "避難所までの徒歩ルートを家族で確認（実際に歩いてみる）",
    condition: (a) => ["evac_known", "evac_unknown"].includes(a.evacuation),
    score: (a) => a.evacuation === "evac_unknown" ? 22 : 10
  },
  {
    id: "school_route",
    title: "学校・園から自宅までの迎えルートを確保する",
    detail: "日中に子どもだけになる可能性がある場合、誰が・どのルートで迎えに行くか決めておきましょう。",
    weekendLabel: "学校〜自宅の迎えルートを確認",
    condition: (a) => (a.family?.child || 0) > 0 && a.daytime !== "someone_home",
    score: () => 16
  },
  {
    id: "contact_plan",
    title: "家族の安否確認・連絡方法を決める",
    detail: "災害時にすぐ連絡が取れない可能性を想定し、集合場所や連絡手段（災害用伝言板など）を話し合っておきましょう。",
    weekendLabel: "家族の連絡方法・集合場所を話し合う",
    condition: (a) => ["contact_vague", "contact_none"].includes(a.contact),
    score: (a) => a.contact === "contact_none" ? 24 : 12
  },
  {
    id: "car_decision",
    title: "車を使わない判断基準を決めておく",
    detail: "洪水時や道路寸断時に車を使わない判断ができるよう、家族で基準を話し合っておきましょう。ガソリンは半分を切る前に補充する習慣も大切です。",
    weekendLabel: "洪水時に「車を使わない判断」をする基準を話し合う",
    condition: (a) => a.car === "car_unready" && a.hazard_map === "flood_confirmed",
    score: () => 14
  },
  {
    id: "furniture_fix",
    title: "家具の固定・転倒防止対策をする",
    detail: "転倒防止金具やストッパーを設置しましょう。特に寝室・子ども部屋は優先して対応を。",
    weekendLabel: "家具の固定（転倒防止金具やストッパーを設置）",
    condition: () => true,
    score: (a) => a.housing === "house" ? 16 : 10
  },
  {
    id: "glass_film",
    title: "窓ガラスの飛散防止フィルムを貼る",
    detail: "地震の揺れでガラスが割れた際の被害を減らせます。寝室や子ども部屋の窓を優先しましょう。",
    weekendLabel: "窓ガラスの飛散防止フィルムを貼る",
    condition: () => true,
    score: () => 8
  },
  {
    id: "elderly_care",
    title: "高齢の家族の避難方法を具体化する",
    detail: "持病の薬・補助具・避難時の移動手段など、個別の配慮が必要な点を整理しておきましょう。",
    weekendLabel: "高齢の家族の避難方法・必要な薬や物資を確認",
    condition: (a) => (a.family?.elderly || 0) > 0,
    score: () => 20
  },
  {
    id: "pet_prep",
    title: "ペット用の備蓄・避難方法を準備する",
    detail: "ペット用の水・フード・キャリーバッグ、避難所でのペット可否を事前に確認しておきましょう。",
    weekendLabel: "ペット用の備蓄品・避難方法を確認",
    condition: (a) => (a.family?.pet || 0) > 0,
    score: () => 14
  },
  {
    id: "hazard_map_check",
    title: "ハザードマップを確認する",
    detail: "自治体のハザードマップで、地震の揺れやすさ・洪水の想定浸水深を確認しましょう。今後の対策の土台になります。",
    weekendLabel: "自治体のハザードマップを確認する",
    condition: (a) => a.hazard_map === "not_checked" || !a.hazard_map,
    score: (a) => a.hazard_map === "not_checked" ? 20 : 8
  }
];

/**
 * 診断本体。answers（id -> value or array）を受け取り、結果オブジェクトを返す。
 */
function computeScore(a) {
  let s = 0;
  if (a.stock === "stock_7days") s += 25;
  else if (a.stock === "stock_3days") s += 15;
  else if (a.stock === "stock_little") s += 5;

  if (a.go_bag === "go_bag_full") s += 20;
  else if (a.go_bag === "go_bag_old") s += 8;
  else if (a.go_bag === "go_bag_partial") s += 5;

  if (a.hazard_map && a.hazard_map !== "not_checked") s += 15;

  if (a.evacuation === "evac_walked") s += 20;
  else if (a.evacuation === "evac_known") s += 10;

  if (a.contact === "contact_set") s += 15;
  else if (a.contact === "contact_vague") s += 5;

  if (a.car === "car_ready" || a.car === "car_none") s += 5;
  else if (a.car === "car_unready") s += 2;

  return Math.min(100, s);
}

function diagnose(answers) {
  const applicable = MEASURES
    .filter(m => m.condition(answers))
    .map(m => ({ ...m, score: m.score(answers) }))
    .sort((a, b) => b.score - a.score);

  const summary = buildSummary(answers);
  const plan = buildWeekendPlan(applicable);
  const score = computeScore(answers);

  return { summary, measures: applicable, plan, score };
}

function buildSummary(a) {
  const housingLabels = {
    house: "戸建て", apartment_low: "マンション（低層〜中層）",
    apartment_high: "マンション（高層・タワー）", rental: "賃貸（アパート・マンション）"
  };
  const familyCountLabels = { adult: "大人", infant: "乳幼児", child: "小・中学生", elderly: "高齢者", pet: "ペット" };
  const daytimeLabels = {
    all_out: "全員外出（仕事・学校）", someone_home: "ほぼ全員在宅", varies: "日によって異なる"
  };
  const hazardLabels = {
    flood_confirmed: "確認済み（洪水・浸水リスクあり）",
    landslide_confirmed: "確認済み（土砂災害リスクあり）",
    low_risk_confirmed: "確認済み（リスクは低い）",
    not_checked: "未確認"
  };
  const stockLabels = {
    stock_7days: "7日分以上", stock_3days: "3日分程度",
    stock_little: "少量のみ", stock_none: "ほぼなし"
  };
  const goBagLabels = {
    go_bag_full: "全員分あり・定期的に確認済み", go_bag_old: "あるが数年前のまま",
    go_bag_partial: "一部の家族分のみ", go_bag_none: "未準備"
  };
  const evacLabels = {
    evac_walked: "知っていて家族と共有済み", evac_known: "場所は知っているが未共有",
    evac_unknown: "把握していない"
  };
  const contactLabels = {
    contact_set: "話し合い済み（完了）", contact_vague: "なんとなく共有している", contact_none: "決めていない"
  };
  const carLabels = {
    car_ready: "あり（ガソリン管理も済み）", car_unready: "あり（備えは不十分）", car_none: "所有していない"
  };

  return [
    { label: "住まい", value: housingLabels[a.housing] || "—" },
    { label: "家族構成", value: Object.entries(a.family || {}).filter(([,n]) => n > 0).map(([k,n]) => `${familyCountLabels[k] || k}${n}人`).join("、") || "—" },
    { label: "平日昼間", value: daytimeLabels[a.daytime] || "—" },
    { label: "ハザードマップ", value: hazardLabels[a.hazard_map] || "—" },
    { label: "備蓄状況", value: stockLabels[a.stock] || "—" },
    { label: "非常持ち出し袋", value: goBagLabels[a.go_bag] || "—" },
    { label: "避難場所", value: evacLabels[a.evacuation] || "—" },
    { label: "連絡方法", value: contactLabels[a.contact] || "—" },
    { label: "自家用車", value: carLabels[a.car] || "—" }
  ];
}

/**
 * 優先度順の対策リストから、週末ごとの行動計画を組み立てる（記事の形式に準拠：リスト表示）
 */
function buildWeekendPlan(measures) {
  return measures.map((m, idx) => ({
    order: idx + 1,
    id: m.id,
    label: m.weekendLabel,
    detail: m.detail
  }));
}
