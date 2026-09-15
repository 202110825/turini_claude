# 투리니 캐릭터 · 학습화면 상용화 분석 보고서 (코드 수정 전)

분석 대상: `C:\Users\ggyil\Desktop\turini-web\Turini_App_V10_3`
스택: Next.js 16.2.6 / React 19 / Tailwind 4 / Neon Postgres · 단일 페이지 `app/page.tsx` (75KB) + `app/globals.css` (85KB)

> **확인 필요 1** — 말씀하신 `Turini_App_V10_COMMERCIAL_ASSET_PLANNER.zip` 파일은 이 대화에 첨부되지 않았고, 연결된 폴더에서도 보이지 않습니다. 대신 세션에 연결된 `Turini_App_V10_3` 폴더를 기준으로 분석했습니다(자산 플래너 `app/wealth-planner.ts`가 포함되어 있어 같은 빌드로 추정). 다른 파일이라면 알려주세요.

---

## 1. 현재 캐릭터 이미지와 사용 위치

### 1-1. 파일 4개가 전부입니다

| 파일 | 용량 | 캔버스 | 실제 그림 영역 | 알파 |
| --- | ---: | --- | --- | --- |
| `turini-mascot-sheet.png` | 2.31 MB | 1402×1122 | 전면 | **없음(흰 배경 + 한글 캡션 인쇄됨)** |
| `turini-wave-transparent.png` | 0.65 MB | 1099×1431 | 721×1085 @(186, 93) | 있음 |
| `turini-reading-transparent.png` | 0.54 MB | 1254×1254 | 573×967 @(367, 101) | 있음 |
| `turini-thinking-transparent.png` | 0.56 MB | 1402×1122 | 867×814 @(239, 150) | 있음 |

`.rive`, `.json(Lottie)`, SVG 캐릭터, 개별 파츠 이미지는 **하나도 없습니다.** `package.json`에도 애니메이션 라이브러리 의존성이 없습니다.

### 1-2. 코드에서의 사용 구조

React 컴포넌트 2개가 전부이고, 둘 다 **빈 `<span>`에 CSS `background-image`를 까는 방식**입니다 (`app/page.tsx` 250–256행).

```tsx
function Mascot({ pose, size, className })        // 스프라이트 시트 잘라쓰기
function CharacterArt({ pose, className })        // 투명 PNG 3종
```

| 포즈 | 파일 | 호출 횟수 | 사용 화면 |
| --- | --- | ---: | --- |
| `wave` | wave PNG | 6 | 온보딩(666), 레슨 결과(758), 홈 히어로(785), 포트폴리오 인트로(827), 로그인 브랜드(939), 포트폴리오 결과(1112) |
| `reading` | reading PNG | 6 | 로딩(654), 학습 배너(803), **마이페이지 프로필(860)**, 돈흐름 팁(1080), 코치 배너(1115), GPT 코치(1118) |
| `thinking` | thinking PNG | 3 | **퀴즈 풀이 전(735)**, 미래자산 배너(789), 자산 플래너(1037) |
| `Mascot correct/wrong` | 시트 크롭 | 1 | **퀴즈 정답/오답 피드백(734)** |

### 1-3. 중요한 발견 — 스프라이트 시트는 사실상 죽어 있습니다

CSS에는 `.mascot-wave / -reading / -coach / -celebrate / -study` 크롭 좌표가 정의돼 있지만, **JSX에서 `<Mascot>`은 딱 1번(퀴즈 정답/오답)만 호출**됩니다. 나머지는 전부 미사용 규칙입니다.

즉 **2.31MB 시트 전체가 "정답 팻말 / 오답 팻말" 두 컷 때문에 모든 화면에서 다운로드**되고 있습니다.

같은 이유로 아래 CSS는 전부 죽은 코드입니다 (JSX가 `.character-art`를 렌더하는데 셀렉터는 `.mascot`을 가리킴):

- `.sidebar-mascot` (31행) — `sidebar-mascot` 클래스가 page.tsx에 없음
- `.profile-mascot-frame .mascot` (343행), `.learning-banner .mascot` (290·319행), `.portfolio-intro .mascot` (290·328행)
- `.mascot-coach / -study / -celebrate / -reading / -wave` (72–77행)

---

## 2. 캐릭터가 잘리고 둥둥 떠 보이는 원인 (근본 원인 4가지)

### 원인 A — 스프라이트를 고정 px로 잘라 쓰고 있어 필연적으로 잘립니다

`.mascot`은 `background-size`를 **고정 px(911×729)** 로 박아두고, 박스 크기만 88/130/170px로 바꿉니다. 박스가 커질수록 잘리는 게 아니라 **옆 그림과 한글 캡션이 딸려 들어옵니다.**

실제 렌더 결과를 그대로 재현한 이미지가 `turini-evidence/01_sprite_crop_all_sizes.png`입니다.

- `small(88×92)`: 모든 포즈가 **목·가슴에서 절단**. 팔다리가 아예 없음
- `medium(130×150)`: `coach`에 "아이디어!" 글자와 옆 칸 그림이 침범
- `large(170×190)`: `coach`에 옆 칸 말풍선("너라면 할 수 있어!")과 아래 아이콘 줄(타겟·돼지저금통)까지 들어옴, `study`에 "공부 중" 글자 + 코인 아이콘 침범

### 원인 B — 퀴즈 정답/오답 캐릭터도 다리가 잘리고 캡션이 노출됩니다

증거 이미지 `turini-evidence/02_quiz_feedback_crop.png`. 세 가지 크롭 좌표가 CSS에 중복 정의돼 있습니다.

| 규칙 | 위치 | 결과 |
| --- | --- | --- |
| `.mascot-correct/-wrong` @ `-350px` | globals.css 74–75 | 오답 캐릭터의 **왼손 끝이 왼쪽 모서리에서 잘림** |
| `.quiz-mascot.answered` @ `-359px` | globals.css 1007–1008 (데스크톱) | **양다리·발이 하단에서 절단** |
| `.quiz-mascot.answered` @ `-365px` | globals.css 259–260 (모바일) | 하단에 **"정답!" / "답! 다시 해볼까?" 한글 캡션이 그대로 노출** |

### 원인 C — "둥둥 뜨는" 진짜 이유는 PNG 안의 빈 여백입니다

투명 PNG 3장은 캔버스 안에 그림이 작게 들어 있고, 아래쪽에 큰 빈 공간이 있습니다. CSS는 `background-size: contain`이라 **이 빈 여백까지 박스 안에 그대로 렌더**됩니다. 결과적으로 캐릭터가 박스 바닥에서 떠 있고, 발이 닿을 지면이 없습니다.

| 배치 | 박스 | 캐릭터 실제 높이 | 박스 안 좌우/하단 빈 공간 |
| --- | --- | ---: | --- |
| 홈 히어로 `.hero-mascot .character-art` | 170×205 | 155 px | 하단 **36 px** |
| 퀴즈 풀이 전 `.quiz-mascot .character-art` | 142×132 | 83 px (박스의 **63%**) | 하단 16 px |
| 학습 배너 `.learning-banner .character-art` | 142×174 | 109 px, **가로 65 px(박스의 46%)** | 하단 37 px |
| 마이페이지 `.profile-mascot-frame .character-art` | 140×168 | 105 px, 가로 62 px | 상·하 각 16 px 이상 |

게다가 세 PNG의 캔버스 비율이 **0.77 / 1.00 / 1.25로 제각각**이라, 같은 크기 박스에 넣어도 포즈마다 크기와 지면 높이가 달라 보입니다. 이게 "포즈를 바꾸면 캐릭터가 커졌다 작아졌다 한다"의 원인입니다.

### 원인 D — 호흡 애니메이션에 접지 신호가 없습니다

```css
.character-art {
  filter: drop-shadow(0 12px 12px rgba(48,83,58,.12));
  animation: turini-breathe 3.4s ease-in-out infinite;   /* translateY(-5px) + rotate */
}
```

`filter`로 만든 그림자가 **캐릭터와 함께 위아래로 움직입니다.** 캐릭터와 그림자의 거리가 항상 일정 → 물리적으로 "공중에 매달린 물체"의 신호입니다. 진짜 접지감은 **그림자를 별도 레이어로 분리해 바닥에 고정하고, 캐릭터가 뜰 때 그림자를 작고 옅게** 만들어야 나옵니다.

### 원인 E — 좁은 화면에서 실제로 잘리는 컨테이너들

| 위치 | 문제 |
| --- | --- |
| `.profile-hero { overflow: hidden }` (241행) + `.profile-mascot-frame { overflow: hidden }` (342행) | 모바일(≤560px) 마이페이지에서 캐릭터 **하드 클리핑** (데스크톱 859행에서만 `visible`로 덮임) |
| `.current-lesson` (151행) | 320px 화면에서 카드 우측이 **약 43px 화면 밖으로 넘침** (`left: calc(50% + 50px)` + `width: 135px` > 콘텐츠 폭 284px) |
| `.quiz-mascot.waiting` (257행) | `grid 150px + 말풍선 white-space: nowrap` → 320px에서 **가로 오버플로** |
| `.hero-mascot { margin-right: -35px }` (290행) 등 음수 마진 5곳 | 카드 밖으로 밀어내 잘림 유도 |

---

## 3. 현재 이미지로 가능한 움직임 / 불가능한 움직임

현재 PNG는 **완전히 평평한 1장짜리 래스터**입니다. 눈·입·팔·다리가 픽셀 단위로 몸통에 붙어 있어 분리할 수 없습니다.

### ✅ 지금 파일로 바로 가능 (추가 에셋 0)

- 전신 호흡 / 바운스 / 좌우 흔들림 (`transform` 기반)
- 스쿼시 & 스트레치 (`scaleX/scaleY` 반대 방향 — 착지 순간 납작하게)
- 정답 시 팝 인, 오답 시 좌우 셰이크
- **바닥 그림자를 별도 `<div>` 타원으로 분리** → 접지감 확보 (이것만으로 "둥둥" 느낌 70% 해소)
- 포즈 간 크로스페이드 전환 (wave ↔ thinking ↔ reading)
- 소품·파티클(별, 코인, 컨페티)을 CSS로 따로 얹기

### ⚠️ 조건부 가능

- **표정 전환**: 스프라이트 시트 2행의 얼굴 5종(기쁨/윙크/생각/놀람/걱정)을 개별 투명 PNG로 추출하면 "얼굴 교체" 가능. 단 이 얼굴들은 **목 아래가 없어 몸통과 접합선이 맞지 않습니다.** → 원형 프로필 아이콘·말풍선 아바타 용도로만 사용 권장, 전신 캐릭터 얼굴 교체용으로는 부적합.

### ❌ 현재 이미지로 불가능 — 억지로 하면 안 되는 것

| 요청 | 왜 안 되는가 |
| --- | --- |
| 눈 깜박임 | 눈이 몸통과 한 픽셀로 붙어 있음. CSS 마스크로 가리면 **눈 주변 볼·주근깨까지 함께 지워짐** |
| 입 움직임 | 동일. `clip-path`로 입만 잘라 늘리면 **주둥이와 코가 함께 찌그러짐** |
| 고개 돌리기/끄덕임 | 머리만 회전시키면 목 접합부가 끊어져 보임. 목 뒤쪽 픽셀이 없어 회전 시 빈 구멍 발생 |
| 팔 흔들기 | 어깨 관절이 없음. 팔 영역을 회전시키면 몸통에 사각형 자국이 남음 |
| 걷기(다리 교대) | 다리 2개가 몸통과 한 덩어리. 분리 불가 |

**결론: PNG를 늘이거나 잘라서 흉내 내는 방식은 채택하지 않습니다.** 레이어 이미지를 받아야 합니다.

---

## 4. 필요한 분리 이미지 · Rive/Lottie 판단

### 4-1. 권장안 — **PNG 레이어 리깅** (Rive 불필요, 1순위)

레이어 PNG만 있으면 CSS `transform` + `@keyframes`만으로 눈 깜박임·입 움직임·팔·고개·다리 전부 구현됩니다. 추가 라이브러리 0, 번들 증가 0, `prefers-reduced-motion` 대응도 그대로 유지됩니다.

**공통 규격 (반드시 지켜야 리깅이 성립합니다)**

- 모든 레이어 **동일 캔버스 크기 · 동일 원점**으로 내보내기 (예: 1200×1600 PNG-24 + 알파)
- 캔버스 안에서 **캐릭터가 실제로 꽉 차게** (여백은 CSS에서 줌 — 지금처럼 PNG 안에 여백을 넣으면 안 됨)
- 파일명 규칙: `turini-<pose>-<part>.png`
- 관절 부위는 **10~15px 오버랩**을 남겨서 회전 시 틈이 안 벌어지게

**필수 레이어 세트 (기본 리그 1벌)**

| # | 레이어 | 내용 | 필수 여부 |
| ---: | --- | --- | --- |
| 1 | `body` | 몸통 + 배 + 꼬리 (머리·팔·다리 제외) | 필수 |
| 2 | `head` | 머리·뿔·나뭇잎 (눈·입·눈썹 뺀 상태), **목 아래 15px 여유 포함** | 필수 |
| 3 | `eyes-open` | 눈 2개 (흰자 + 동공 + 하이라이트) | 필수 |
| 4 | `eyes-closed` | 감은 눈 (아래로 휜 선 2개) | 필수 — 깜박임용 |
| 5 | `pupils` | 동공만 (흰자와 분리) | 선택 — 시선 추적용 |
| 6 | `mouth-closed` | 다문 입 | 필수 |
| 7 | `mouth-open-s` | 작게 벌린 입 | 필수 — 말하기 루프 |
| 8 | `mouth-open-l` | 크게 벌린 입 (혀 보임) | 필수 |
| 9 | `brows` | 눈썹 2개 | 선택 — 표정 강화 |
| 10 | `arm-left` / `arm-right` | 팔 각 1장, **어깨 피벗 포함** | 필수 |
| 11 | `leg-left` / `leg-right` | 다리 각 1장, **골반 피벗 포함** | 필수 |
| 12 | `ear-left` / `ear-right` | 귀 2장 | 선택 — 귀 쫑긋 |
| 13 | `shadow` | 바닥 타원 그림자 단독 | **필수 — 접지감의 핵심** |
| 14 | `backpack` | 초록 가방 (몸통 뒤 레이어) | 필수 |

→ 필수만 **12장**, 권장 전체 **17장**

**소품 (퀴즈 상태 유지에 필요 — 각각 투명 PNG 1장)**

| 소품 | 용도 |
| --- | --- |
| `prop-sign-correct` | **초록색 체크 팻말** (정답) |
| `prop-sign-wrong` | **빨간색 X 팻말** (오답) |
| `prop-bulb` | 전구 (생각 중) |
| `prop-book` | 초록 책 (학습) |
| `prop-flag` | MISSION CLEAR 깃발 (학습 완료) |
| `prop-coin` | 코인 |

**추가 필요 — 축하 포즈**

현재 "학습 완료" 화면은 `wave`(인사) PNG를 쓰고 있습니다. 시트 3행의 **"레벨 업!" 만세 포즈**가 축하 포즈인데 코드에서 안 쓰입니다. → 만세 포즈용 `arm-left/arm-right` 대체 레이어 2장 추가 필요.

### 4-2. Rive / Lottie는 언제 필요한가

| 항목 | 판단 |
| --- | --- |
| **Rive** | 캐릭터 상태머신(정답↔오답↔생각↔축하 전환, 시선 추적, 인터랙티브 반응)을 제대로 하려면 최적. 벡터라 **모든 해상도에서 절대 안 잘림**. 런타임 약 200KB(wasm). **다만 지금 단계에서는 불필요** — PNG 레이어로 목표 모션이 전부 커버됩니다. 졸업 발표 이후 고도화 옵션으로 보류 권장 |
| **Lottie** | 캐릭터 리깅에는 부적합(관절 제어가 CSS보다 불편). 단, **컨페티 폭발 / 코인 획득 / 레벨업 광선** 같은 일회성 이펙트는 Lottie가 깔끔. 이건 캐릭터와 무관하므로 나중에 독립 추가 가능 |
| **SVG** | 캐릭터를 SVG로 다시 그리면 잘림·용량 문제가 근본 해결되지만 **원화 리드로잉 비용**이 큼. 비권장 |

### 4-3. 부가 요청: 2배 해상도 불필요

현재 PNG는 이미 1000px 이상이라 레티나 대응은 충분합니다. 오히려 **레이어별로 500~800px로 줄여 내보내는 편**이 총 용량(현재 4.1MB)을 줄입니다.

---

## 5. 학습 화면을 "학습 지도"로 바꾸는 방법

### 현재 구조 (`app/page.tsx` 805–811행)

12개 `path-row`를 세로로 쌓고 `transform: translateX(±46px)`로 지그재그. 노드는 `72×65px` 타원(`border-radius:50%`인데 정사각형이 아니라 원이 아님). 배경은 점선 세로줄 하나.

### 제안 — "투리니의 금융 섬" (듀오링고 복제 회피)

듀오링고는 *균일한 원형 노드 + 수직 지그재그* 입니다. 투리니는 세 가지로 확실히 갈라놓습니다.

**① 곡선 경로 (SVG `<path>`)** — 고정 px `translateX` 대신 `viewBox` 기반 SVG 곡선을 그리고, 노드를 경로 위 정규화 좌표(0~1)에 배치합니다.

- 320px든 데스크톱이든 **비율만 유지되어 절대 화면 밖으로 안 나감** (원인 E의 오버플로 동시 해결)
- 완료 구간은 `stroke-dasharray` 애니메이션으로 길이 색칠, 잠긴 구간은 회색 점선

**② 구간별 지형 테마** — 이미 `CATEGORY_COLORS` 6색이 있습니다. 카테고리마다 길 색·배경 언덕·식생을 바꿔 **6개 섬**처럼 보이게 합니다. (주식=초록 들판 / 채권=보라 언덕 / 펀드ETF=주황 사막 / 위험관리=빨강 화산 / 분산투자=청록 바다 / 수익률=파랑 설산)

**③ 노드 모양이 학습 내용을 말해줌** — 전부 똑같은 동그라미를 쓰지 않습니다.

| 노드 | 모양 | 조건 |
| --- | --- | --- |
| 일반 레슨 | 나무 스탬프 원형 | 기본 |
| 체크포인트 | 육각 배지 | 레벨 3·6·9 (3의 배수) |
| 최종 | 트로피 깃발 | 레벨 12 |
| 잠김 | 자물쇠 + 채도 낮춤 | `locked` |

**④ 투리니 아바타 마커** — 현재 레벨 노드 위에 작은 투리니가 서 있고, 레슨을 깨면 경로를 따라 다음 노드로 **걸어서 이동**(3-①의 다리 레이어 활용). 마이페이지에서 꾸민 복장이 여기에도 반영됩니다.

**⑤ 장식 재활용** — 시트 4행의 아이콘 8종(코인·다이아·차트·타겟·돼지저금통·새싹·방패)을 경로 주변 장식으로 배치. 추가 에셋 없이 지도가 풍성해집니다.

### 유지되는 것 (건드리지 않음)

`startLesson(category, level)`, `completed / current / locked` 판정, `MAX_CATEGORY_LEVEL`, `activeCategoryCompletedLessons` — **계산 로직은 손대지 않고 렌더링만 교체**합니다.

---

## 6. 마이페이지 "나만의 투리니 꾸미기" 구조

### 6-1. 데이터 — DB 마이그레이션 · API 변경 없이 가능합니다

`turini_users.progress`가 **스키마 없는 JSONB**이고, `hydrateAccount`가 `{...DEFAULT_PROGRESS, ...savedProgress}`로 통째 병합, 저장은 `PUT /api/account`가 `progress` 전체를 그대로 덮어씁니다(`app/page.tsx` 374–381행).

→ **`Progress` 타입에 `avatar` 한 필드만 추가하면 서버 저장이 자동으로 따라옵니다.**

```ts
type TuriniAvatar = {
  hat: string | null;        // 아이템 id
  scarf: string | null;
  bag: string | null;
  prop: string | null;       // 손에 든 소품
  scene: string;             // 배경 id (기본 "meadow")
  pose: "wave" | "reading" | "thinking" | "celebrate";
};
// DEFAULT_PROGRESS에 avatar: DEFAULT_AVATAR 추가
```

### 6-2. 해금 로직 — 새 데이터 저장 없이 순수 함수로

기존 지표(`xp`, `streak`, `completedIds.length`, `completedLessons`, `financeLevel`, `tendency`, 카테고리별 진도)에서 **파생 계산**합니다. 해금 목록을 따로 저장하지 않으므로 **데이터 불일치 위험이 없습니다.**

| 아이템 예시 | 해금 조건 (기존 값에서 계산) |
| --- | --- |
| 새싹 모자 | 첫 레슨 완료 |
| 졸업 모자 | 한 카테고리 Lv.12 |
| 금화 목도리 | XP 1000 |
| 불꽃 배지 | 연속 학습 7일 |
| 방패 가방 | 위험 관리 카테고리 60문항 |
| 야경 배경 | 6개 카테고리 모두 Lv.3 이상 |

### 6-3. 렌더링

꾸미기 아이템은 4-1의 **레이어 규격과 똑같은 캔버스**로 만든 투명 PNG를 캐릭터 위에 절대배치합니다. 레이어 순서:

```
scene(배경) → shadow → bag → arm-back → body → leg L/R → head → ear → eyes → brows → mouth → scarf → hat → arm-front → prop
```

### 6-4. 화면 구성

- `profile-hero`를 **"나의 투리니" 무대**로 확장 (현재 `overflow:hidden` 제거 필요 — 원인 E)
- 하단에 탭: `모자 / 목도리 / 가방 / 소품 / 배경`
- 잠긴 아이템은 회색 + **해금 조건 텍스트 노출** (학습 동기 유발)
- 변경 즉시 미리보기 → 기존 자동 저장 effect가 서버에 반영

### 6-5. ⚠️ 반드시 지켜야 할 제약

`tests/public-release.test.mjs`에 **`assert.doesNotMatch(pageSource, /localStorage\.setItem/)`** 가 있습니다. 꾸미기 상태를 localStorage에 저장하면 **테스트가 깨집니다.** 반드시 `progress` → 서버 저장 경로만 사용합니다.

---

## 7. 수정 파일 목록과 작업 순서

### Phase 0 — 에셋 준비 (코드 수정 0줄)
- `public/assets/` 에 4-1 레이어 세트 추가
- 기존 4개 파일은 **삭제하지 않고 유지** (롤백 경로 확보)

### Phase 1 — 잘림·부유 즉시 수정 ⭐ 효과 대비 위험 가장 낮음
| 파일 | 작업 |
| --- | --- |
| `app/globals.css` | `.character-art` 박스 비율을 이미지 비율에 맞춤, 음수 마진 5곳 제거, `overflow:hidden` 2곳 해제, `.current-lesson` 오버플로 수정, `.quiz-mascot.waiting` 말풍선 `nowrap` 해제 |
| `app/globals.css` | `drop-shadow` 제거 → 별도 `shadow` 레이어로 접지 그림자 |
| `app/page.tsx` | (선택) `CharacterArt`에 `<span class="turini-shadow">` 1줄 추가 |

이 단계만으로 "잘림 + 둥둥"의 상당 부분이 해소됩니다. **레이어 에셋이 늦어져도 먼저 진행 가능합니다.**

### Phase 2 — 캐릭터 리깅 & 모션
| 파일 | 작업 |
| --- | --- |
| `app/turini-character.tsx` (신규) | 레이어 합성 + 상태(idle/thinking/correct/wrong/celebrate) 컴포넌트 |
| `app/turini-character.css` (신규) | 깜박임·입·팔·고개 keyframes, `prefers-reduced-motion` 대응 |
| `app/page.tsx` | `CharacterArt` 15곳 + `Mascot` 1곳 **호출부만 치환** (로직 무관) |
| `app/globals.css` | 구 `.mascot-*` 죽은 규칙 정리 (Phase 2 끝난 뒤에만) |

### Phase 3 — 학습 지도
| 파일 | 작업 |
| --- | --- |
| `app/learning-map.tsx` (신규) | SVG 경로 + 노드 배치 (props로 `completed/current/locked/onStart`만 받음) |
| `app/learning-map.css` (신규) | 지형 테마 6종 |
| `app/page.tsx` | `view === "learn"` 블록의 **렌더링만** 교체, `startLesson` 호출 시그니처 유지 |

### Phase 4 — 나만의 투리니 꾸미기
| 파일 | 작업 |
| --- | --- |
| `app/avatar-items.ts` (신규) | 아이템 정의 + 순수 해금 함수 |
| `tests/avatar-items.test.mjs` (신규) | 해금 규칙 단위 테스트 |
| `app/page.tsx` | `Progress` 타입 + `DEFAULT_PROGRESS` + `profile` 뷰 확장 |
| `app/globals.css` | 꾸미기 UI 스타일 |

### Phase 5 — 반응형 QA
320 / 390 / 768 / 1280px 전 화면에서 **귀·뿔·팔·다리·소품 비잘림** 검증, `npm test` + `npm run build` 통과 확인.

---

## 8. 기존 기능이 망가질 가능성이 있는 지점

### 8-1. 자동 테스트가 문자열을 직접 검사합니다 🔴 최고 위험

`tests/public-release.test.mjs`는 `app/page.tsx`를 **정규식으로 검사**합니다. 아래 문자열은 **한 글자도 바꾸면 안 됩니다.**

```
안녕하세요, {account.username}님        진단 테스트 시작하기
onClick={startDiagnosis}                 progress.financeLevel === "진단 전" && !session && !result
fetch("/api/account"   method: "PUT"     turini-public-progress-v1 / -portfolio-v1
fetch("/api/portfolio-feedback"          asset-info-button
portfolioRuleVersion: PORTFOLIO_RULE_VERSION
종목·업종 내부 집중은 평가하지 않음     scoreMax}점 만점     학습용 조정 예시
```

그리고 **금지 패턴**: `localStorage.setItem`, `분석 가중치`, `asset-classification-note` — 새로 넣으면 테스트가 실패합니다.
`tests/rendered-html.test.mjs`는 `app/layout.tsx`의 `"codex-preview": "development"` 를 요구합니다.

### 8-2. CSS 중복 정의 🔴

`globals.css` 84KB 안에 **같은 셀렉터가 두세 번 재정의**돼 있고 뒤쪽이 이깁니다. 앞부분만 고치면 화면이 안 바뀝니다.

| 셀렉터 | 정의된 행 |
| --- | --- |
| `.hero-mascot` | 96 → 290 → 314 → **764** → 1038 |
| `.profile-mascot-frame` | 172 → 342 → **859** → 1050 |
| `.quiz-mascot.answered` | 259 → **990** → 1097 |
| `.character-art` | 78 → **767** |

→ 수정 전 반드시 `grep -n "<셀렉터>" app/globals.css`로 전 정의 위치 확인.

### 8-3. 퀴즈 화면의 외부 계약 🟡

`.quiz-phone`의 `data-question-id` / `data-concept-id` / `data-review-kind` 속성은 평가 스크립트가 읽을 수 있습니다. **DOM 구조를 바꿔도 이 속성은 같은 요소에 유지**해야 합니다.
`feedback-card success/error`, `.mobile-nav button`, `.answer-choice correct/wrong/selected` 클래스명도 유지합니다.

### 8-4. 절대 건드리지 않는 파일 ✅

`app/quiz-scheduler.ts` · `app/answer-utils.ts` · `app/portfolio-rules.ts` · `app/wealth-planner.ts` · `app/category-progress.ts` · `app/diagnosis-utils.ts` · `app/auth-utils.ts` · `app/server/**` · `app/api/**` · `public/data/**` · `reference-data/**`

작업은 **`page.tsx`의 JSX 렌더 부분 / `globals.css` / 신규 파일**에만 한정합니다.

### 8-5. 모션 접근성 🟡

`globals.css` 622행 / 1100행의 `prefers-reduced-motion` 블록에 **새 애니메이션도 반드시 포함**시켜야 합니다. 상용 배포 시 접근성 지적을 피하는 부분입니다.

### 8-6. 스프라이트 시트 제거 시점 🟡

Phase 2 완료 전에 `turini-mascot-sheet.png`를 지우면 **퀴즈 정답/오답 캐릭터가 사라집니다.** 반드시 레이어 전환 완료 후 제거합니다.

---

## ⚠️ 확인이 필요한 사항 2가지

### 확인 2 — 퀴즈 캐릭터 4상태, 현재 구현이 요청과 다릅니다

| 상태 | 요청하신 것 | 현재 코드 | 판단 |
| --- | --- | --- | --- |
| 정답 | 초록 체크 팻말 | 시트 크롭 (팻말 맞음) | ✅ 일치 — 다리 잘림만 수정 |
| 오답 | 빨간 X 팻말 | 시트 크롭 (팻말 맞음) | ✅ 일치 — 손 잘림·캡션 노출만 수정 |
| 풀이 전 | **생각하는 투리니** | `thinking` = 전구 들고 **아이디어 떠올린 포즈**(입 벌리고 웃음) | ⚠️ "생각"보다 "유레카"에 가까움 |
| 학습 완료 | **축하하는 투리니** | `wave` = **인사 포즈** | ⚠️ 축하 포즈 아님 |

→ 풀이 전은 시트 2행의 **"생각" 표정**, 학습 완료는 3행의 **"레벨 업!" 만세 포즈**가 맞아 보입니다.
**(a) 현재 상태 그대로 유지** 할지, **(b) 요청하신 의미에 맞게 교체** 할지 결정해 주세요. 기본값은 (a)로 두겠습니다.

---

## 다음 단계 제안

1. 위 **확인 1(zip 파일)**, **확인 2(퀴즈 4상태)** 회신
2. Phase 1(잘림·부유 CSS 수정)은 에셋 없이 바로 착수 가능 → 승인 주시면 시작
3. Phase 2 이후는 4-1의 레이어 PNG 세트 확보 후 진행
