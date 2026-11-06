import {
  BEHAVIOR_KEYS,
  BEHAVIOR_LABELS,
  formatDuration,
  type BehaviorKey,
  type Stat,
} from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";

// 행동 도감 카드. stats를 주면 "이번 영상에서 발견한 행동"을 표시하고, 없으면 소개용으로 보여줘요.
// 발견하지 못한 행동은 "못 봤어요"일 뿐, 하지 않았다는 뜻이 아니에요.
export default function BehaviorDex({
  stats,
  missingText = "이번 영상에선 못 봤어요",
}: {
  stats?: Stat[];
  missingText?: string; // 아직 발견하지 못한 행동에 보여줄 문구
}) {
  // 소개용에서는 "기타/판단 어려움"은 숨기고, 결과에서는 실제로 관찰됐을 때만 보여줘요.
  const keys = BEHAVIOR_KEYS.filter(
    (k) => k !== "etc" || stats?.some((s) => s.key === "etc" && s.seconds > 0),
  );
  const byKey = new Map<BehaviorKey, Stat>(stats?.map((s) => [s.key, s]));

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {keys.map((key) => {
        const stat = byKey.get(key);
        const found = stat ? stat.seconds > 0 : null;
        return (
          <li
            key={key}
            className={`flex flex-col items-center rounded-3xl border p-4 text-center shadow-soft transition hover:-translate-y-0.5 ${
              found === false
                ? "border-dashed border-line bg-background text-muted"
                : "border-line bg-surface"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${
                found === false ? "bg-beige/60 grayscale" : "bg-beige"
              }`}
            >
              {BEHAVIOR_ICONS[key]}
            </span>
            <span className="mt-3 text-sm font-bold">{BEHAVIOR_LABELS[key]}</span>
            {stat ? (
              found ? (
                <>
                  <span className="mt-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                    발견 ✓
                  </span>
                  <span className="mt-2 text-xs text-muted">
                    {formatDuration(stat.seconds)} · {stat.percent}%
                  </span>
                </>
              ) : (
                <span className="mt-1 text-xs">{missingText}</span>
              )
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
