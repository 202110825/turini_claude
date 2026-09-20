"use client";

import { useState } from "react";
import {
  DRESSUP_BASE,
  DRESSUP_BASE_WEBP,
  bagStrapColor,
  dressupLayerPath,
  findItem,
  type AvatarItem,
  type TuriniCustomization,
} from "./avatar-items";

type Props = {
  customization: TuriniCustomization;
  animated?: boolean;
  className?: string;
  label?: string;
  decorative?: boolean;
};

function Layer({ item, className = "" }: { item: AvatarItem; className?: string }) {
  const [failed, setFailed] = useState(false);
  const png = dressupLayerPath(item);
  const webp = dressupLayerPath(item, "front", true);
  if (!png || failed) return null;
  return (
    <picture className={`turini-composite__layer ${className}`.trim()} data-slot={item.slot}>
      {webp ? <source srcSet={webp} type="image/webp" /> : null}
      <img src={png} alt="" draggable={false} decoding="async" onError={() => setFailed(true)} />
    </picture>
  );
}

/**
 * 꾸미기 전용 정면 렌더러.
 * 카드에서 확인한 착용샷을 기준으로 미리 맞춘 448×448 레이어만 사용합니다.
 * 따라서 아이템 원본의 투명 여백이나 화면 크기가 달라도 얼굴에서 밀리지 않습니다.
 */
export default function TuriniComposite({
  customization,
  animated = true,
  className = "",
  label = "꾸미는 중인 나의 투리니",
  decorative = false,
}: Props) {
  const hat = findItem(customization.hat);
  const glasses = findItem(customization.glasses);
  const neck = findItem(customization.neck);
  const bag = findItem(customization.bag);
  const labelProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);

  return (
    <span
      className={`turini-composite ${className}`.trim()}
      data-live={animated ? "true" : undefined}
      {...labelProps}
    >
      <span className="turini-composite__canvas">
        {bag ? <Layer item={bag} className="turini-composite__bag" /> : null}
        <picture className="turini-composite__base">
          <source srcSet={DRESSUP_BASE_WEBP} type="image/webp" />
          <img src={DRESSUP_BASE} alt="" draggable={false} decoding="async" />
        </picture>
        {bag ? (
          <span
            className="turini-composite__straps"
            style={{ ["--strap" as string]: bagStrapColor(bag.id) }}
            aria-hidden="true"
          >
            <i />
            <i />
          </span>
        ) : null}
        {neck ? <Layer item={neck} /> : null}
        {glasses ? <Layer item={glasses} /> : null}
        {hat ? <Layer item={hat} /> : null}
      </span>
    </span>
  );
}
