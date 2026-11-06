// 멍로그 마스코트. 분석 상태에 맞춰 표정이 바뀌는 인라인 SVG예요. (외부 이미지 없음)
// look을 주면 내 강아지 프로필(털색/견종)에 맞춰 기본 외형이 조금 달라져요. 없으면 처음 만든 기본 캐릭터예요.
import { earStyleFor, paletteFor, type DogLook } from "@/lib/dog-look";

export type DogMood = "idle" | "thinking" | "done";

export function DogArt({ mood = "idle", look }: { mood?: DogMood; look?: DogLook }) {
  const thinking = mood === "thinking";
  const p = paletteFor(look?.coat);
  const ears = earStyleFor(look?.breed);
  const twoTone = look?.coat === "two";

  return (
    <g>
      {/* 꼬리 */}
      <path d="M142 158 C166 148 172 128 160 116" stroke={p.tail} strokeWidth="12" strokeLinecap="round" fill="none" />
      {/* 몸 */}
      <ellipse cx="100" cy="158" rx="46" ry="34" fill={p.body} />
      <ellipse cx="100" cy="166" rx="26" ry="20" fill={p.belly} />
      <ellipse cx="72" cy="188" rx="15" ry="9" fill={p.feet} />
      <ellipse cx="128" cy="188" rx="15" ry="9" fill={p.feet} />
      {/* 귀 (견종에 따라 모양이 달라요) */}
      {ears === "floppy" && (
        <>
          <ellipse cx="55" cy="84" rx="19" ry="33" fill={p.ear} transform="rotate(14 55 84)" />
          <ellipse cx="145" cy="84" rx="19" ry="33" fill={p.ear} transform="rotate(-14 145 84)" />
        </>
      )}
      {ears === "pointy" && (
        <>
          <path d="M40 76 L50 22 L84 56 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="8" />
          <path d="M160 76 L150 22 L116 56 Z" fill={p.ear} strokeLinejoin="round" stroke={p.ear} strokeWidth="8" />
          <path d="M52 44 L53 60 L66 54 Z" fill="#f6b9b0" opacity="0.7" />
          <path d="M148 44 L147 60 L134 54 Z" fill="#f6b9b0" opacity="0.7" />
        </>
      )}
      {ears === "puff" && (
        <>
          <circle cx="48" cy="86" r="24" fill={p.ear} />
          <circle cx="152" cy="86" r="24" fill={p.ear} />
          <circle cx="42" cy="100" r="14" fill={p.ear} />
          <circle cx="158" cy="100" r="14" fill={p.ear} />
        </>
      )}
      {/* 머리 */}
      <circle cx="100" cy="96" r="52" fill={p.head} />
      <ellipse
        cx="74"
        cy="80"
        rx={twoTone ? 22 : 15}
        ry={twoTone ? 20 : 13}
        fill={p.shade}
        opacity={twoTone ? 0.95 : 0.7}
      />
      {ears === "puff" && (
        <>
          <circle cx="100" cy="46" r="20" fill={p.head} />
          <circle cx="80" cy="50" r="14" fill={p.head} />
          <circle cx="120" cy="50" r="14" fill={p.head} />
        </>
      )}
      {/* 주둥이 */}
      <ellipse cx="100" cy="113" rx="25" ry="19" fill={p.snout} />
      <ellipse cx="100" cy="104" rx="8.5" ry="6" fill={p.nose} />
      <path d="M100 110 V118 M100 118 C94 126 86 124 85 120 M100 118 C106 126 114 124 115 120" stroke={p.nose} strokeWidth="2.6" strokeLinecap="round" fill="none" />
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
          <circle cx={thinking ? 83 : 80} cy={thinking ? 88 : 92} r="6" />
          <circle cx={thinking ? 123 : 120} cy={thinking ? 88 : 92} r="6" />
          <circle cx={thinking ? 85 : 82} cy={thinking ? 86 : 90} r="2" fill="#fff" />
          <circle cx={thinking ? 125 : 122} cy={thinking ? 86 : 90} r="2" fill="#fff" />
        </g>
      )}
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
}: {
  mood?: DogMood;
  className?: string;
  label?: string;
  look?: DogLook;
}) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={label} className={className}>
      <DogArt mood={mood} look={look} />
    </svg>
  );
}
