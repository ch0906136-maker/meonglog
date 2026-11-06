// 멍로그 마스코트. 분석 상태에 맞춰 표정이 바뀌는 인라인 SVG예요. (외부 이미지 없음)
// look을 주면 내 강아지 프로필(견종/털색)에 맞춰 외형이 달라져요. 없으면 처음 만든 기본 캐릭터예요.
// - 털색: 팔레트(색)가 바뀌어요. 털색을 고르지 않으면 견종에 흔한 털색을 써요.
// - 견종: 귀/털 질감/꼬리/체형/얼굴 무늬 같은 특징이 달라져요. (lib/dog-look.ts의 TRAITS)
import { effectiveCoat, paletteFor, traitsFor, type DogLook } from "@/lib/dog-look";
import type { OutfitSelection } from "@/lib/wardrobe";
import {
  BreedBodyBack,
  BreedBodyMarks,
  BreedEars,
  BreedFaceMarks,
  BreedFrontFur,
  BreedHeadBack,
  BreedHeadTop,
  BreedMuzzleFront,
  BreedTail,
  Feet,
} from "./BreedArt";
import { OutfitBody, OutfitHead } from "./DogOutfit";

export type DogMood = "idle" | "thinking" | "done";

export function DogArt({
  mood = "idle",
  look,
  outfit,
}: {
  mood?: DogMood;
  look?: DogLook;
  outfit?: OutfitSelection; // 옷장에서 고른 옷 (없으면 기본 모습)
}) {
  const thinking = mood === "thinking";
  const p = paletteFor(look?.coat, look?.breed);
  const t = traitsFor(look?.breed);
  const twoTone = effectiveCoat(look?.coat, look?.breed) === "two";
  const flat = t.face === "flat";
  const eyeR = 6 * t.eye;
  const b = t.body;

  return (
    // 작은 견종은 작게, 큰 견종은 크게 (바닥 가운데를 기준으로 키워요)
    <g transform={`translate(100 198) scale(${t.scale}) translate(-100 -198)`}>
      {/* 꼬리 */}
      <BreedTail t={t} p={p} />
      {/* 몸 (곱슬/솜뭉치 견종은 둘레에 털뭉치가 먼저 깔려요) */}
      <BreedBodyBack t={t} p={p} />
      <ellipse cx="100" cy={b.cy} rx={b.rx} ry={b.ry} fill={p.body} />
      <ellipse cx="100" cy={b.cy + 8} rx={b.rx * 0.565} ry={b.ry * 0.59} fill={p.belly} />
      <BreedBodyMarks t={t} />
      <Feet t={t} p={p} />
      {/* 몸/목 옷: 머리보다 먼저 그려서 머리가 옷깃 위로 겹쳐요 */}
      <OutfitBody outfit={outfit} body={b} />
      {/* 옷 위로 내려오는 털 (긴 털 치마, 발 방울) */}
      <BreedFrontFur t={t} p={p} />
      {/* 머리 전체(귀, 얼굴, 머리 위 소품): 작은 얼굴/큰 얼굴은 목 아래를 기준으로 크기만 달라져요 */}
      <g transform={t.head === 1 ? undefined : `translate(100 150) scale(${t.head}) translate(-100 -150)`}>
      {/* 귀 (견종에 따라 모양이 달라요) */}
      <BreedEars t={t} p={p} />
      {/* 머리 (곱슬/솜뭉치/풍성한 털 견종은 둘레에 털이 먼저 깔려요) */}
      <BreedHeadBack t={t} p={p} />
      <circle cx="100" cy="96" r="52" fill={p.head} />
      <ellipse
        cx="74"
        cy="80"
        rx={twoTone ? 22 : 15}
        ry={twoTone ? 20 : 13}
        fill={p.shade}
        opacity={twoTone ? 0.95 : 0.7}
      />
      <BreedFaceMarks t={t} />
      <BreedHeadTop t={t} p={p} />
      {/* 주둥이 (납작한 얼굴은 짧고 넓게) */}
      <ellipse cx="100" cy={flat ? 116 : 113} rx={25} ry={flat ? 14 : 19} fill={p.snout} />
      <BreedMuzzleFront t={t} p={p} />
      <ellipse cx="100" cy={flat ? 108 : 104} rx={flat ? 10 : 8.5} ry={flat ? 6.5 : 6} fill={p.nose} />
      <path
        d={
          flat
            ? "M100 113 V119 M100 119 C95 124 88 123 87 120 M100 119 C105 124 112 123 113 120"
            : "M100 110 V118 M100 118 C94 126 86 124 85 120 M100 118 C106 126 114 124 115 120"
        }
        stroke={p.nose}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* 볼터치 */}
      <circle cx="70" cy="108" r="8" fill="#f6b9b0" opacity="0.55" />
      <circle cx="130" cy="108" r="8" fill="#f6b9b0" opacity="0.55" />
      {/* 눈 */}
      {mood === "done" ? (
        <g stroke="#3a2e26" strokeWidth="3.6" strokeLinecap="round" fill="none">
          <path d="M70 92 Q80 82 90 92" />
          <path d="M110 92 Q120 82 130 92" />
        </g>
      ) : (
        <g fill="#3a2e26">
          <circle cx={thinking ? 83 : 80} cy={thinking ? 88 : 92} r={eyeR} />
          <circle cx={thinking ? 123 : 120} cy={thinking ? 88 : 92} r={eyeR} />
          <circle cx={thinking ? 85 : 82} cy={thinking ? 86 : 90} r="2" fill="#fff" />
          <circle cx={thinking ? 125 : 122} cy={thinking ? 86 : 90} r="2" fill="#fff" />
        </g>
      )}
      {/* 머리 위 소품 (리본/모자) */}
      <OutfitHead outfit={outfit} />
      </g>
      {/* 상태 장식 */}
      {thinking && (
        <g fill="#c9b9a2">
          <circle cx="152" cy="40" r="4" />
          <circle cx="166" cy="28" r="6" />
          <ellipse cx="184" cy="14" rx="14" ry="10" fill="#efe4d1" stroke="#c9b9a2" strokeWidth="2" />
          <g fill="#8d7e6f">
            <circle cx="177" cy="14" r="2" />
            <circle cx="184" cy="14" r="2" />
            <circle cx="191" cy="14" r="2" />
          </g>
        </g>
      )}
      {mood === "done" && (
        <g fill="#e9b949">
          <path d="M160 34 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" />
          <path d="M34 40 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
          <path d="M176 76 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
        </g>
      )}
    </g>
  );
}

export default function DogCharacter({
  mood = "idle",
  className = "",
  label = "멍로그 강아지 캐릭터",
  look,
  outfit,
}: {
  mood?: DogMood;
  className?: string;
  label?: string;
  look?: DogLook;
  outfit?: OutfitSelection;
}) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={className}>
      <DogArt mood={mood} look={look} outfit={outfit} />
    </svg>
  );
}
