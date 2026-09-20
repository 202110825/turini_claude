import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSETS,
  HORIZON_CENTERS,
  HORIZON_RANGES,
  PORTFOLIO_RULE_VERSION,
  RISK_CENTERS,
  TYPE_RANGES,
  allocationTotal,
  analyzeAllocation,
  normalizeAllocation,
  normalizeHorizon,
  riskGradeFor,
  riskScoreFor,
  targetFor,
  validateAllocation,
} from "../app/portfolio-rules.ts";

const almost = (actual, expected, tolerance = .02) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
};

test("v11 uses the documented six assets, KRW volatilities and classification help", () => {
  assert.deepEqual(ASSETS.map((asset) => asset.label), ["국내주식", "해외주식", "채권", "주식형 ETF·펀드", "현금성자산", "금"]);
  assert.deepEqual(ASSETS.map((asset) => asset.sigma), [33.69, 22.41, 1.69, 15.03, .22, 19.4]);
  assert.match(ASSETS.find((asset) => asset.key === "bond")?.help || "", /채권 ETF·채권형 펀드/);
  assert.match(ASSETS.find((asset) => asset.key === "equityFund")?.help || "", /레버리지·인버스 상품은 제외/);
  assert.match(ASSETS.find((asset) => asset.key === "gold")?.help || "", /금광기업 주식형.*포함하지/);
});

test("three profile targets and four horizon centers reproduce v11 reference values", () => {
  for (const profile of ["안정형", "중립형", "공격형"]) {
    const target = targetFor(profile);
    assert.ok(Math.abs(allocationTotal(target) - 1) < 1e-9);
    assert.equal(validateAllocation(target), true);
    const [low, high] = TYPE_RANGES[profile];
    const sigma = riskScoreFor(target);
    assert.ok(sigma >= low && sigma <= high);
  }
  almost(RISK_CENTERS.안정형, 3.998);
  almost(RISK_CENTERS.중립형, 9.221);
  almost(RISK_CENTERS.공격형, 12.964);
  almost(HORIZON_CENTERS["1년 미만"], 1.735);
  assert.equal(normalizeHorizon("3~5년"), "3~10년");
  assert.equal(normalizeHorizon("5년 이상"), "10년 이상");
});

test("risk grades follow the six documented volatility bands", () => {
  assert.deepEqual(riskGradeFor(.5), { grade: 6, name: "매우낮은위험" });
  assert.deepEqual(riskGradeFor(5), { grade: 5, name: "낮은위험" });
  assert.deepEqual(riskGradeFor(10), { grade: 4, name: "보통위험" });
  assert.deepEqual(riskGradeFor(15), { grade: 3, name: "다소높은위험" });
  assert.deepEqual(riskGradeFor(25), { grade: 2, name: "높은위험" });
  assert.deepEqual(riskGradeFor(25.01), { grade: 1, name: "매우높은위험" });
  almost(riskScoreFor({ domestic: 0, overseas: 0, bond: 0, equityFund: 0, cash: 1, gold: 0 }), .22, .001);
  almost(riskScoreFor({ domestic: 1, overseas: 0, bond: 0, equityFund: 0, cash: 0, gold: 0 }), 33.69, .001);
});

test("invalid, non-finite and non-normalized allocations cannot be analyzed", () => {
  assert.equal(validateAllocation({ domestic: 0, overseas: 1.005, bond: 0, equityFund: 0, cash: 0, gold: 0 }), false);
  assert.equal(validateAllocation({ domestic: .19, overseas: .2, bond: .2, equityFund: .2, cash: .1, gold: .1 }), false);
  assert.equal(validateAllocation({ domestic: 0, overseas: 0, bond: 0, equityFund: 0, cash: true, gold: 0 }), false);
  assert.equal(validateAllocation({ domestic: 0, overseas: 0, bond: 0, equityFund: 0, cash: Number.NaN, gold: 0 }), false);
  assert.throws(() => riskScoreFor({ domestic: 0, overseas: 1.005, bond: 0, equityFund: 0, cash: 0, gold: 0 }));
});

test("strengths appear only for matched axes and always include numeric evidence", () => {
  const matched = analyzeAllocation(targetFor("중립형"), "중립형", "3~10년");
  assert.equal(matched.strengths.length, 2);
  assert.match(matched.strengths[0], /연환산 변동성.*권장 범위.*성향과 잘 맞아요/);
  assert.match(matched.strengths[1], /연환산 변동성.*권장 범위.*투자 기간에 알맞아요/);
  const unmatched = analyzeAllocation({ domestic: 1, overseas: 0, bond: 0, equityFund: 0, cash: 0, gold: 0 }, "안정형", "1년 미만");
  assert.deepEqual(unmatched.strengths, []);
  assert.ok(unmatched.cautions.length >= 2);
});

test("nearest target remains a valid percentage-only recommendation", () => {
  const current = { domestic: .8, overseas: .2, bond: 0, equityFund: 0, cash: 0, gold: 0 };
  const result = analyzeAllocation(current, "안정형", "1~3년");
  assert.equal(validateAllocation(result.nearTarget.allocation), true);
  assert.ok(result.nearTarget.riskScore >= HORIZON_RANGES["1~3년"][0]);
  assert.ok(result.nearTarget.riskScore <= HORIZON_RANGES["1~3년"][1]);
  assert.ok([null, "cash", "bond", "equityFund"].includes(result.nearTargetAddedAsset));
  assert.ok(result.rebalancingActions.every((item) => Math.abs(item.delta) >= 5));
  assert.ok(result.rebalancingActions.every((item) => !/원|만원|억/.test(JSON.stringify(item))));
});

test("legacy allocation migrates and old analyses are invalidated", () => {
  const migrated = normalizeAllocation({ domestic: 10, overseas: 20, bond: 30, fund: 20, cash: 10, gold: 10 });
  assert.equal(migrated.equityFund, .2);
  assert.equal(allocationTotal(migrated), 1);
  assert.equal(PORTFOLIO_RULE_VERSION, "4.0.0-portfolio-v11");
});
