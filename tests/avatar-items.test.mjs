import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AVATAR_ANCHORS,
  AVATAR_ITEMS,
  AVATAR_LAYOUT,
  AVATAR_SLOTS,
  DEFAULT_AVATAR,
  KEEP_CLEAR,
  avatarStatsFrom,
  findItem,
  isItemUnlocked,
  itemsForSlot,
  normalizeAvatar,
  requirementLabel,
  requirementProgress,
  slotRect,
} from "../app/avatar-items.ts";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const avatarSource = await readFile(new URL("../app/turini-avatar.tsx", import.meta.url), "utf8");

const emptyStats = avatarStatsFrom({ xp: 0, level: 1, streak: 0, solved: 0, categoryLessons: {} });
const fullStats = avatarStatsFrom({
  xp: 5000,
  level: 12,
  streak: 40,
  solved: 720,
  categoryLessons: {
    주식: 12,
    채권: 12,
    "펀드/ETF": 12,
    "위험 관리": 12,
    "분산 투자": 12,
    "수익률 계산": 12,
  },
});

test("여섯 가지 슬롯이 모두 있고 아이템이 한 슬롯에만 속한다", () => {
  assert.deepEqual(
    AVATAR_SLOTS.map((slot) => slot.key),
    ["hat", "glasses", "neck", "bag", "prop", "scene"],
  );
  for (const { key } of AVATAR_SLOTS) {
    assert.ok(itemsForSlot(key).length > 0, `${key} 슬롯에 아이템이 없습니다`);
  }
  const ids = AVATAR_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "아이템 id 가 중복됩니다");
  for (const item of AVATAR_ITEMS) {
    assert.ok(AVATAR_LAYOUT[item.slot], `${item.id} 의 슬롯 배치 규칙이 없습니다`);
  }
});

test("모든 슬롯에 처음부터 쓸 수 있는 아이템이 하나씩 있다", () => {
  for (const { key } of AVATAR_SLOTS) {
    const free = itemsForSlot(key).filter((item) => isItemUnlocked(item, emptyStats));
    assert.ok(free.length >= 1, `${key} 슬롯에 기본 해제 아이템이 없습니다`);
  }
});

test("해제 조건은 학습 기록에서만 계산한다", () => {
  const locked = AVATAR_ITEMS.filter((item) => !isItemUnlocked(item, emptyStats));
  assert.ok(locked.length > 0, "잠긴 아이템이 하나도 없습니다");
  for (const item of locked) {
    assert.ok(isItemUnlocked(item, fullStats), `${item.id} 은 끝까지 학습해도 열리지 않습니다`);
  }
  // XP 조건은 XP 가 늘어나면 정확히 그 값에서 열립니다.
  const xpItem = AVATAR_ITEMS.find((item) => item.requirement.kind === "xp");
  const need = xpItem.requirement.value;
  const just = avatarStatsFrom({ xp: need, level: 1, streak: 0, solved: 0, categoryLessons: {} });
  const short = avatarStatsFrom({ xp: need - 1, level: 1, streak: 0, solved: 0, categoryLessons: {} });
  assert.equal(isItemUnlocked(xpItem, just), true);
  assert.equal(isItemUnlocked(xpItem, short), false);
});

test("해제 진행도와 안내 문구가 조건과 맞는다", () => {
  for (const item of AVATAR_ITEMS) {
    const { current, target } = requirementProgress(item.requirement, emptyStats);
    assert.ok(Number.isFinite(current) && Number.isFinite(target));
    assert.ok(target >= 1);
    const label = requirementLabel(item.requirement);
    assert.ok(typeof label === "string" && label.length > 0);
  }
});

test("저장 값은 알 수 없는 id 나 잠긴 아이템을 받아들이지 않는다", () => {
  const dirty = { hat: "hat-graduate", glasses: "없는-아이템", neck: 42, bag: null, prop: "hat-coin", scene: "scene-night" };
  const safe = normalizeAvatar(dirty, emptyStats);
  assert.equal(safe.hat, null, "아직 잠긴 모자가 들어왔습니다");
  assert.equal(safe.glasses, null);
  assert.equal(safe.neck, null);
  assert.equal(safe.bag, null);
  assert.equal(safe.prop, null, "슬롯이 다른 아이템이 들어왔습니다");
  // 배경은 항상 하나 있어야 하므로, 잠긴 값이 오면 기본 배경으로 되돌립니다.
  assert.equal(safe.scene, DEFAULT_AVATAR.scene, "잠긴 배경이 기본값으로 돌아가지 않았습니다");

  // 조건을 채우면 그대로 유지됩니다.
  const kept = normalizeAvatar({ hat: "hat-graduate", scene: "scene-night" }, fullStats);
  assert.equal(kept.hat, "hat-graduate");
  assert.equal(kept.scene, "scene-night");

  // 기록이 없으면 기본값을 돌려줍니다.
  assert.deepEqual(normalizeAvatar(undefined), DEFAULT_AVATAR);
  assert.deepEqual(normalizeAvatar(null), DEFAULT_AVATAR);
});

test("기본 착용은 처음부터 열려 있는 아이템만 쓴다", () => {
  for (const { key } of AVATAR_SLOTS) {
    const id = DEFAULT_AVATAR[key];
    if (id === null) continue;
    const item = findItem(id);
    assert.ok(item, `${id} 를 찾을 수 없습니다`);
    assert.equal(item.slot, key);
    assert.equal(isItemUnlocked(item, emptyStats), true, `${id} 가 처음부터 열려 있지 않습니다`);
  }
});

test("액세서리 자리가 귀·눈·입을 부자연스럽게 가리지 않는다", () => {
  // 겹치는 넓이가 보호 영역의 몇 %인지 재서 판단합니다.
  // 모자챙이 귀 끝에 살짝 닿는 정도는 자연스럽고, 귀를 삼켜 버리는 건 안 됩니다.
  const coverRatio = (rect, keep) => {
    const w = Math.max(0, Math.min(rect.left + rect.width, keep.left + keep.width) - Math.max(rect.left, keep.left));
    const h = Math.max(0, Math.min(rect.top + rect.height, keep.top + keep.height) - Math.max(rect.top, keep.top));
    return (w * h) / (keep.width * keep.height);
  };
  for (const { key } of AVATAR_SLOTS) {
    if (key === "scene") continue;
    const rect = slotRect(key);
    assert.ok(rect.left >= 0 && rect.left + rect.width <= 100, `${key} 가 무대 밖으로 나갑니다`);
    assert.ok(rect.top >= 0 && rect.top + rect.height <= 100, `${key} 가 무대 밖으로 나갑니다`);

    const ear = Math.max(coverRatio(rect, KEEP_CLEAR.earLeft), coverRatio(rect, KEEP_CLEAR.earRight));
    assert.ok(ear <= 0.25, `${key} 가 귀를 ${Math.round(ear * 100)}% 나 가립니다`);

    const eyes = coverRatio(rect, KEEP_CLEAR.eyes);
    if (key === "glasses") {
      assert.ok(eyes > 0.5, "안경이 눈 위에 오지 않습니다");
    } else {
      assert.equal(eyes, 0, `${key} 가 눈을 가립니다`);
    }

    assert.equal(coverRatio(rect, KEEP_CLEAR.mouth), 0, `${key} 가 입을 가립니다`);
  }
});

test("기준점은 한 곳에서만 관리하고 % 좌표를 쓴다", () => {
  for (const [name, point] of Object.entries(AVATAR_ANCHORS)) {
    assert.ok(point.x > 0 && point.x < 100, `${name} 기준점 x 가 범위를 벗어납니다`);
    assert.ok(point.y > 0 && point.y < 100, `${name} 기준점 y 가 범위를 벗어납니다`);
  }
  assert.match(avatarSource, /AVATAR_ANCHORS/);
  // 화면 컴포넌트가 좌표를 따로 들고 있으면 안 됩니다.
  assert.doesNotMatch(avatarSource, /const\s+ANCHORS\s*=/);
});

test("꾸미기 상태는 계정 기록(progress)에 저장되고 localStorage 를 쓰지 않는다", () => {
  assert.match(pageSource, /avatar: TuriniAvatar/);
  assert.match(pageSource, /avatar: DEFAULT_AVATAR/);
  assert.match(pageSource, /avatar: normalizeAvatar\(savedProgress\.avatar\)/);
  assert.match(pageSource, /setProgress\(\(current\) => \(\{ \.\.\.current, avatar: next \}\)\)/);
  assert.match(pageSource, /fetch\("\/api\/account"/);
  assert.doesNotMatch(pageSource, /localStorage\.setItem/);
});

test("기존 프로필 정보와 계정 기능은 그대로 남아 있다", () => {
  assert.match(pageSource, /progress\.streak/);
  assert.match(pageSource, /progress\.xp/);
  assert.match(pageSource, /Lv\. \{progress\.level\}/);
  assert.match(pageSource, /투리니 배지 컬렉션/);
  assert.match(pageSource, /onClick=\{logout\}/);
  assert.match(pageSource, /계정 초기화/);
  assert.match(pageSource, /아이디와 기록 모두 삭제/);
});

test("실제 그림이 없는 아이템은 개발 확인용으로 표시한다", () => {
  const dressUp = AVATAR_ITEMS.filter((item) => item.slot !== "scene");
  assert.ok(dressUp.every((item) => item.placeholder === true), "임시 도형 표시가 빠진 아이템이 있습니다");
  assert.ok(
    AVATAR_ITEMS.filter((item) => item.slot === "scene").every((item) => item.placeholder === false),
    "배경은 색만 쓰므로 임시가 아닙니다",
  );
  assert.match(avatarSource, /개발 확인용/);
});

test("결제 기능은 들어 있지 않다", () => {
  for (const source of [avatarSource, pageSource]) {
    assert.doesNotMatch(source, /결제|구매하기|price|checkout|payment/i);
  }
});
