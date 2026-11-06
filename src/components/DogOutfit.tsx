// 캐릭터 위에 얹는 옷 레이어 (인라인 SVG, 좌표는 DogCharacter의 200x200 기준)
// - OutfitBody: 몸/목 옷. 머리보다 먼저 그려서 머리가 옷깃 위로 겹쳐 보여요.
// - OutfitHead: 머리 위 소품. 머리/귀 다음에 그려요.
// 새 옷을 추가하려면 lib/wardrobe.ts의 OUTFITS와 같은 id로 아래 맵에 그림을 넣어 주세요.
import type { ReactNode } from "react";
import type { BodyBox } from "@/lib/dog-look";
import type { OutfitSelection } from "@/lib/wardrobe";

const BODY: Record<string, ReactNode> = {
  hoodie: (
    <g>
      <ellipse cx="100" cy="156" rx="47" ry="29" fill="#f4a9a1" />
      <path d="M66 146 Q100 168 134 146" stroke="#e58a82" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M94 161 v14 M106 161 v14" stroke="#fffdf8" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M78 168 Q100 178 122 168 L119 180 Q100 186 81 180Z" fill="#e58a82" opacity="0.6" />
    </g>
  ),
  knit: (
    <g>
      <ellipse cx="100" cy="156" rx="47" ry="29" fill="#9ec7e8" />
      <path d="M56 164 Q100 178 144 164 M60 174 Q100 188 140 174" stroke="#fffdf8" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.85" />
      <path d="M68 146 Q100 167 132 146" stroke="#7fb0d6" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M80 152 l3 6 M92 156 l3 6 M104 156 l3 6 M116 152 l3 6" stroke="#6a9cc6" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  overalls: (
    <g>
      <ellipse cx="100" cy="157" rx="47" ry="28" fill="#fffdf8" />
      <ellipse cx="100" cy="162" rx="46" ry="23" fill="#7aa5d6" />
      <path d="M78 150 L70 133 M122 150 L130 133" stroke="#7aa5d6" strokeWidth="8" strokeLinecap="round" />
      <path d="M82 154 h36 v12 q0 8 -18 8 q-18 0 -18 -8z" fill="#8fb6e2" />
      <circle cx="80" cy="150" r="3.4" fill="#f2c14e" />
      <circle cx="120" cy="150" r="3.4" fill="#f2c14e" />
    </g>
  ),
};

const NECK: Record<string, ReactNode> = {
  scarf: (
    <g>
      <path d="M62 143 Q100 168 138 143 L136 157 Q100 180 64 157Z" fill="#f2c14e" />
      <path d="M72 150 l-2 12 M88 158 l-2 12 M104 160 l-1 12 M120 156 l-1 12" stroke="#e8a92d" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d="M116 162 l12 24 l-15 5 l-6 -22z" fill="#e8a92d" />
    </g>
  ),
  bell: (
    <g>
      <path d="M62 144 Q100 170 138 144" stroke="#e8786f" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="163" r="7.5" fill="#e9b949" />
      <path d="M96 166 h8" stroke="#c99a2e" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
};

const HEAD: Record<string, ReactNode> = {
  ribbon: (
    <g>
      <path d="M131 58 l-21 -13 v26z M131 58 l21 -13 v26z" fill="#f2a0bd" stroke="#e8789f" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="131" cy="58" r="6.5" fill="#e8789f" />
    </g>
  ),
  hat: (
    <g>
      <path d="M61 64 Q100 6 139 64Z" fill="#8fb8e0" />
      <rect x="57" y="58" width="86" height="13" rx="6.5" fill="#6f9fd0" />
      <path d="M70 62 Q100 36 130 62" stroke="#fffdf8" strokeWidth="2.4" fill="none" opacity="0.6" strokeLinecap="round" />
      <circle cx="100" cy="32" r="7.5" fill="#fffdf8" />
    </g>
  ),
};

// body: 견종별 몸통 크기. 몸에 입는 옷은 몸통에 맞춰 늘이고 줄여요. (기본 몸통이면 그대로예요)
// 목 장식은 머리 바로 아래에 걸리는 거라 몸통 크기와 상관없이 같은 자리에 둬요.
export function OutfitBody({ outfit, body }: { outfit?: OutfitSelection; body?: BodyBox }) {
  if (!outfit) return null;
  const fit = body
    ? `translate(100 ${body.cy}) scale(${body.rx / 46} ${body.ry / 34}) translate(-100 -158)`
    : undefined;
  return (
    <g pointerEvents="none">
      {outfit.body && <g transform={fit}>{BODY[outfit.body]}</g>}
      {outfit.neck && NECK[outfit.neck]}
    </g>
  );
}

export function OutfitHead({ outfit }: { outfit?: OutfitSelection }) {
  if (!outfit?.head) return null;
  return <g pointerEvents="none">{HEAD[outfit.head]}</g>;
}
