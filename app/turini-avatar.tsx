"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import TuriniComposite from "./turini-composite";
import TuriniRig from "./turini-rig";
import TuriniSprite, { type TuriniMotion } from "./turini-sprite";
import {
  AVATAR_ITEMS,
  BASE_CUSTOMIZATION,
  DEFAULT_CUSTOMIZATION,
  AVATAR_SLOTS,
  TURNAROUND,
  TURNAROUND_WEBP,
  VIEW_LABEL,
  assetPath,
  assetPathWebp,
  dressupLayerPath,
  findItem,
  isItemUnlocked,
  itemsForSlot,
  remainingLabel,
  requirementLabel,
  requirementProgress,
  wornPreview,
  type AvatarItem,
  type AvatarSlot,
  type AvatarStats,
  type TurniView,
  type TuriniCustomization,
} from "./avatar-items";

/**
 * 앱 전체가 쓰는 하나의 캐릭터 컴포넌트.
 *
 * - 꾸미기 화면 밖에서는 언제나 액세서리 없는 기본 투리니를 그립니다.
 * - 꾸미기 편집기에서만 `customization`을 직접 넘겨 선택한 외형을 미리 봅니다.
 * - 평상시·생각·읽기는 호흡과 눈 깜박임만 있는 차분한 리그를 씁니다.
 * - 정답·오답·완료처럼 반응이 필요한 순간에만 12프레임 동작을 한 번 재생합니다.
 *
 * 저장한 외형은 꾸미기 편집기에만 사용하므로 퀴즈의 팻말과 안내 화면을 가리지 않습니다.
 */

/**
 * 저장된 꾸미기 상태를 편집기까지 전달하는 컨텍스트입니다.
 * 일반 화면의 캐릭터는 이 값을 자동 적용하지 않습니다.
 */
const CustomizationContext = createContext<TuriniCustomization>(DEFAULT_CUSTOMIZATION);

export function TuriniAvatarProvider({
  customization,
  children,
}: {
  customization: TuriniCustomization;
  children: ReactNode;
}) {
  return (
    <CustomizationContext.Provider value={customization}>{children}</CustomizationContext.Provider>
  );
}

export function useCustomization() {
  return useContext(CustomizationContext);
}

export type TuriniAvatarProps = {
  /** 꾸미기 편집기에서만 직접 넘깁니다. 생략하면 액세서리 없는 기본 외형입니다. */
  customization?: TuriniCustomization;
  motion?: TuriniMotion;
  /** 값이 바뀌면 같은 동작이라도 처음부터 다시 재생합니다 */
  replayKey?: string | number;
  /** 1회 재생이 끝나도 마지막 프레임을 유지합니다 (정답·오답 팻말) */
  holdLast?: boolean;
  className?: string;
  label?: string;
  decorative?: boolean;
  /** 배경 그림까지 함께 보여 줄지 (홈·마이페이지·꾸미기에서만 켭니다) */
  scene?: boolean;
  /** 숨쉬기·깜박임 */
  animated?: boolean;
};

export default function TuriniAvatar({
  customization: given,
  motion = "idle",
  replayKey,
  holdLast = false,
  className = "",
  label = "나의 투리니",
  decorative = false,
  scene = false,
  animated = true,
}: TuriniAvatarProps) {
  // Provider에는 저장값을 보관하지만, 일반 화면은 이를 자동 상속하지 않습니다.
  // 꾸미기 편집기만 `given`을 넘겨 실제 착용 상태를 보여 줍니다.
  const customization = given ?? BASE_CUSTOMIZATION;
  const background = scene ? findItem(customization.background) : null;

  // 1회 재생(정답·오답·축하)이 끝나면 착용 상태가 반영된 리그 캐릭터로 돌아옵니다.
  const cycleKey = `${motion}|${replayKey ?? ""}`;
  const [rested, setRested] = useState({ key: cycleKey, done: false });
  if (rested.key !== cycleKey) setRested({ key: cycleKey, done: false });
  // 애니메이션 그림을 못 읽으면 캐릭터가 사라지는 대신 리그 캐릭터로 대신합니다.
  const [atlasMissing, setAtlasMissing] = useState(false);
  const showRig =
    atlasMissing
    || motion === "idle"
    || motion === "thinking"
    || motion === "reading"
    || (rested.key === cycleKey && rested.done && !holdLast);

  const body =
    given && showRig ? (
      <TuriniComposite
        customization={customization}
        animated={animated}
        className="turini-avatar__figure"
        label={label}
        decorative={decorative || scene}
      />
    ) : showRig ? (
      <TuriniRig
        customization={customization}
        animated={animated}
        className="turini-avatar__figure"
        label={label}
        decorative={decorative || scene}
      />
    ) : (
      <TuriniSprite
        motion={motion}
        replayKey={replayKey}
        holdLast={holdLast}
        onRest={() => setRested({ key: cycleKey, done: true })}
        onAtlasMissing={() => setAtlasMissing(true)}
        className="turini-avatar__figure"
        decorative={decorative || scene}
        customization={customization}
      />
    );

  if (!background) return <span className={`turini-avatar ${className}`.trim()}>{body}</span>;

  return (
    <div className={`turini-avatar turini-avatar--scene ${className}`.trim()} role="img" aria-label={label}>
      <span className="turini-avatar__background" aria-hidden="true">
        <ItemImage item={background} eager />
      </span>
      {body}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   이미지 한 장 — webp 를 먼저 쓰고, 없으면 원본 png, 그것도 없으면 조용히 비웁니다.
   ────────────────────────────────────────────────────────────── */

function ItemImage({
  item,
  alt = "",
  eager = false,
  className = "",
}: {
  item: AvatarItem;
  alt?: string;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`turini-dress__missing ${className}`.trim()} aria-hidden="true" />;
  }
  return (
    <picture>
      <source srcSet={assetPathWebp(item.slot, item.file)} type="image/webp" />
      <img
        className={className}
        src={assetPath(item.slot, item.file)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding={eager ? "sync" : "async"}
        draggable={false}
        onError={() => setFailed(true)}
      />
    </picture>
  );
}

/** 목록 썸네일 — 그 아이템 하나를 실제로 착용한 완성본을 씁니다 */
function WornThumb({ item }: { item: AvatarItem }) {
  const [failed, setFailed] = useState(false);
  const worn = wornPreview(item);
  if (!worn || failed) return <ItemImage item={item} />;
  return (
    <picture>
      <source srcSet={worn.thumb} type="image/webp" />
      <img src={worn.png} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
    </picture>
  );
}

/* ──────────────────────────────────────────────────────────────
   회전 미리보기 — 가방은 등 뒤라서 정면으로는 잘 보이지 않습니다.
   ────────────────────────────────────────────────────────────── */

function TurnaroundLayer({ item, view = "front" }: { item: AvatarItem; view?: "front" | "back" }) {
  const [failed, setFailed] = useState(false);
  const png = dressupLayerPath(item, view);
  const webp = dressupLayerPath(item, view, true);
  if (!png || failed) return null;
  return (
    <picture className={`turini-dress__turn-layer turini-dress__turn-layer--${item.slot}`}>
      {webp ? <source srcSet={webp} type="image/webp" /> : null}
      <img src={png} alt="" decoding="async" draggable={false} onError={() => setFailed(true)} />
    </picture>
  );
}

function TurnaroundView({
  view,
  customization,
}: {
  view: Exclude<TurniView, "front">;
  customization: TuriniCustomization;
}) {
  const [failed, setFailed] = useState(false);
  const bag = findItem(customization.bag);
  const hat = findItem(customization.hat);
  // 3/4 후면은 "그 가방 하나를 멘" 완성본이 있으면 그걸 씁니다.
  const worn = view === "three-quarter-rear" && bag ? wornPreview(bag) : null;
  if (worn && !failed) {
    return (
      <span className="turini-dress__turn">
        <picture>
          <source srcSet={worn.webp} type="image/webp" />
          <img src={worn.png} alt="" decoding="async" draggable={false} onError={() => setFailed(true)} />
        </picture>
        {hat ? <TurnaroundLayer item={hat} /> : null}
      </span>
    );
  }
  return (
    <span className="turini-dress__turn">
      <picture>
        <source srcSet={TURNAROUND_WEBP[view]} type="image/webp" />
        <img src={TURNAROUND[view]} alt="" decoding="async" draggable={false} />
      </picture>
      {bag && view === "back" ? <TurnaroundLayer item={bag} view="back" /> : null}
      {hat ? <TurnaroundLayer item={hat} /> : null}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   꾸미기 화면
   ────────────────────────────────────────────────────────────── */

export function TuriniDressUp({
  customization,
  stats,
  saving,
  onChange,
}: {
  customization: TuriniCustomization;
  stats: AvatarStats;
  saving: boolean;
  onChange: (next: TuriniCustomization) => void;
}) {
  const [slot, setSlot] = useState<AvatarSlot>("hat");
  const [showLocked, setShowLocked] = useState(true);
  const [view, setView] = useState<TurniView>("front");

  const unlockedIds = useMemo(() => {
    const set = new Set<string>();
    AVATAR_ITEMS.forEach((entry) => {
      if (isItemUnlocked(entry, stats)) set.add(entry.id);
    });
    return set;
  }, [stats]);

  const slotItems = itemsForSlot(slot);
  const visible = showLocked ? slotItems : slotItems.filter((entry) => unlockedIds.has(entry.id));
  const slotName = AVATAR_SLOTS.find((entry) => entry.key === slot)?.name ?? "";
  const bag = findItem(customization.bag);
  const background = findItem(customization.background);

  const choose = (entry: AvatarItem) => {
    if (!unlockedIds.has(entry.id)) return;
    if (customization[entry.slot] === entry.id) return;
    onChange({ ...customization, [entry.slot]: entry.id });
  };

  const clearSlot = () => {
    if (customization[slot] === null) return;
    onChange({ ...customization, [slot]: null });
  };

  return (
    <section className="card-block turini-dress" aria-label="캐릭터 꾸미기">
      <div className="turini-dress__head">
        <div>
          <p className="eyebrow">MY TURINI</p>
          <h2>캐릭터 꾸미기</h2>
        </div>
        <span className="turini-dress__count" aria-live="polite">
          {saving ? "저장 중…" : `보유 ${unlockedIds.size} / ${AVATAR_ITEMS.length}`}
        </span>
      </div>

      <div className="turini-dress__stage">
        {view === "front" ? (
          <TuriniAvatar
            customization={customization}
            className="turini-avatar--editor"
            label="꾸미는 중인 나의 투리니"
            scene
            animated
          />
        ) : (
          <div className="turini-avatar turini-avatar--editor turini-avatar--scene turini-avatar--turn">
            {background ? (
              <span className="turini-avatar__background" aria-hidden="true">
                <ItemImage item={background} eager />
              </span>
            ) : null}
            <TurnaroundView view={view} customization={customization} />
          </div>
        )}

        <div className="turini-dress__views" role="group" aria-label="보는 방향">
          {(["front", "three-quarter-rear", "back"] as TurniView[]).map((entry) => (
            <button
              key={entry}
              type="button"
              className="turini-dress__view"
              data-active={view === entry ? "true" : undefined}
              aria-pressed={view === entry}
              onClick={() => setView(entry)}
            >
              {VIEW_LABEL[entry]}
            </button>
          ))}
        </div>
        {view !== "front" ? (
          <p className="turini-dress__view-note">
            {view === "three-quarter-rear" && bag
              ? "선택한 가방을 실제로 멘 착용샷이에요. 모자는 각도에 맞춰 함께 유지돼요."
              : bag
                ? "선택한 가방과 모자, 배경이 방향을 바꿔도 그대로 유지돼요. 안경과 목장식은 뒤에서는 가려져요."
                : "등이 보이는 각도예요. 가방을 선택하면 이 화면에도 바로 표시돼요."}
          </p>
        ) : null}
      </div>

      <div className="turini-dress__tabs" role="tablist" aria-label="꾸미기 카테고리">
        {AVATAR_SLOTS.map(({ key, name }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={slot === key}
            className="turini-dress__tab"
            data-active={slot === key ? "true" : undefined}
            onClick={() => {
              setSlot(key);
              // 가방은 등 뒤라 정면으로는 잘 보이지 않습니다. 탭을 열면 각도를 돌려 줍니다.
              setView(key === "bag" ? "three-quarter-rear" : "front");
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="turini-dress__toolbar">
        <span>
          {slotName} · {visible.length}종
        </span>
        <label className="turini-dress__toggle">
          <input
            type="checkbox"
            checked={showLocked}
            onChange={(event) => setShowLocked(event.target.checked)}
          />
          잠긴 항목 보기
        </label>
      </div>

      <ul className="turini-dress__grid">
        {slot !== "background" ? (
          <li>
            <button
              type="button"
              className="turini-dress__item turini-dress__item--none"
              data-state={customization[slot] === null ? "selected" : "owned"}
              onClick={clearSlot}
              aria-pressed={customization[slot] === null}
            >
              <span className="turini-dress__item-art">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="turini-dress__none-icon">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 18 18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {customization[slot] === null ? <CheckBadge /> : null}
              </span>
              <b>착용 해제</b>
            </button>
          </li>
        ) : null}

        {visible.map((entry) => {
          const unlocked = unlockedIds.has(entry.id);
          const selected = customization[entry.slot] === entry.id;
          const { current, target } = requirementProgress(entry.requirement, stats);
          return (
            <li key={entry.id}>
              <button
                type="button"
                className="turini-dress__item"
                data-state={selected ? "selected" : unlocked ? "owned" : "locked"}
                onClick={() => choose(entry)}
                disabled={!unlocked}
                aria-pressed={selected}
                aria-label={
                  unlocked
                    ? `${entry.name}${selected ? " · 착용 중" : ""}`
                    : `${entry.name} · 잠김 · ${requirementLabel(entry.requirement)}`
                }
              >
                <span className="turini-dress__item-art">
                  {entry.slot === "background" ? <ItemImage item={entry} /> : <WornThumb item={entry} />}
                  {selected ? <CheckBadge /> : null}
                  {!unlocked ? <LockBadge /> : null}
                </span>
                <b>{entry.name}</b>
                {unlocked ? null : (
                  <small className="turini-dress__need">
                    {requirementLabel(entry.requirement)}
                    <i>
                      {remainingLabel(entry.requirement, stats)} ({Math.min(current, target)}/{target})
                    </i>
                  </small>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 ? (
        <p className="turini-dress__empty">이 카테고리에 아직 열린 아이템이 없어요.</p>
      ) : null}

      <p className="turini-dress__notice">
        고른 아이템은 바로 저장돼서 새로고침하거나 다시 로그인해도 유지돼요. 선택한 외형은 이 꾸미기 화면에서만 보여요.
      </p>
    </section>
  );
}

function CheckBadge() {
  return (
    <span className="turini-dress__check" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="m5 12.5 4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function LockBadge() {
  return (
    <span className="turini-dress__lock" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M7 10V7.5a5 5 0 0 1 10 0V10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="currentColor" />
      </svg>
    </span>
  );
}
