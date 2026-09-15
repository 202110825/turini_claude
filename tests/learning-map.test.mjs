import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MAX_CATEGORY_LEVEL,
  QUESTIONS_PER_CATEGORY_LEVEL,
  categoryDifficultyForLesson,
  categoryLevelForSolved,
  completedCategoryLessonsForSolved,
} from "../app/category-progress.ts";

const mapSource = await readFile(new URL("../app/learning-map.tsx", import.meta.url), "utf8");
const mapStyle = await readFile(new URL("../app/learning-map.css", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("지도는 12단계 레벨 규칙을 바깥에서 그대로 받아 쓴다", () => {
  assert.equal(MAX_CATEGORY_LEVEL, 12);
  assert.equal(QUESTIONS_PER_CATEGORY_LEVEL, 10);
  assert.match(pageSource, /totalLessons=\{MAX_CATEGORY_LEVEL\}/);
  assert.match(pageSource, /questionsPerLesson=\{QUESTIONS_PER_CATEGORY_LEVEL\}/);
  assert.match(pageSource, /completedLessons=\{activeCategoryCompletedLessons\}/);
  assert.match(pageSource, /currentLesson=\{activeCategoryCurrentLesson\}/);
  assert.match(pageSource, /solvedQuestions=\{activeCategorySolved\}/);
});

test("지도는 레벨·완료 계산을 다시 구현하지 않는다", () => {
  // 진도 계산 함수는 category-progress.ts 것만 쓰고, 지도 안에서 다시 만들지 않습니다.
  assert.doesNotMatch(mapSource, /function\s+(categoryLevelForSolved|completedCategoryLessonsForSolved|categoryLessonPool)/);
  assert.match(mapSource, /from "\.\/category-progress"/);
  assert.match(mapSource, /categoryDifficultyForLesson/);
  // 완료·현재·잠금 판정식은 기존 page.tsx 와 같은 형태를 유지합니다.
  assert.match(mapSource, /level <= completedLessons/);
  assert.match(pageSource, /activeCategoryCompletedLessons < MAX_CATEGORY_LEVEL \? activeCategoryCompletedLessons \+ 1 : null/);
  assert.match(mapSource, /const currentLevel = currentLesson;/);
});

test("문제 시작은 기존 startLesson 을 그대로 부른다", () => {
  assert.match(pageSource, /onStartLesson=\{\(lesson\) => startLesson\(activeCategory\.name, lesson\)\}/);
  assert.match(pageSource, /const startLesson = \(category: string, lesson: number\) => \{/);
  assert.match(pageSource, /categoryLessonPool\(questions, category, lesson\)/);
  assert.match(pageSource, /openSession\("lesson", `\$\{category\} 레벨 \$\{lesson\}`, lessonPool, QUESTIONS_PER_CATEGORY_LEVEL, lesson\)/);
});

test("화면에 적는 XP는 실제 지급 규칙과 같은 값을 쓴다", () => {
  assert.match(pageSource, /finished\.correct \* 10/);
  assert.match(mapSource, /XP_PER_CORRECT_ANSWER = 10/);
});

test("난이도 구간이 기존 난이도 경계와 맞는다", () => {
  const groups = { 초급: [], 중급: [], 고급: [] };
  for (let lesson = 1; lesson <= MAX_CATEGORY_LEVEL; lesson += 1) {
    groups[categoryDifficultyForLesson(lesson)].push(lesson);
  }
  assert.deepEqual(groups["초급"], [1, 2, 3, 4]);
  assert.deepEqual(groups["중급"], [5, 6, 7, 8]);
  assert.deepEqual(groups["고급"], [9, 10, 11, 12]);
  // 구간 점검 노드(4의 배수)는 난이도가 바뀌기 직전 레슨입니다.
  for (const boundary of [4, 8, 12]) {
    const next = boundary + 1;
    if (next > MAX_CATEGORY_LEVEL) continue;
    assert.notEqual(categoryDifficultyForLesson(boundary), categoryDifficultyForLesson(next));
  }
});

test("잠금 해제 조건은 실제 진도 계산과 어긋나지 않는다", () => {
  for (let solved = 0; solved <= 120; solved += 7) {
    const done = completedCategoryLessonsForSolved(solved);
    const nextLocked = done + 2;
    if (nextLocked > MAX_CATEGORY_LEVEL) continue;
    const needed = (nextLocked - 1) * QUESTIONS_PER_CATEGORY_LEVEL - solved;
    assert.ok(needed > 0, `solved=${solved} 에서 남은 문항이 0 이하가 되면 안 됩니다`);
    assert.equal(completedCategoryLessonsForSolved(solved + needed), nextLocked - 1);
    assert.ok(categoryLevelForSolved(solved) >= done);
  }
});

test("여섯 카테고리 모두 지도 배경과 색상이 정의돼 있다", () => {
  for (const theme of ["purple", "orange", "red", "teal", "blue"]) {
    assert.match(mapStyle, new RegExp(`\\.learn-screen\\[data-map-theme="${theme}"\\]`));
  }
  assert.match(mapStyle, /\.learn-screen \{[^}]*--map-accent/s);
  assert.match(pageSource, /data-map-theme=\{activeCategory\.color\}/);
});

test("완료·현재·잠금 노드가 서로 다르게 표시된다", () => {
  assert.match(mapStyle, /\[data-state="done"\]/);
  assert.match(mapStyle, /\[data-state="current"\]/);
  assert.match(mapStyle, /\[data-state="locked"\]/);
  assert.match(mapSource, /turini-map__star/);
  assert.match(mapSource, /turini-map__lock/);
});

test("현재 레슨 카드에 제목·문제 수·XP·시작 버튼이 모두 있다", () => {
  assert.match(mapSource, /문제<\/span>/);
  assert.match(mapSource, /\{questionsPerLesson\}문항/);
  assert.match(mapSource, /받을 XP<\/span>/);
  assert.match(mapSource, /최대 \{maxXp\}/);
  assert.match(mapSource, /시작하기/);
});

test("애니메이션을 줄이는 시스템 설정을 지원한다", () => {
  assert.match(mapStyle, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(mapSource, /prefers-reduced-motion: reduce/);
});

test("옛 번호 나열 경로는 더 이상 쓰지 않는다", () => {
  assert.doesNotMatch(pageSource, /className="learning-path"/);
  assert.doesNotMatch(pageSource, /path-node/);
  assert.match(pageSource, /<LearningMap/);
});
