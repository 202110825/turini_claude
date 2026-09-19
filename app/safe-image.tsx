"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * 그림 한 장을 "여러 후보 경로"로 안전하게 불러옵니다.
 *
 * 왜 `<picture>` 를 쓰지 않는가
 * ------------------------------
 * `<picture><source srcSet="...webp"><img src="...png"></picture>` 는
 * 브라우저가 webp 를 고른 뒤 **그 파일이 없으면 png 로 되돌아가지 않습니다.**
 * (HTML 규칙상 `<source>` 가 한 번 선택되면 그걸로 끝입니다.)
 * 압축을 풀다가 `optimized/` 폴더 일부가 빠지면 그림이 통째로 사라지는
 * 이유가 이것입니다.
 *
 * 그래서 `<img>` 한 장만 쓰고, 실패하면 다음 후보로 직접 넘깁니다.
 *   webp(가벼움) → png(원본) → 그래도 없으면 대체 표시
 */
export default function SafeImage({
  sources,
  alt = "",
  className,
  style,
  eager = false,
  fallback = null,
  onExhausted,
}: {
  /** 시도할 경로 목록. 앞에서부터 하나씩 시도합니다 */
  sources: string[];
  alt?: string;
  className?: string;
  style?: CSSProperties;
  eager?: boolean;
  /** 모든 후보가 실패했을 때 대신 보여 줄 내용 */
  fallback?: ReactNode;
  /** 모든 후보가 실패했을 때 알려 줍니다 */
  onExhausted?: () => void;
}) {
  const head = sources[0] ?? "";
  const [state, setState] = useState({ head, index: 0 });
  // 다른 아이템으로 바뀌면 처음부터 다시 시도합니다.
  if (state.head !== head) setState({ head, index: 0 });

  const index = state.head === head ? state.index : 0;
  if (index >= sources.length) return <>{fallback}</>;

  return (
    // next/image 는 후보 경로를 직접 바꿔 가며 시도할 수 없어 여기서는 쓰지 않습니다.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[index]}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "sync" : "async"}
      draggable={false}
      onError={() => {
        const next = index + 1;
        setState({ head, index: next });
        if (next >= sources.length) onExhausted?.();
      }}
    />
  );
}
