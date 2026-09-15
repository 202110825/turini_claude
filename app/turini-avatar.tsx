"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Turini from "./turini-character";
import {
  AVATAR_ANCHORS,
  AVATAR_ITEMS,
  AVATAR_LAYOUT,
  AVATAR_SLOTS,
  DEFAULT_AVATAR,
  findItem,
  isItemUnlocked,
  itemsForSlot,
  requirementLabel,
  requirementProgress,
  slotRect,
  type AvatarItem,
  type AvatarSlot,
  type AvatarStats,
  type TuriniAvatar,
} from "./avatar-items";

/**
 * 나만의 투리니 꾸미기
 *
 * 무대는 정사각형이고 액세서리 위치는 전부 % 좌표라, 화면 크기가 바뀌어도
 * 캐릭터와 액세서리가 같은 비율로 같이 커지고 작아집니다.
 * 기준점은 avatar-items.ts 의 AVATAR_ANCHORS 한 곳에서만 관리합니다.
 */

/* ──────────────────────────────────────────────────────────────
   임시 도형
   실제 액세서리 이미지가 아직 없어서, 기준점과 크기를 눈으로 확인하기 위한
   단순 도형입니다. 최종 그림이 아니며 화면에도 '개발 확인용' 이라고 표시됩니다.
   ────────────────────────────────────────────────────────────── */

function PlaceholderArt({ shape, tint }: { shape: string; tint: string }) {
  const stroke = "rgba(20, 38, 28, .5)";
  const common = { fill: tint, stroke, strokeWidth: 2.4, strokeLinejoin: "round" as const };

  switch (shape) {
    case "beanie":
      return (
        <svg viewBox="0 0 100 54" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <path d="M14 42C14 22 30 8 50 8s36 14 36 34z" {...common} />
          <rect x="8" y="40" width="84" height="11" rx="5.5" {...common} />
        </svg>
      );
    case "cap":
      return (
        <svg viewBox="0 0 100 54" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <path d="M18 40C18 21 32 9 50 9s32 12 32 31z" {...common} />
          <path d="M18 40h74c0 7-6 11-16 11H18z" {...common} />
        </svg>
      );
    case "fedora":
      return (
        <svg viewBox="0 0 100 54" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <path d="M26 38V22c0-9 10-14 24-14s24 5 24 14v16z" {...common} />
          <ellipse cx="50" cy="42" rx="46" ry="9" {...common} />
          <rect x="26" y="30" width="48" height="8" fill="rgba(0,0,0,.22)" />
        </svg>
      );
    case "graduate":
      return (
        <svg viewBox="0 0 100 54" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
          <path d="M30 42V28h40v14z" {...common} />
          <path d="M50 8 96 26 50 42 4 26z" {...common} />
          <path d="M92 28v16" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <circle cx="92" cy="46" r="4" {...common} />
        </svg>
      );
    case "round":
      return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <circle cx="26" cy="20" r="15" fill="rgba(255,255,255,.35)" stroke={tint} strokeWidth="4.5" />
          <circle cx="74" cy="20" r="15" fill="rgba(255,255,255,.35)" stroke={tint} strokeWidth="4.5" />
          <path d="M41 20h18" fill="none" stroke={tint} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="9" y="7" width="33" height="26" rx="7" fill="rgba(255,255,255,.35)" stroke={tint} strokeWidth="4.5" />
          <rect x="58" y="7" width="33" height="26" rx="7" fill="rgba(255,255,255,.35)" stroke={tint} strokeWidth="4.5" />
          <path d="M42 20h16" fill="none" stroke={tint} strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      );
    case "sun":
      return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d="M8 12h36c0 16-6 22-18 22S8 28 8 12z" fill={tint} stroke={stroke} strokeWidth="2.4" />
          <path d="M56 12h36c0 16-6 22-18 22S56 28 56 12z" fill={tint} stroke={stroke} strokeWidth="2.4" />
          <path d="M44 15h12" fill="none" stroke={tint} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "scarf":
      return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="4" y="3" width="92" height="13" rx="6.5" {...common} />
          <path d="M58 13h17v13H58z" {...common} />
          <path d="M16 9h68" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2.6" />
        </svg>
      );
    case "tie":
      return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="8" y="2" width="84" height="9" rx="4.5" fill="rgba(255,255,255,.6)" stroke={stroke} strokeWidth="2" />
          <path d="M42 2h16l5 8-13 5-13-5z" {...common} />
          <path d="M45 15h10l4 11H41z" {...common} />
        </svg>
      );
    case "medal":
      return (
        <svg viewBox="0 0 100 28" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d="M36 2 50 15 64 2" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <circle cx="50" cy="19" r="8.5" {...common} />
          <circle cx="50" cy="19" r="3.4" fill="rgba(255,255,255,.6)" />
        </svg>
      );
    case "satchel":
      return (
        <svg viewBox="0 0 100 108" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="12" y="34" width="76" height="62" rx="12" {...common} />
          <path d="M12 46c0-14 10-24 24-24h28c14 0 24 10 24 24z" {...common} />
          <rect x="40" y="52" width="20" height="13" rx="5" fill="rgba(255,255,255,.55)" stroke={stroke} strokeWidth="2" />
          <path d="M22 34 34 6" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 100 108" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d="M50 18 88 32v30c0 20-16 32-38 40-22-8-38-20-38-40V32z" {...common} />
          <path d="M50 38v34" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="5" strokeLinecap="round" />
          <path d="M33 55h34" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "vault":
      return (
        <svg viewBox="0 0 100 108" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="12" y="24" width="76" height="72" rx="10" {...common} />
          <circle cx="50" cy="60" r="18" fill="rgba(255,255,255,.4)" stroke={stroke} strokeWidth="2.6" />
          <path d="M50 44v32M34 60h32" fill="none" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M24 24 34 6" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "coin":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <circle cx="50" cy="52" r="38" {...common} />
          <circle cx="50" cy="52" r="27" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="4" />
          <path d="M36 42l14 22 14-22M34 56h32" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="10" y="14" width="80" height="72" rx="10" fill="rgba(255,255,255,.75)" stroke={stroke} strokeWidth="2.6" />
          <path d="M22 70l18-18 14 12 24-28" fill="none" stroke={tint} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="78" cy="36" r="6" fill={tint} />
        </svg>
      );
    case "piggy":
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <ellipse cx="50" cy="56" rx="36" ry="28" {...common} />
          <ellipse cx="18" cy="58" rx="11" ry="9" {...common} />
          <path d="M34 30l12 8-16 4z" {...common} />
          <rect x="44" y="34" width="20" height="5" rx="2.5" fill={stroke} />
          <circle cx="28" cy="50" r="3.2" fill={stroke} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <rect x="16" y="16" width="68" height="68" rx="14" {...common} />
        </svg>
      );
  }
}

function SceneArt({ tint }: { tint: string }) {
  return (
    <span
      className="turini-dress__scene-art"
      style={{ ["--scene-tint" as string]: tint } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function ItemArt({ item }: { item: AvatarItem }) {
  if (item.slot === "scene") return <SceneArt tint={item.tint} />;
  return <PlaceholderArt shape={item.shape ?? "block"} tint={item.tint} />;
}

/* ──────────────────────────────────────────────────────────────
   무대 — 캐릭터 + 액세서리
   ────────────────────────────────────────────────────────────── */

export function TuriniStage({
  avatar,
  className = "",
  showAnchors = false,
}: {
  avatar: TuriniAvatar;
  className?: string;
  /** 개발 확인용 — 기준점을 눈으로 보고 싶을 때 */
  showAnchors?: boolean;
}) {
  const scene = findItem(avatar.scene);
  const worn = AVATAR_SLOTS.map(({ key }) => findItem(avatar[key])).filter(
    (item): item is AvatarItem => Boolean(item) && item!.slot !== "scene",
  );

  return (
    <div className={`turini-dress__stage ${className}`.trim()}>
      {scene ? (
        <span
          className="turini-dress__scene"
          style={{ ["--scene-tint" as string]: scene.tint } as CSSProperties}
          aria-hidden="true"
        />
      ) : null}

      <div className="turini-dress__figure">
        <Turini state="idle" className="turini-dress__character" frozen decorative />
        {worn.map((item) => {
          const rect = slotRect(item.slot);
          return (
            <span
              key={item.id}
              className="turini-dress__piece"
              data-slot={item.slot}
              style={
                {
                  left: `${rect.left}%`,
                  top: `${rect.top}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  zIndex: AVATAR_LAYOUT[item.slot].layer,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <ItemArt item={item} />
            </span>
          );
        })}

        {showAnchors
          ? Object.entries(AVATAR_ANCHORS).map(([key, point]) => (
              <span
                key={key}
                className="turini-dress__anchor"
                style={{ left: `${point.x}%`, top: `${point.y}%` } as CSSProperties}
                data-anchor={key}
                aria-hidden="true"
              />
            ))
          : null}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   꾸미기 화면
   ────────────────────────────────────────────────────────────── */

type Filter = "all" | "owned" | "locked";

const FILTERS: { key: Filter; name: string }[] = [
  { key: "all", name: "전체" },
  { key: "owned", name: "보유" },
  { key: "locked", name: "잠김" },
];

export default function TuriniDressUp({
  avatar,
  stats,
  saving,
  onSave,
}: {
  avatar: TuriniAvatar;
  stats: AvatarStats;
  saving: boolean;
  onSave: (next: TuriniAvatar) => void;
}) {
  const [draft, setDraft] = useState<TuriniAvatar>(avatar);
  const [slot, setSlot] = useState<AvatarSlot>("hat");
  const [filter, setFilter] = useState<Filter>("all");
  const [saved, setSaved] = useState<TuriniAvatar>(avatar);

  // 계정을 새로 불러오거나 저장이 끝나면 저장된 값으로 맞춥니다.
  if (saved !== avatar) {
    setSaved(avatar);
    setDraft(avatar);
  }

  const unlockedIds = useMemo(() => {
    const set = new Set<string>();
    AVATAR_ITEMS.forEach((item) => {
      if (isItemUnlocked(item, stats)) set.add(item.id);
    });
    return set;
  }, [stats]);

  const slotItems = itemsForSlot(slot);
  const visibleItems = slotItems.filter((item) => {
    if (filter === "owned") return unlockedIds.has(item.id);
    if (filter === "locked") return !unlockedIds.has(item.id);
    return true;
  });

  const dirty = AVATAR_SLOTS.some(({ key }) => draft[key] !== avatar[key]);
  const ownedTotal = unlockedIds.size;

  const choose = (item: AvatarItem) => {
    if (!unlockedIds.has(item.id)) return;
    setDraft((current) => ({
      ...current,
      [item.slot]: current[item.slot] === item.id ? (item.slot === "scene" ? current.scene : null) : item.id,
    }));
  };

  const clearSlot = () => {
    if (slot === "scene") return;
    setDraft((current) => ({ ...current, [slot]: null }));
  };

  return (
    <section className="card-block turini-dress" aria-label="나만의 투리니 꾸미기">
      <div className="turini-dress__head">
        <div>
          <p className="eyebrow">MY TURINI</p>
          <h2>나만의 투리니 꾸미기</h2>
        </div>
        <span className="turini-dress__count">
          보유 {ownedTotal} / {AVATAR_ITEMS.length}
        </span>
      </div>

      <TuriniStage avatar={draft} className="turini-dress__stage--large" />

      <p className="turini-dress__notice">
        <b>개발 확인용 임시 도형</b>
        모자·안경·목·가방·손 소품은 아직 실제 그림이 없어 위치 확인용 도형으로 보여 줍니다. 배경은 색만
        쓰므로 지금이 최종 모습이에요.
      </p>

      <div className="turini-dress__slots" role="tablist" aria-label="꾸미기 부위">
        {AVATAR_SLOTS.map(({ key, name }) => {
          const worn = findItem(draft[key]);
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={slot === key}
              className="turini-dress__slot"
              data-active={slot === key ? "true" : undefined}
              onClick={() => setSlot(key)}
            >
              <span className="turini-dress__slot-art">
                {worn ? <ItemArt item={worn} /> : <i aria-hidden="true">+</i>}
              </span>
              <b>{name}</b>
              <small>{worn ? worn.name : "비어 있음"}</small>
            </button>
          );
        })}
      </div>

      <div className="turini-dress__filters">
        <div role="tablist" aria-label="아이템 보기">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="tab"
              aria-selected={filter === option.key}
              data-active={filter === option.key ? "true" : undefined}
              onClick={() => setFilter(option.key)}
            >
              {option.name}
            </button>
          ))}
        </div>
        {slot !== "scene" ? (
          <button type="button" className="turini-dress__clear" onClick={clearSlot} disabled={!draft[slot]}>
            벗기
          </button>
        ) : null}
      </div>

      {visibleItems.length === 0 ? (
        <p className="turini-dress__empty">
          {filter === "locked" ? "이 부위는 모두 열었어요!" : "아직 열린 아이템이 없어요."}
        </p>
      ) : (
        <ul className="turini-dress__grid">
          {visibleItems.map((item) => {
            const unlocked = unlockedIds.has(item.id);
            const selected = draft[item.slot] === item.id;
            const { current, target } = requirementProgress(item.requirement, stats);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="turini-dress__item"
                  data-state={selected ? "selected" : unlocked ? "owned" : "locked"}
                  onClick={() => choose(item)}
                  disabled={!unlocked}
                  aria-pressed={selected}
                  aria-label={
                    unlocked
                      ? `${item.name}${selected ? " · 착용 중" : ""}`
                      : `${item.name} · 잠김 · ${requirementLabel(item.requirement)}`
                  }
                >
                  <span className="turini-dress__item-art">
                    <ItemArt item={item} />
                    {!unlocked ? (
                      <svg className="turini-dress__item-lock" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M7 10V7.5a5 5 0 0 1 10 0V10"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                        <rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="currentColor" />
                      </svg>
                    ) : null}
                  </span>
                  <b>{item.name}</b>
                  {item.placeholder ? <em className="turini-dress__temp">개발 확인용</em> : null}
                  {unlocked ? (
                    <small>{selected ? "착용 중" : "보유"}</small>
                  ) : (
                    <small className="turini-dress__need">
                      {requirementLabel(item.requirement)}
                      <i>
                        {Math.min(current, target)}/{target}
                      </i>
                    </small>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="turini-dress__save">
        <p>{dirty ? "바꾼 내용이 아직 저장되지 않았어요." : "계정에 저장된 모습이에요."}</p>
        <div>
          <button type="button" className="secondary-button" onClick={() => setDraft(avatar)} disabled={!dirty || saving}>
            되돌리기
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onSave(draft)}
            disabled={!dirty || saving}
          >
            {saving ? "저장 중…" : "저장하기"}
          </button>
        </div>
      </div>
    </section>
  );
}

export { DEFAULT_AVATAR };
