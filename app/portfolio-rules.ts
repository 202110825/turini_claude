export type AssetKey = "domestic" | "overseas" | "bond" | "equityFund" | "cash" | "gold";
export type Allocation = Record<AssetKey, number>;
export type PortfolioType = "안정형" | "중립형" | "공격형";
export type PortfolioTendency = PortfolioType | "진단 전";
export type TraitLevel = "낮음" | "보통" | "높음";
export type SignalKind = "structural" | "caution";
export type Horizon = "1년 미만" | "1~3년" | "3~10년" | "10년 이상";
export type Range = readonly [number, number];

export type AssetDefinition = {
  key: AssetKey;
  label: string;
  short: string;
  color: string;
  icon: string;
  sigma: number;
  help: string;
};

export type PortfolioSignal = {
  id: 1 | 2 | 3 | 4 | 5 | 6 | "R";
  kind: SignalKind;
  text: string;
};

export type FitResult = {
  value: number;
  label: string;
  direction: "inside" | "below" | "above";
  distance: number;
  range: Range;
};

export type TargetSnapshot = {
  allocation: Allocation;
  riskScore: number;
  riskGrade: number;
  riskGradeName: string;
  downside6m: number;
};

export type PortfolioResult = {
  riskScore: number;
  riskGrade: number;
  riskGradeName: string;
  riskLevel: number;
  downside6m: number;
  sigmaAsOf: string;
  fitType: number;
  fitTypeLabel: string;
  fitHorizon: number;
  fitHorizonLabel: string;
  typeRange: Range;
  horizonRange: Range;
  distanceToRange: { type: number; horizon: number };
  profile: PortfolioType;
  horizon: Horizon;
  nearTarget: TargetSnapshot;
  baseTarget: TargetSnapshot;
  nearTargetAddedAsset: AssetKey | null;
  rebalancingActions: { asset: AssetKey; delta: number; action: "확대" | "축소" }[];
  residualItems: { asset: AssetKey; delta: number }[];
  characteristics: { growth: TraitLevel; defense: TraitLevel; liquidity: TraitLevel };
  signals: PortfolioSignal[];
  strengths: string[];
  cautions: string[];
  unlockTags: string[];
  coach: string;
};

export const PORTFOLIO_RULE_VERSION = "4.0.0-portfolio-v11";
export const SIGMA_AS_OF = "2026-09-18";

export const ASSETS: AssetDefinition[] = [
  {
    key: "domestic", label: "국내주식", short: "국내", color: "#58cc02", icon: "KR", sigma: 33.69,
    help: "국내 거래소에 상장된 개별기업 주식의 합계입니다. 국내 주식형 ETF·펀드는 ‘주식형 ETF·펀드’에 입력해 주세요.",
  },
  {
    key: "overseas", label: "해외주식", short: "해외", color: "#1cb0f6", icon: "GL", sigma: 22.41,
    help: "해외 거래소에 상장된 개별기업 주식의 합계입니다. 해외 주식형 ETF·펀드는 별도 항목에 입력해 주세요.",
  },
  {
    key: "bond", label: "채권", short: "채권", color: "#9069e7", icon: "B", sigma: 1.69,
    help: "직접채권과 일반 채권 ETF·채권형 펀드를 합산합니다. 장기채·하이일드·환노출 해외채권은 실제 위험도가 대표값보다 높을 수 있습니다.",
  },
  {
    key: "equityFund", label: "주식형 ETF·펀드", short: "주식형", color: "#ff9600", icon: "F", sigma: 15.03,
    help: "여러 주식에 투자하는 일반 주식형 ETF·펀드입니다. 지수형·액티브형과 섹터·테마형을 포함하되, 레버리지·인버스 상품은 제외합니다. 혼합형 펀드는 공시된 주식·채권 비중으로 나눠 입력해 주세요.",
  },
  {
    key: "cash", label: "현금성자산", short: "현금", color: "#2bb6a8", icon: "₩", sigma: 0.22,
    help: "현금, 예금, CMA·MMF 등 단기금융상품입니다. 상품마다 원금보장과 예금자보호 여부가 다릅니다.",
  },
  {
    key: "gold", label: "금", short: "금", color: "#ffc800", icon: "Au", sigma: 19.4,
    help: "금 현물과 금 가격을 추종하는 일반 ETF·펀드를 합산합니다. 금광기업 주식형과 레버리지·인버스 상품은 포함하지 않습니다.",
  },
];

export const ASSET_KEYS = ASSETS.map((asset) => asset.key) as AssetKey[];
const SIGMA_BY_ASSET = Object.fromEntries(ASSETS.map((asset) => [asset.key, asset.sigma])) as Record<AssetKey, number>;
const INDEX = Object.fromEntries(ASSET_KEYS.map((key, index) => [key, index])) as Record<AssetKey, number>;

/** 자산 순서: 국내주식, 해외주식, 채권, 주식형 ETF·펀드, 현금성자산, 금 */
const CORRELATION = [
  [1, .15, .16, .69, .04, .17],
  [.15, 1, -.03, .49, -.01, -.01],
  [.16, -.03, 1, .09, .53, .22],
  [.69, .49, .09, 1, .02, .12],
  [.04, -.01, .53, .02, 1, .15],
  [.17, -.01, .22, .12, .15, 1],
] as const;

export const COVARIANCE = ASSET_KEYS.map((left, row) => ASSET_KEYS.map((right, column) =>
  (SIGMA_BY_ASSET[left] / 100) * (SIGMA_BY_ASSET[right] / 100) * CORRELATION[row][column],
));

export const RISK_MIN = .22;
export const RISK_MAX = 33.69;
export const EMPTY_ALLOCATION: Allocation = { domestic: .125, overseas: .25, bond: .35, equityFund: .125, cash: .1, gold: .05 };

export const BASE_TARGETS: Record<PortfolioType, Allocation> = {
  안정형: { domestic: .05, overseas: .1, bond: .45, equityFund: .05, cash: .3, gold: .05 },
  중립형: { domestic: .125, overseas: .25, bond: .35, equityFund: .125, cash: .1, gold: .05 },
  공격형: { domestic: .175, overseas: .35, bond: .15, equityFund: .175, cash: .05, gold: .1 },
};

const SHORT_HORIZON_TARGET: Allocation = { domestic: 0, overseas: 0, bond: .5625, equityFund: 0, cash: .375, gold: .0625 };

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && !Number.isNaN(value);
}

function round(value: number, digits = 2) {
  const unit = 10 ** digits;
  return Math.round((value + Number.EPSILON) * unit) / unit;
}

export function normalizeAllocation(value: unknown): Allocation {
  const saved = value && typeof value === "object" ? value as Partial<Allocation> & { fund?: number } : {};
  const rawValues = ASSET_KEYS.map((key) => key === "equityFund" ? saved.equityFund ?? saved.fund : saved[key]);
  const usesLegacyPercent = rawValues.some((candidate) => finiteNumber(candidate) && (candidate as number) > 1);
  const numberOr = (candidate: unknown, fallback: number) => finiteNumber(candidate)
    ? Math.min(1, Math.max(0, (candidate as number) / (usesLegacyPercent ? 100 : 1)))
    : fallback;
  return {
    domestic: numberOr(saved.domestic, EMPTY_ALLOCATION.domestic),
    overseas: numberOr(saved.overseas, EMPTY_ALLOCATION.overseas),
    bond: numberOr(saved.bond, EMPTY_ALLOCATION.bond),
    equityFund: numberOr(saved.equityFund ?? saved.fund, EMPTY_ALLOCATION.equityFund),
    cash: numberOr(saved.cash, EMPTY_ALLOCATION.cash),
    gold: numberOr(saved.gold, EMPTY_ALLOCATION.gold),
  };
}

export function normalizeHorizon(value: unknown): Horizon {
  if (value === "1년 미만" || value === "1~3년" || value === "3~10년" || value === "10년 이상") return value;
  if (value === "3~5년") return "3~10년";
  if (value === "5년 이상") return "10년 이상";
  return "3~10년";
}

export function allocationTotal(allocation: Allocation) {
  return ASSET_KEYS.reduce((sum, key) => sum + allocation[key], 0);
}

export function validateAllocation(allocation: unknown): allocation is Allocation {
  if (!allocation || typeof allocation !== "object" || Array.isArray(allocation)) return false;
  const row = allocation as Record<string, unknown>;
  if (Object.keys(row).some((key) => !ASSET_KEYS.includes(key as AssetKey))) return false;
  if (!ASSET_KEYS.every((key) => finiteNumber(row[key]) && (row[key] as number) >= 0 && (row[key] as number) <= 1)) return false;
  return Math.abs(ASSET_KEYS.reduce((sum, key) => sum + (row[key] as number), 0) - 1) < 1e-9;
}

function rawRiskScore(allocation: Allocation) {
  let variance = 0;
  for (const left of ASSET_KEYS) {
    for (const right of ASSET_KEYS) {
      variance += allocation[left] * allocation[right] * COVARIANCE[INDEX[left]][INDEX[right]];
    }
  }
  return Math.sqrt(Math.max(0, variance)) * 100;
}

export function riskScoreFor(allocation: Allocation) {
  if (!validateAllocation(allocation)) throw new Error("자산 비중은 0.0~1.0의 유한한 숫자이며 합계가 1.0이어야 합니다.");
  return round(rawRiskScore(allocation));
}

export function riskGradeFor(sigma: number) {
  if (sigma <= .5) return { grade: 6, name: "매우낮은위험" };
  if (sigma <= 5) return { grade: 5, name: "낮은위험" };
  if (sigma <= 10) return { grade: 4, name: "보통위험" };
  if (sigma <= 15) return { grade: 3, name: "다소높은위험" };
  if (sigma <= 25) return { grade: 2, name: "높은위험" };
  return { grade: 1, name: "매우높은위험" };
}

export function targetFor(tendency: PortfolioTendency): Allocation {
  return { ...BASE_TARGETS[tendency === "진단 전" ? "중립형" : tendency] };
}

export const RISK_CENTERS: Record<PortfolioType, number> = {
  안정형: rawRiskScore(BASE_TARGETS.안정형),
  중립형: rawRiskScore(BASE_TARGETS.중립형),
  공격형: rawRiskScore(BASE_TARGETS.공격형),
};

const TYPE_EDGE_1 = (RISK_CENTERS.안정형 + RISK_CENTERS.중립형) / 2;
const TYPE_EDGE_2 = (RISK_CENTERS.중립형 + RISK_CENTERS.공격형) / 2;
export const TYPE_RANGES: Record<PortfolioType, Range> = {
  안정형: [RISK_MIN, TYPE_EDGE_1],
  중립형: [TYPE_EDGE_1, TYPE_EDGE_2],
  공격형: [TYPE_EDGE_2, 15.03],
};

export const HORIZON_CENTERS: Record<Horizon, number> = {
  "1년 미만": rawRiskScore(SHORT_HORIZON_TARGET),
  "1~3년": RISK_CENTERS.안정형,
  "3~10년": RISK_CENTERS.중립형,
  "10년 이상": RISK_CENTERS.공격형,
};
const HORIZON_EDGE_1 = (HORIZON_CENTERS["1년 미만"] + HORIZON_CENTERS["1~3년"]) / 2;
export const HORIZON_RANGES: Record<Horizon, Range> = {
  "1년 미만": [RISK_MIN, HORIZON_EDGE_1],
  "1~3년": [HORIZON_EDGE_1, TYPE_EDGE_1],
  "3~10년": [TYPE_EDGE_1, TYPE_EDGE_2],
  "10년 이상": [TYPE_EDGE_2, 15.03],
};

function distanceToRange(value: number, range: Range) {
  return value < range[0] ? range[0] - value : value > range[1] ? value - range[1] : 0;
}

function fitFor(value: number, range: Range, center: number, centers: readonly number[], subject: "성향" | "기간"): FitResult {
  const distance = distanceToRange(value, range);
  if (distance === 0) {
    return { value: 1, label: subject === "성향" ? "성향과 잘 맞아요" : "투자 기간에 알맞아요", direction: "inside", distance: 0, range };
  }
  const below = value < range[0];
  const position = centers.indexOf(center);
  const neighbor = below
    ? centers[Math.max(0, position - 1)] ?? centers[Math.min(centers.length - 1, position + 1)]
    : centers[Math.min(centers.length - 1, position + 1)] ?? centers[Math.max(0, position - 1)];
  const cell = Math.max(.01, Math.abs(center - neighbor));
  const fit = Math.max(0, 1 - distance / cell);
  const degree = fit >= .5 ? "조금" : "많이";
  const label = subject === "성향"
    ? `성향보다 ${degree} ${below ? "안정적이에요" : "공격적이에요"}`
    : `기간에 비해 위험이 ${degree} ${below ? "작아요" : "커요"}`;
  return { value: fit, label, direction: below ? "below" : "above", distance, range };
}

function trait(value: number, low: number, high: number): TraitLevel {
  return value < low ? "낮음" : value > high ? "높음" : "보통";
}

type AllocationMetrics = { growth: number; defense: number; cash: number };
function metrics(allocation: Allocation): AllocationMetrics {
  return {
    growth: allocation.domestic + allocation.overseas + allocation.equityFund,
    defense: allocation.bond + allocation.cash,
    cash: allocation.cash,
  };
}

function signalIds(allocation: Allocation) {
  const value = metrics(allocation);
  const ids: (1 | 2 | 3 | 4 | 5 | 6)[] = [];
  if (value.growth > .6) ids.push(1);
  if (value.growth < .35) ids.push(2);
  if (value.defense < .325) ids.push(3);
  if (value.defense > .6) ids.push(4);
  if (value.cash > .2) ids.push(5);
  if (value.cash < .075) ids.push(6);
  return ids;
}

const SIGNAL_METRIC: Record<1 | 2 | 3 | 4 | 5 | 6, [keyof AllocationMetrics, "up" | "down"]> = {
  1: ["growth", "up"], 2: ["growth", "down"], 3: ["defense", "down"],
  4: ["defense", "up"], 5: ["cash", "up"], 6: ["cash", "down"],
};

function signalKind(id: 1 | 2 | 3 | 4 | 5 | 6, current: Allocation, baseTarget: Allocation): SignalKind {
  if (!signalIds(baseTarget).includes(id)) return "caution";
  const [metric, direction] = SIGNAL_METRIC[id];
  const currentValue = metrics(current)[metric];
  const targetValue = metrics(baseTarget)[metric];
  const moreExtreme = direction === "up" ? currentValue > targetValue + 1e-9 : currentValue < targetValue - 1e-9;
  return moreExtreme ? "caution" : "structural";
}

function snapshot(allocation: Allocation): TargetSnapshot {
  const raw = rawRiskScore(allocation);
  const grade = riskGradeFor(raw);
  return { allocation, riskScore: round(raw), riskGrade: grade.grade, riskGradeName: grade.name, downside6m: round(-1.645 * raw * Math.sqrt(.5), 1) };
}

function targetSearchRange(typeRange: Range, horizonRange: Range): Range {
  const intersection: Range = [Math.max(typeRange[0], horizonRange[0]), Math.min(typeRange[1], horizonRange[1])];
  return intersection[0] <= intersection[1] ? intersection : typeRange;
}

function innerRange(range: Range): Range {
  const margin = (range[1] - range[0]) * .1;
  return [range[0] + margin, range[1] - margin];
}

function enumerateGrid(keys: AssetKey[], requirePositive: AssetKey | null, visit: (candidate: Allocation) => void) {
  const units = 20;
  const values = Object.fromEntries(ASSET_KEYS.map((key) => [key, 0])) as Allocation;
  const walk = (position: number, remaining: number) => {
    if (position === keys.length - 1) {
      const key = keys[position];
      if (requirePositive === key && remaining === 0) return;
      values[key] = remaining / units;
      visit({ ...values });
      values[key] = 0;
      return;
    }
    const key = keys[position];
    const minimum = requirePositive === key ? 1 : 0;
    for (let value = minimum; value <= remaining; value += 1) {
      values[key] = value / units;
      walk(position + 1, remaining - value);
    }
    values[key] = 0;
  };
  walk(0, units);
}

function nearestTarget(current: Allocation, desiredRange: Range, profileCenter: number, fallback: Allocation) {
  if (distanceToRange(rawRiskScore(current), desiredRange) === 0) return { allocation: { ...current }, added: null as AssetKey | null };
  const held = ASSET_KEYS.filter((key) => current[key] > 0);
  const additions: (AssetKey | null)[] = [null, "cash", "bond", "equityFund"];
  for (const range of [innerRange(desiredRange), desiredRange]) {
    for (const addition of additions) {
      if (addition && held.includes(addition)) continue;
      const keys = addition ? [...held, addition] : held;
      if (!keys.length) continue;
      let best: { allocation: Allocation; l1: number; centerGap: number } | null = null;
      enumerateGrid(keys, addition, (candidate) => {
        const sigma = rawRiskScore(candidate);
        if (sigma < range[0] - 1e-9 || sigma > range[1] + 1e-9) return;
        const l1 = ASSET_KEYS.reduce((sum, key) => sum + Math.abs(candidate[key] - current[key]), 0);
        const centerGap = Math.abs(sigma - profileCenter);
        if (!best || l1 < best.l1 - 1e-9 || (Math.abs(l1 - best.l1) < 1e-9 && centerGap < best.centerGap)) best = { allocation: candidate, l1, centerGap };
      });
      if (best) return { allocation: (best as { allocation: Allocation }).allocation, added: addition };
    }
  }
  return { allocation: { ...fallback }, added: null as AssetKey | null };
}

const UNLOCK_TAGS: Partial<Record<AssetKey, string[]>> = {
  bond: ["채권의 개념"],
  equityFund: ["ETF의 개념", "인덱스 ETF 분산효과"],
  gold: ["자산군별 장기 수익"],
  domestic: ["주식의 개념"],
  overseas: ["자산군별 장기 수익"],
};

export function analyzeAllocation(current: Allocation, tendency: PortfolioTendency, horizonValue: string): PortfolioResult {
  if (!validateAllocation(current)) throw new Error("자산 비중은 0.0~1.0의 유한한 숫자이며 합계가 1.0이어야 합니다.");
  const profile: PortfolioType = tendency === "진단 전" ? "중립형" : tendency;
  const horizon = normalizeHorizon(horizonValue);
  const riskRaw = rawRiskScore(current);
  const risk = riskGradeFor(riskRaw);
  const typeRange = TYPE_RANGES[profile];
  const horizonRange = HORIZON_RANGES[horizon];
  const typeFit = fitFor(riskRaw, typeRange, RISK_CENTERS[profile], Object.values(RISK_CENTERS), "성향");
  const horizonFit = fitFor(riskRaw, horizonRange, HORIZON_CENTERS[horizon], Object.values(HORIZON_CENTERS), "기간");
  const baseAllocation = targetFor(profile);
  const nearest = nearestTarget(current, targetSearchRange(typeRange, horizonRange), RISK_CENTERS[profile], baseAllocation);
  const nearTarget = snapshot(nearest.allocation);
  const baseTarget = snapshot(baseAllocation);

  const allDeltas = ASSET_KEYS.map((asset) => ({ asset, delta: round((nearest.allocation[asset] - current[asset]) * 100, 1) }));
  const sortDelta = (left: { asset: AssetKey; delta: number }, right: { asset: AssetKey; delta: number }) =>
    Math.abs(right.delta) - Math.abs(left.delta) || SIGMA_BY_ASSET[right.asset] - SIGMA_BY_ASSET[left.asset];
  const rebalancingActions = allDeltas.filter((item) => Math.abs(item.delta) >= 5 - 1e-9).sort(sortDelta)
    .map((item) => ({ ...item, action: (item.delta > 0 ? "확대" : "축소") as "확대" | "축소" }));
  const residualItems = allDeltas.filter((item) => Math.abs(item.delta) >= .5 && Math.abs(item.delta) < 5).sort(sortDelta);

  const signalText: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: "성장자산 비중이 높아 성장성과 변동성이 모두 높은 구조예요.",
    2: "성장자산 비중이 낮아 장기 성장성이 제한될 수 있어요.",
    3: "방어자산(채권+현금성자산) 비중이 낮아요.",
    4: "방어자산 비중이 높아 하락장 방어력은 좋지만 성장성이 제한될 수 있어요.",
    5: "현금성자산 비중이 높아 유동성은 좋지만 성장성이 제한될 수 있어요.",
    6: "현금성자산 비중이 낮아 갑작스러운 자금 필요에 대응하기 어려울 수 있어요.",
  };
  const signals: PortfolioSignal[] = signalIds(current).map((id) => ({ id, kind: signalKind(id, current, baseAllocation), text: signalText[id] }));
  const allowedGradeMinimum: Record<PortfolioType, number> = { 안정형: 5, 중립형: 4, 공격형: 1 };
  if (risk.grade < allowedGradeMinimum[profile]) {
    const gradeText = profile === "안정형" ? "5~6등급" : "4~6등급";
    signals.push({ id: "R", kind: "caution", text: `이 위험등급은 ${profile} 투자자에게 권유 가능한 참고 범위(${gradeText}) 밖이에요.` });
  }

  const strengths: string[] = [];
  if (typeFit.direction === "inside") strengths.push(`연환산 변동성 ${round(riskRaw)}%가 ${profile} 권장 범위 ${round(typeRange[0])}~${round(typeRange[1])}% 안에 있어 성향과 잘 맞아요.`);
  if (horizonFit.direction === "inside") strengths.push(`연환산 변동성 ${round(riskRaw)}%가 ${horizon} 권장 범위 ${round(horizonRange[0])}~${round(horizonRange[1])}% 안에 있어 투자 기간에 알맞아요.`);
  const cautions = [
    ...(typeFit.direction === "inside" ? [] : [typeFit.label]),
    ...(horizonFit.direction === "inside" ? [] : [horizonFit.label]),
    ...signals.filter((signal) => signal.kind === "caution").map((signal) => signal.text),
  ];

  const newlyUsed = ASSET_KEYS.filter((key) => current[key] === 0 && (nearest.allocation[key] > 0 || baseAllocation[key] > 0));
  const unlockTags = [...new Set(newlyUsed.flatMap((key) => UNLOCK_TAGS[key] ?? []))].slice(0, 3);
  const currentMetrics = metrics(current);
  const mainAction = rebalancingActions[0];
  const actionAsset = mainAction ? ASSETS.find((asset) => asset.key === mainAction.asset) : null;
  const coach = mainAction && actionAsset
    ? `${actionAsset.label} 비중을 ${Math.abs(mainAction.delta)}%p ${mainAction.action === "확대" ? "늘리는" : "줄이는"} 방향부터 살펴보세요.`
    : "현재 배분이 성향과 기간의 목표 범위 안에 있어 그대로 유지해도 괜찮아요.";

  return {
    riskScore: round(riskRaw), riskGrade: risk.grade, riskGradeName: risk.name,
    riskLevel: round(Math.min(1, riskRaw / RISK_MAX), 3), downside6m: round(-1.645 * riskRaw * Math.sqrt(.5), 1), sigmaAsOf: SIGMA_AS_OF,
    fitType: round(typeFit.value, 3), fitTypeLabel: typeFit.label,
    fitHorizon: round(horizonFit.value, 3), fitHorizonLabel: horizonFit.label,
    typeRange, horizonRange,
    distanceToRange: { type: round(typeFit.distance), horizon: round(horizonFit.distance) },
    profile, horizon, nearTarget, baseTarget, nearTargetAddedAsset: nearest.added,
    rebalancingActions, residualItems,
    characteristics: { growth: trait(currentMetrics.growth, .35, .6), defense: trait(currentMetrics.defense, .325, .6), liquidity: trait(currentMetrics.cash, .075, .2) },
    signals, strengths, cautions, unlockTags, coach,
  };
}
