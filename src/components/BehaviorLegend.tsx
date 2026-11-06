import { BEHAVIOR_HEARTS, BEHAVIOR_LABELS, type BehaviorKey } from "@/lib/behaviors";

// 타임라인/비율 막대의 색이 어떤 행동인지 알려주는 범례. 하트 색은 막대 색과 짝이에요. (🩷 놀이 · 🩵 휴식 · 💚 이동 …)
export default function BehaviorLegend({
  keys,
  showUncertain = false,
}: {
  keys: BehaviorKey[];
  showUncertain?: boolean; // 빗금(판단 어려움) 설명도 함께 보여줄지
}) {
  return (
    <ul aria-label="행동 색 범례" className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-foreground/80">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-1">
          <span aria-hidden>{BEHAVIOR_HEARTS[k]}</span>
          {BEHAVIOR_LABELS[k]}
        </li>
      ))}
      {showUncertain && (
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-3 shrink-0 rounded-full bg-beige ring-1 ring-black/10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(0,0,0,.25) 0 2px, transparent 2px 4px)",
            }}
          />
          빗금 = 판단이 어려웠던 구간
        </li>
      )}
    </ul>
  );
}
