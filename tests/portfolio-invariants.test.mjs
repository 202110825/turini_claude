import assert from "node:assert/strict";
import test from "node:test";

import {
  ASSETS,
  allocationTotal,
  analyzeAllocation,
  riskGradeFor,
  riskScoreFor,
  validateAllocation,
} from "../app/portfolio-rules.ts";

const PROFILES = ["안정형", "중립형", "공격형"];
const HORIZONS = ["1년 미만", "1~3년", "3~10년", "10년 이상"];

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomAllocation(random) {
  const values = Array.from({ length: 6 }, () => -Math.log(Math.max(random(), 1e-9)));
  const total = values.reduce((sum, value) => sum + value, 0);
  const normalized = values.map((value) => value / total);
  normalized[5] = 1 - normalized.slice(0, 5).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(ASSETS.map((asset, index) => [asset.key, normalized[index]]));
}

test("20,000 randomized portfolios preserve covariance-risk and grade invariants", () => {
  const random = randomGenerator(20260920);
  for (let index = 0; index < 20_000; index += 1) {
    const allocation = randomAllocation(random);
    assert.equal(validateAllocation(allocation), true);
    const sigma = riskScoreFor(allocation);
    assert.ok(sigma >= .22 - .01 && sigma <= 33.69 + .01);
    const weightedStandalone = ASSETS.reduce((sum, asset) => sum + allocation[asset.key] * asset.sigma, 0);
    assert.ok(sigma <= weightedStandalone + .02, `${sigma} > ${weightedStandalone}`);
    assert.ok(riskGradeFor(sigma).grade >= 1 && riskGradeFor(sigma).grade <= 6);
  }
  let previousGrade = 6;
  for (const sigma of [.22, .5, .51, 5, 5.01, 10, 10.01, 15, 15.01, 25, 25.01, 33.69]) {
    const grade = riskGradeFor(sigma).grade;
    assert.ok(grade <= previousGrade);
    previousGrade = grade;
  }
});

test("300 full analyses preserve fit, target, signal and action invariants", () => {
  const random = randomGenerator(20260921);
  for (let index = 0; index < 300; index += 1) {
    const allocation = randomAllocation(random);
    const result = analyzeAllocation(allocation, PROFILES[index % 3], HORIZONS[index % 4]);
    assert.ok(result.fitType >= 0 && result.fitType <= 1);
    assert.ok(result.fitHorizon >= 0 && result.fitHorizon <= 1);
    assert.ok(result.riskLevel >= 0 && result.riskLevel <= 1);
    assert.ok(Math.abs(allocationTotal(result.nearTarget.allocation) - 1) < 1e-9);
    assert.ok(Math.abs(allocationTotal(result.baseTarget.allocation) - 1) < 1e-9);
    assert.ok(result.strengths.length <= 2);
    assert.equal(new Set(result.cautions).size, result.cautions.length);
    assert.ok(result.rebalancingActions.every((item) => Math.abs(item.delta) >= 5));
    assert.ok(result.residualItems.every((item) => Math.abs(item.delta) >= .5 && Math.abs(item.delta) < 5));
    for (let action = 1; action < result.rebalancingActions.length; action += 1) {
      assert.ok(Math.abs(result.rebalancingActions[action - 1].delta) >= Math.abs(result.rebalancingActions[action].delta));
    }
  }
});
