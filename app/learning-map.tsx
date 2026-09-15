"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { categoryDifficultyForLesson } from "./category-progress";
import Turini from "./turini-character";

/**
 * 투리니 금융 성장 지도
 *
 * 화면만 바꾸는 컴포넌트입니다. 레벨 계산·완료 판정·난이도 연결·문제 시작은
 * 전부 바깥(page.tsx, category-progress.ts)에서 그대로 내려받아 씁니다.
 * 이 파일은 받은 값을 어떻게 그릴지만 결정합니다.
 */

/** page.tsx의 finishSession이 정답 1개당 주는 XP. 화면 표시용으로만 씁니다. */
const XP_PER_CORRECT_ANSWER = 10;

/** 노드 사이 세로 간격(px) */
const NODE_GAP = 92;
/** 노드 아래에서 현재 레슨 카드가 시작하는 위치(px) */
const CARD_OFFSET = 58;
/** 카드 아래에 남길 여백(px) */
const CARD_TAIL = 24;
/** 지형 구간이 바뀌는 곳에 이름표를 놓을 여유 높이(px) */
const BAND_SPACE = 26;
/** 정상 노드 위에 깃발·축하 장면을 놓을 여유 높이(px) */
const SUMMIT_SPACE = 60;
/** 현재 노드 바로 위에 '공부하는 투리니' 쉼터를 놓을 여유 높이(px) */
const REST_SPACE = 76;
const TOP_PAD = 84;
const BOTTOM_PAD = 78;
/** 경로가 좌우로 흔들리는 폭 (가로 % 기준) */
const SWAY = 21;
/** 곡선 주기 — 값이 클수록 더 완만합니다 */
const SWAY_PERIOD = 2.6;

type LessonState = "done" | "current" | "locked";
type LessonKind = "lesson" | "checkpoint" | "summit";

type MapNode = {
  level: number;
  x: number;
  y: number;
  state: LessonState;
  kind: LessonKind;
  difficulty: string;
  /** 설명 글을 노드의 어느 쪽에 붙일지 — 항상 지도 안쪽을 향합니다. */
  side: "left" | "right";
};

/** 난이도가 바뀌는 지점을 그대로 지형 구간으로 씁니다. */
const TERRAIN: Record<string, { key: string; name: string; note: string }> = {
  초급: { key: "seed", name: "씨앗 들판", note: "개념의 씨앗을 심어요" },
  중급: { key: "growth", name: "성장 언덕", note: "굴리는 방법을 익혀요" },
  고급: { key: "harvest", name: "결실 고원", note: "스스로 판단해요" },
};

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  const parts = [`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const prev = points[i - 1] ?? points[i];
    const from = points[i];
    const to = points[i + 1];
    const next = points[i + 2] ?? to;
    const t = 0.3;
    const c1x = from.x + (to.x - prev.x) * t;
    const c1y = from.y + (to.y - prev.y) * t;
    const c2x = to.x - (next.x - from.x) * t;
    const c2y = to.y - (next.y - from.y) * t;
    parts.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`,
    );
  }
  return parts.join(" ");
}

export type LearningMapProps = {
  categoryName: string;
  /** CATEGORY_COLORS의 키 (green/purple/orange/red/teal/blue) */
  theme: string;
  categoryIcon: string;
  totalLessons: number;
  questionsPerLesson: number;
  /** 이 카테고리에서 푼 고유 문항 수 */
  solvedQuestions: number;
  /** 완료한 레슨 수 (바깥에서 계산해 내려줍니다) */
  completedLessons: number;
  /** 지금 학습할 레슨 번호. 모두 끝냈으면 null (바깥에서 계산해 내려줍니다) */
  currentLesson: number | null;
  onStartLesson: (lesson: number) => void;
};

export default function LearningMap({
  categoryName,
  theme,
  categoryIcon,
  totalLessons,
  questionsPerLesson,
  solvedQuestions,
  completedLessons,
  currentLesson,
  onStartLesson,
}: LearningMapProps) {
  const currentStopRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** 현재 레슨 카드의 실제 높이. 글자가 줄바꿈돼도 아래 노드와 겹치지 않게 재서 씁니다. */
  const [cardHeight, setCardHeight] = useState(232);

  const currentLevel = currentLesson;
  const hasRestStop = currentLevel !== null && currentLevel > 1;

  const { nodes, height, bands, fullPath, walkedPath, restY } = useMemo(() => {
    const cardSpace = cardHeight + CARD_OFFSET + CARD_TAIL + 33 - NODE_GAP;
    const list: MapNode[] = [];
    let y = TOP_PAD;

    for (let index = 0; index < totalLessons; index += 1) {
      const level = index + 1;
      // page.tsx가 쓰던 판정식과 같습니다.
      const isDone = level <= completedLessons;
      const isCurrent = level === currentLevel;
      const state: LessonState = isDone ? "done" : isCurrent ? "current" : "locked";
      const kind: LessonKind =
        level === totalLessons ? "summit" : level % 4 === 0 ? "checkpoint" : "lesson";
      const x = 50 + SWAY * Math.sin((index * Math.PI) / SWAY_PERIOD);
      const difficulty = categoryDifficultyForLesson(level);

      // 지형이 바뀌는 곳과 쉼터 자리는 노드 위에 미리 비워 둡니다.
      if (index > 0 && difficulty !== categoryDifficultyForLesson(level - 1)) y += BAND_SPACE;
      if (isCurrent && hasRestStop) y += REST_SPACE;

      list.push({
        level,
        x,
        y,
        state,
        kind,
        difficulty,
        side: x > 50 ? "left" : "right",
      });

      y += NODE_GAP;
      if (isCurrent) y += Math.max(0, cardSpace);
      if (level === totalLessons - 1) y += SUMMIT_SPACE;
    }

    // 난이도가 바뀌는 지점마다 지형 구간을 끊습니다.
    const groups: { difficulty: string; from: number; to: number; top: number; bottom: number }[] = [];
    list.forEach((node, index) => {
      const last = groups[groups.length - 1];
      if (last && last.difficulty === node.difficulty) {
        last.to = node.level;
        return;
      }
      groups.push({
        difficulty: node.difficulty,
        from: node.level,
        to: node.level,
        // 노드 사이 빈 자리 한가운데 — 카드나 쉼터가 앞에 있어도 항상 비어 있습니다.
        top: index === 0 ? 34 : node.y - (NODE_GAP + BAND_SPACE) / 2,
        bottom: node.y,
      });
    });
    const mapHeight = list[list.length - 1].y + BOTTOM_PAD;
    groups.forEach((group, index) => {
      group.bottom = index === groups.length - 1 ? mapHeight : groups[index + 1].top;
    });

    const currentIndex = currentLevel ? currentLevel - 1 : list.length - 1;
    const walkedCount = Math.min(list.length, currentIndex + 1);
    return {
      nodes: list,
      height: mapHeight,
      bands: groups,
      fullPath: smoothPath(list),
      walkedPath: walkedCount >= 2 ? smoothPath(list.slice(0, walkedCount)) : "",
      restY:
        hasRestStop && currentIndex > 0
          ? (list[currentIndex - 1].y + list[currentIndex].y) / 2
          : null,
    };
  }, [totalLessons, completedLessons, currentLevel, hasRestStop, cardHeight]);

  // 카드 높이를 실제로 재서, 아래 노드와 겹치지 않도록 간격을 맞춥니다.
  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const measured = element.offsetHeight; // 테두리·안쪽 여백까지 포함한 실제 높이
      setCardHeight((previous) => (Math.abs(previous - measured) > 2 ? measured : previous));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentLevel]);

  const currentNode = nodes.find((node) => node.state === "current");
  const allDone = completedLessons >= totalLessons;
  const maxXp = questionsPerLesson * XP_PER_CORRECT_ANSWER;

  const scrollToCurrent = () => {
    const target = currentStopRef.current;
    if (!target) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  const unlockHint = (level: number) => {
    const needed = (level - 1) * questionsPerLesson - solvedQuestions;
    if (needed > 0 && level === completedLessons + 2) return `${needed}문항 더 풀면 열려요`;
    return `Lv.${level - 1} 완료 시`;
  };

  const kindName = (kind: LessonKind) =>
    kind === "summit" ? "정상 도전" : kind === "checkpoint" ? "구간 점검" : "레슨";

  const nodeLabel = (node: MapNode) => {
    const base = `${categoryName} ${kindName(node.kind)} ${node.level}`;
    if (node.state === "done") return `${base} · 완료 · 다시 풀기`;
    if (node.state === "current") return `${base} · 현재 학습 · 시작하기`;
    return `${base} · 잠김 · ${unlockHint(node.level)}`;
  };

  return (
    <section className="turini-map" data-map-theme={theme} aria-label={`${categoryName} 학습 지도`}>
      <header className="turini-map__head">
        <div className="turini-map__crest" aria-hidden="true">
          {categoryIcon}
        </div>
        <div className="turini-map__headline">
          <p className="turini-map__eyebrow">{categoryName} 모험</p>
          <h2>{allDone ? "모든 구간을 정복했어요" : `${completedLessons} / ${totalLessons} 구간 통과`}</h2>
        </div>
        {currentNode ? (
          <button type="button" className="turini-map__jump" onClick={scrollToCurrent}>
            이어서 학습
          </button>
        ) : null}
      </header>

      <ol className="turini-map__legend" aria-label="구간별 진행">
        {bands.map((band) => {
          const terrain = TERRAIN[band.difficulty] ?? TERRAIN["초급"];
          const sizeOfBand = band.to - band.from + 1;
          const doneInBand = Math.min(sizeOfBand, Math.max(0, completedLessons - (band.from - 1)));
          return (
            <li key={band.difficulty} data-terrain={terrain.key}>
              <b>{terrain.name}</b>
              <span>{band.difficulty}</span>
              <i
                aria-hidden="true"
                style={{ ["--fill" as string]: `${(doneInBand / sizeOfBand) * 100}%` } as CSSProperties}
              />
              <small>
                {doneInBand}/{sizeOfBand} 완료
              </small>
            </li>
          );
        })}
      </ol>

      <div className="turini-map__field" style={{ height: `${height}px` }}>
        <div className="turini-map__terrain" aria-hidden="true">
          {bands.map((band) => {
            const terrain = TERRAIN[band.difficulty] ?? TERRAIN["초급"];
            return (
              <div
                key={`band-${band.from}`}
                className="turini-map__band"
                data-terrain={terrain.key}
                style={{ top: `${band.top}px`, height: `${band.bottom - band.top}px` }}
              >
                <span className="turini-map__band-tag">
                  {terrain.name} · {band.difficulty}
                </span>
              </div>
            );
          })}
        </div>

        <svg
          className="turini-map__trail"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="turini-map__trail-base" d={fullPath} vectorEffect="non-scaling-stroke" />
          {walkedPath ? (
            <path
              className="turini-map__trail-walked"
              d={walkedPath}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>

        {restY !== null ? (
          <div className="turini-map__scene" style={{ top: `${restY}px` }} aria-hidden="true">
            <Turini state="reading" className="turini-map__figure" decorative />
            <span className="turini-map__scene-label">공부 쉼터</span>
          </div>
        ) : null}

        {nodes.map((node) => {
          const isCurrent = node.state === "current";
          return (
            <div
              key={node.level}
              className="turini-map__stop"
              style={{ top: `${node.y}px`, left: `${node.x}%` }}
              ref={isCurrent ? currentStopRef : undefined}
            >
              {isCurrent ? (
                <div className="turini-map__walker" data-side={node.side} aria-hidden="true">
                  <Turini state="idle" className="turini-map__figure" decorative />
                </div>
              ) : null}

              {node.kind === "summit" ? (
                <div className="turini-map__summit" aria-hidden="true">
                  {allDone ? (
                    <Turini state="celebrate" className="turini-map__figure" decorative />
                  ) : (
                    <span className="turini-map__flag">⚑</span>
                  )}
                </div>
              ) : null}

              <button
                type="button"
                className="turini-map__node"
                data-state={node.state}
                data-kind={node.kind}
                onClick={() => node.state !== "locked" && onStartLesson(node.level)}
                disabled={node.state === "locked"}
                aria-label={nodeLabel(node)}
                title={node.state === "locked" ? unlockHint(node.level) : undefined}
              >
                <span className="turini-map__node-face">
                  {node.state === "done" ? (
                    <b className="turini-map__star" aria-hidden="true">
                      ★
                    </b>
                  ) : node.state === "locked" ? (
                    <svg className="turini-map__lock" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M7 10V7.5a5 5 0 0 1 10 0V10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                      <rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="currentColor" />
                    </svg>
                  ) : (
                    <b className="turini-map__level" aria-hidden="true">
                      {node.level}
                    </b>
                  )}
                </span>
              </button>

              {!isCurrent ? (
                <p
                  className="turini-map__caption"
                  data-state={node.state}
                  data-side={node.side}
                  aria-hidden="true"
                >
                  <b>{node.kind === "lesson" ? `Lv.${node.level}` : kindName(node.kind)}</b>
                  {node.state === "locked" ? <small>{unlockHint(node.level)}</small> : null}
                  {node.state === "done" ? <small>완료</small> : null}
                </p>
              ) : null}
            </div>
          );
        })}

        {currentNode ? (
          <div
            className="turini-map__current"
            ref={cardRef}
            style={{ top: `${currentNode.y + CARD_OFFSET}px` }}
          >
            <div className="turini-map__current-top">
              <span className="turini-map__current-tag">지금 여기</span>
              <span className="turini-map__current-diff">{currentNode.difficulty}</span>
            </div>
            <h3>
              {categoryName}{" "}
              {currentNode.kind === "lesson"
                ? `레슨 ${currentNode.level}`
                : kindName(currentNode.kind)}
            </h3>
            <ul className="turini-map__current-meta">
              <li>
                <span>문제</span>
                <b>{questionsPerLesson}문항</b>
              </li>
              <li>
                <span>받을 XP</span>
                <b>최대 {maxXp}</b>
              </li>
            </ul>
            <button
              type="button"
              className="primary-button turini-map__start"
              onClick={() => onStartLesson(currentNode.level)}
            >
              시작하기
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
