/**
 * 나만의 투리니 꾸미기 — 기준점, 아이템 목록, 해제 조건
 *
 * 화면과 분리된 순수 계산 모듈입니다. 여기에는 상태가 없고,
 * 해제 여부는 이미 저장 중인 학습 기록(XP·레벨·연속 학습·카테고리 진도)에서
 * 그때그때 계산합니다. 해제 목록을 따로 저장하지 않으므로 기록이 어긋날 일이 없습니다.
 */

export type AvatarSlot = "hat" | "glasses" | "neck" | "bag" | "prop" | "scene";

export const AVATAR_SLOTS: { key: AvatarSlot; name: string; anchor: AvatarAnchor | null }[] = [
  { key: "hat", name: "모자", anchor: "head" },
  { key: "glasses", name: "안경", anchor: "face" },
  { key: "neck", name: "목 액세서리", anchor: "neck" },
  { key: "bag", name: "가방", anchor: "back" },
  { key: "prop", name: "손 소품", anchor: "hand" },
  { key: "scene", name: "배경", anchor: null },
];

export type AvatarAnchor = "head" | "face" | "neck" | "back" | "hand";

/**
 * 공통 기준점 — 캐릭터 무대(정사각형) 기준 % 좌표.
 *
 * 값은 `public/assets/turini-atlas-v2.png` 의 idle 0번 프레임(288×288)에서 측정했습니다.
 * 무대가 커지든 작아지든 % 이므로 액세서리는 항상 같은 자리에 붙습니다.
 */
export const AVATAR_ANCHORS: Record<AvatarAnchor, { x: number; y: number; note: string }> = {
  head: { x: 48, y: 27, note: "머리 정수리 — 모자 아랫변이 닿는 지점" },
  face: { x: 47.5, y: 44, note: "두 눈 사이 중심 — 안경 중심" },
  neck: { x: 48, y: 62, note: "턱 아래 어깨선 — 목 액세서리 중심" },
  back: { x: 65, y: 70, note: "등에 멘 가방 중심 — 기존 초록 가방 자리" },
  hand: { x: 40, y: 69, note: "화면 왼쪽 손 — 소품 중심" },
};

/** 슬롯별 배치 규칙. width/height 도 무대 대비 % 입니다. */
export const AVATAR_LAYOUT: Record<
  AvatarSlot,
  { anchor: AvatarAnchor | null; width: number; height: number; align: "bottom" | "center"; layer: number }
> = {
  scene: { anchor: null, width: 100, height: 100, align: "center", layer: 0 },
  bag: { anchor: "back", width: 24, height: 26, align: "center", layer: 2 },
  neck: { anchor: "neck", width: 32, height: 9, align: "center", layer: 3 },
  prop: { anchor: "hand", width: 18, height: 18, align: "center", layer: 4 },
  glasses: { anchor: "face", width: 33, height: 10, align: "center", layer: 5 },
  hat: { anchor: "head", width: 32, height: 17, align: "bottom", layer: 6 },
};

/** 무대 안에서 아이템이 차지할 사각형을 % 로 돌려줍니다. */
export function slotRect(slot: AvatarSlot) {
  const layout = AVATAR_LAYOUT[slot];
  if (!layout.anchor) return { left: 0, top: 0, width: 100, height: 100 };
  const anchor = AVATAR_ANCHORS[layout.anchor];
  return {
    left: anchor.x - layout.width / 2,
    top: layout.align === "bottom" ? anchor.y - layout.height : anchor.y - layout.height / 2,
    width: layout.width,
    height: layout.height,
  };
}

/**
 * 가리면 안 되는 영역 (무대 대비 %). 자산 제작 기준으로도 씁니다.
 * 코는 안경다리가 자연스럽게 지나가는 자리라 보호 영역에서 뺐습니다.
 */
export const KEEP_CLEAR = {
  earLeft: { left: 27, top: 24, width: 10, height: 9 },
  earRight: { left: 61, top: 24, width: 11, height: 9 },
  eyes: { left: 33, top: 39, width: 29, height: 9 },
  mouth: { left: 39, top: 49.5, width: 17, height: 7 },
};

export type AvatarRequirement =
  | { kind: "always" }
  | { kind: "xp"; value: number }
  | { kind: "level"; value: number }
  | { kind: "streak"; value: number }
  | { kind: "solved"; value: number }
  | { kind: "category"; category: string; lessons: number }
  | { kind: "everyCategory"; lessons: number };

export type AvatarItem = {
  id: string;
  slot: AvatarSlot;
  name: string;
  /** 임시 도형인지 여부. true 면 화면에 '개발 확인용' 표시가 붙습니다. */
  placeholder: boolean;
  /** 임시 도형 모양 키 (실제 이미지가 들어오면 없어집니다) */
  shape?: string;
  /** 색상 — 임시 도형과 배경에 씁니다 */
  tint: string;
  requirement: AvatarRequirement;
};

/** 해제 판정에 쓰는 학습 기록. 전부 이미 저장 중인 값에서 계산합니다. */
export type AvatarStats = {
  xp: number;
  level: number;
  streak: number;
  solved: number;
  /** 카테고리별 완료 레슨 수 */
  categoryLessons: Record<string, number>;
};

const NONE_SUFFIX = "-none";

/** 슬롯을 비우는 '없음' 항목 id */
export function noneItemId(slot: AvatarSlot) {
  return `${slot}${NONE_SUFFIX}`;
}

export function isNoneItem(id: string) {
  return id.endsWith(NONE_SUFFIX);
}

/**
 * 아이템 목록.
 *
 * 배경(scene)은 색과 그라데이션만 쓰므로 지금 상태가 최종본입니다.
 * 나머지 다섯 슬롯은 **실제 액세서리 이미지가 아직 없어서 임시 도형**이며,
 * placeholder: true 로 표시해 화면에서도 '개발 확인용'임을 알립니다.
 * 필요한 자산 규격은 design-assets/turini-avatar/NEEDED_ITEM_ASSETS.md 참고.
 */
export const AVATAR_ITEMS: AvatarItem[] = [
  // ── 모자 ────────────────────────────────────────────────
  { id: "hat-sprout", slot: "hat", name: "새싹 모자", placeholder: true, shape: "beanie", tint: "#4fb96b", requirement: { kind: "always" } },
  { id: "hat-coin", slot: "hat", name: "동전 캡", placeholder: true, shape: "cap", tint: "#f0b429", requirement: { kind: "xp", value: 300 } },
  { id: "hat-analyst", slot: "hat", name: "애널리스트 중절모", placeholder: true, shape: "fedora", tint: "#5b5f7a", requirement: { kind: "streak", value: 7 } },
  { id: "hat-graduate", slot: "hat", name: "졸업 모자", placeholder: true, shape: "graduate", tint: "#2f3350", requirement: { kind: "category", category: "주식", lessons: 12 } },

  // ── 안경 ────────────────────────────────────────────────
  { id: "glasses-round", slot: "glasses", name: "동그란 안경", placeholder: true, shape: "round", tint: "#6b5a44", requirement: { kind: "always" } },
  { id: "glasses-study", slot: "glasses", name: "공부 안경", placeholder: true, shape: "square", tint: "#3b5b8c", requirement: { kind: "solved", value: 60 } },
  { id: "glasses-sun", slot: "glasses", name: "선글라스", placeholder: true, shape: "sun", tint: "#2b2b33", requirement: { kind: "level", value: 5 } },

  // ── 목 액세서리 ─────────────────────────────────────────
  { id: "neck-scarf", slot: "neck", name: "체크 목도리", placeholder: true, shape: "scarf", tint: "#e0684f", requirement: { kind: "always" } },
  { id: "neck-tie", slot: "neck", name: "금융인 넥타이", placeholder: true, shape: "tie", tint: "#2f6fae", requirement: { kind: "xp", value: 800 } },
  { id: "neck-medal", slot: "neck", name: "성장 메달", placeholder: true, shape: "medal", tint: "#d8a52a", requirement: { kind: "everyCategory", lessons: 3 } },

  // ── 가방 ────────────────────────────────────────────────
  { id: "bag-satchel", slot: "bag", name: "가죽 크로스백", placeholder: true, shape: "satchel", tint: "#a9743f", requirement: { kind: "always" } },
  { id: "bag-shield", slot: "bag", name: "방패 배낭", placeholder: true, shape: "shield", tint: "#3f8f8a", requirement: { kind: "category", category: "위험 관리", lessons: 6 } },
  { id: "bag-vault", slot: "bag", name: "금고 배낭", placeholder: true, shape: "vault", tint: "#59637c", requirement: { kind: "xp", value: 1500 } },

  // ── 손 소품 ─────────────────────────────────────────────
  { id: "prop-coin", slot: "prop", name: "금화", placeholder: true, shape: "coin", tint: "#efb42b", requirement: { kind: "always" } },
  { id: "prop-chart", slot: "prop", name: "수익률 차트", placeholder: true, shape: "chart", tint: "#2f8fe5", requirement: { kind: "category", category: "수익률 계산", lessons: 6 } },
  { id: "prop-piggy", slot: "prop", name: "돼지 저금통", placeholder: true, shape: "piggy", tint: "#eb8aa6", requirement: { kind: "streak", value: 14 } },

  // ── 배경 (색상만 쓰므로 지금이 최종본) ──────────────────
  { id: "scene-meadow", slot: "scene", name: "새싹 들판", placeholder: false, tint: "#8fd79b", requirement: { kind: "always" } },
  { id: "scene-dawn", slot: "scene", name: "장 시작 새벽", placeholder: false, tint: "#f6c98f", requirement: { kind: "level", value: 3 } },
  { id: "scene-night", slot: "scene", name: "야간 시장", placeholder: false, tint: "#6e7fc0", requirement: { kind: "solved", value: 240 } },
  { id: "scene-summit", slot: "scene", name: "정상 고원", placeholder: false, tint: "#7ec9d6", requirement: { kind: "everyCategory", lessons: 6 } },
];

export function itemsForSlot(slot: AvatarSlot) {
  return AVATAR_ITEMS.filter((item) => item.slot === slot);
}

export function findItem(id: string | null) {
  if (!id) return null;
  return AVATAR_ITEMS.find((item) => item.id === id) ?? null;
}

/** 조건 달성 정도 — 화면에 '3/7일' 처럼 보여 주려고 씁니다. */
export function requirementProgress(requirement: AvatarRequirement, stats: AvatarStats) {
  switch (requirement.kind) {
    case "always":
      return { current: 1, target: 1 };
    case "xp":
      return { current: stats.xp, target: requirement.value };
    case "level":
      return { current: stats.level, target: requirement.value };
    case "streak":
      return { current: stats.streak, target: requirement.value };
    case "solved":
      return { current: stats.solved, target: requirement.value };
    case "category":
      return { current: stats.categoryLessons[requirement.category] ?? 0, target: requirement.lessons };
    case "everyCategory": {
      const values = Object.values(stats.categoryLessons);
      const reached = values.filter((lessons) => lessons >= requirement.lessons).length;
      return { current: reached, target: Math.max(1, values.length) };
    }
  }
}

export function isItemUnlocked(item: AvatarItem, stats: AvatarStats) {
  const { current, target } = requirementProgress(item.requirement, stats);
  return current >= target;
}

export function requirementLabel(requirement: AvatarRequirement) {
  switch (requirement.kind) {
    case "always":
      return "처음부터 사용 가능";
    case "xp":
      return `XP ${requirement.value} 달성`;
    case "level":
      return `Lv.${requirement.value} 달성`;
    case "streak":
      return `연속 학습 ${requirement.value}일`;
    case "solved":
      return `문제 ${requirement.value}개 풀기`;
    case "category":
      return `${requirement.category} ${requirement.lessons}레슨 완료`;
    case "everyCategory":
      return `모든 카테고리 ${requirement.lessons}레슨 완료`;
  }
}

/** 저장되는 꾸미기 상태. 값은 아이템 id 이고, 비워 두면 null 입니다. */
export type TuriniAvatar = Record<AvatarSlot, string | null>;

export const DEFAULT_AVATAR: TuriniAvatar = {
  hat: null,
  glasses: null,
  neck: null,
  bag: null,
  prop: null,
  scene: "scene-meadow",
};

/**
 * 서버에서 불러온 값을 안전한 모양으로 맞춥니다.
 * 모르는 id, 슬롯이 다른 id, 아직 해제되지 않은 id 는 비웁니다.
 */
export function normalizeAvatar(value: unknown, stats?: AvatarStats): TuriniAvatar {
  const source = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const next: TuriniAvatar = { ...DEFAULT_AVATAR };
  for (const { key } of AVATAR_SLOTS) {
    const raw = source[key];
    if (raw === null) {
      next[key] = null;
      continue;
    }
    if (typeof raw !== "string") continue;
    const item = findItem(raw);
    if (!item || item.slot !== key) continue;
    if (stats && !isItemUnlocked(item, stats)) continue;
    next[key] = item.id;
  }
  return next;
}

export function avatarStatsFrom(input: {
  xp: number;
  level: number;
  streak: number;
  solved: number;
  categoryLessons: Record<string, number>;
}): AvatarStats {
  return {
    xp: Math.max(0, Math.floor(input.xp || 0)),
    level: Math.max(1, Math.floor(input.level || 1)),
    streak: Math.max(0, Math.floor(input.streak || 0)),
    solved: Math.max(0, Math.floor(input.solved || 0)),
    categoryLessons: input.categoryLessons || {},
  };
}

export function unlockedCount(stats: AvatarStats) {
  return AVATAR_ITEMS.filter((item) => isItemUnlocked(item, stats)).length;
}
