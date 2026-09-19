import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { friendlyExplanation } from "../app/explanation-tone.ts";
import { retainLearningQuestionIds } from "../app/learning-progress.ts";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("진단 ID는 학습 문제 완료 수에서 제거한다", () => {
  const learningIds = new Set(["STK_B_001_MCQ", "BND_B_001_OX"]);
  assert.deepEqual(
    retainLearningQuestionIds(["DIAG_S1", "STK_B_001_MCQ", "STK_B_001_MCQ", "PROFILE_P1"], learningIds),
    ["STK_B_001_MCQ"],
  );
  assert.match(pageSource, /const ids = isDiagnosis \? \[\] : knowledgeQuestions/);
  assert.match(pageSource, /attempts: current\.attempts \+ \(isDiagnosis \? 0 : knowledgeQuestions\.length\)/);
});

test("진단 완료 화면에는 홈 버튼만 있고 추가 학습 버튼은 숨긴다", () => {
  assert.match(pageSource, /result\.mode !== "diagnosis" \? <button className="secondary-button"/);
});

test("해설은 존댓말 문장으로 표시한다", () => {
  assert.equal(friendlyExplanation("채권은 금융상품이다. 손실 가능성도 있다."), "채권은 금융상품입니다. 손실 가능성도 있습니다.");
  assert.match(pageSource, /friendlyExplanation\(question\.explanation\)/);
});

test("학습 탭은 난이도 바로가기로 잠금을 우회하지 않는다", () => {
  assert.doesNotMatch(pageSource, /className="difficulty-row"/);
  assert.doesNotMatch(pageSource, /startCategory\(/);
  assert.match(pageSource, /if \(!isDifficultyUnlocked\(difficulty, completed\)\) return/);
});

test("취약 태그는 홈 추천과 마이 화면에 명확히 표시된다", () => {
  assert.match(pageSource, /취약 개념 맞춤 추천/);
  assert.match(pageSource, /나의 취약 개념/);
  assert.match(pageSource, /weakTags: progress\.weakTags/);
});
