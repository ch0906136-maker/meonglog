"use client";

// 평소 패턴과 비교하기 / 평소와 다른 점
// - 이 기기에서 본 분석 id들을 서버(/api/usual)에 보내면, Supabase에서 완료된(completed) 분석의 행동 구간을 읽어 와요.
// - 분석 완료 영상이 5개 이상이면 열리고, 이번 영상을 "이번 영상을 뺀 이전 분석들의 평균"과 비교해요.
// - 5개 미만이면 비교 결과를 만들지 않고 잠금 상태로 보여줘요. (가짜 수치 없음)
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BEHAVIOR_COLORS } from "@/lib/behaviors";
import { BEHAVIOR_ICONS } from "@/lib/behavior-ui";
import { useMyDog } from "@/lib/my-dog";
import {
  MAX_ANALYSES_FOR_USUAL,
  MIN_ANALYSES_FOR_USUAL,
  compareToUsual,
  type UsualAnalysis,
  type UsualPayload,
} from "@/lib/usual";

// 서버 렌더링 때는 false, 브라우저에서 처음 그린 뒤에는 true. (기기에 저장된 기록을 읽기 전에 잠금 화면이 깜빡이지 않게 해요)
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Fetched = { key: string; analyses: UsualAnalysis[] | null }; // analyses === null → 불러오기 실패

function useUsualAnalyses(ids: string[], currentId: string | null, enabled: boolean) {
  const key = `${currentId ?? ""}|${ids.join(",")}`;
  const [res, setRes] = useState<Fetched | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    fetch("/api/usual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, currentId }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<UsualPayload>) : Promise.reject(new Error(String(r.status)))))
      .then((j) => !stop && setRes({ key, analyses: j.analyses }))
      .catch(() => !stop && setRes({ key, analyses: null }));
    return () => {
      stop = true;
    };
    // key에 ids/currentId가 모두 들어 있어요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return res && res.key === key ? res : null; // 아직 이 key의 응답이 없으면 null(불러오는 중)
}

function Shell({
  variant,
  children,
}: {
  variant: "home" | "result";
  children: React.ReactNode;
}) {
  if (variant === "result") return <section className="card animate-fade-up sm:!p-8">{children}</section>;
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-5 sm:pb-14">
      <div className="card">{children}</div>
    </section>
  );
}

export default function UsualPattern({
  currentId,
  variant,
}: {
  currentId: string | null; // 이번 영상(분석 id). 홈에서는 가장 최근 기록
  variant: "home" | "result";
}) {
  const { records } = useMyDog();
  const hydrated = useHydrated();

  // 이번 영상을 맨 앞에 두고, 이 기기의 다른 기록을 이어서 (중복 없이, 최대 개수까지)
  const ids = [...new Set([...(currentId ? [currentId] : []), ...records.map((r) => r.id)])].slice(
    0,
    MAX_ANALYSES_FOR_USUAL,
  );
  // 기록이 5개보다 적으면 서버에 물어볼 필요 없이 잠금이에요.
  const enabled = hydrated && ids.length >= MIN_ANALYSES_FOR_USUAL;
  const fetched = useUsualAnalyses(ids, currentId, enabled);

  if (!hydrated) {
    return (
      <Shell variant={variant}>
        <div className="h-24 animate-pulse rounded-2xl bg-beige/60" aria-hidden />
      </Shell>
    );
  }

  // ── 잠금: 기록이 5개 미만 (서버가 확인한 "완료된 서로 다른 영상" 수를 우선 써요)
  const analyses = fetched?.analyses ?? null;
  const completedCount = enabled ? (analyses ? analyses.length : null) : ids.length;
  const locked = completedCount !== null && completedCount < MIN_ANALYSES_FOR_USUAL;

  if (enabled && fetched === null) {
    return (
      <Shell variant={variant}>
        <h2 className="text-lg font-bold">평소 패턴과 비교하기</h2>
        <div className="mt-4 h-20 animate-pulse rounded-2xl bg-beige/60" aria-label="비교 정보를 불러오는 중" role="status" />
      </Shell>
    );
  }
  if (enabled && analyses === null) {
    return (
      <Shell variant={variant}>
        <h2 className="text-lg font-bold">평소 패턴과 비교하기</h2>
        <p role="alert" className="mt-3 text-sm text-muted">
          비교 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.
        </p>
      </Shell>
    );
  }

  if (locked) {
    const n = completedCount ?? 0;
    return (
      <Shell variant={variant}>
        <div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">🔒 평소 패턴과 비교하기</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              분석 기록 {MIN_ANALYSES_FOR_USUAL}개부터 이용할 수 있어요. 영상을 분석할 때마다 기록이 쌓여요.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                role="progressbar"
                aria-valuenow={n}
                aria-valuemin={0}
                aria-valuemax={MIN_ANALYSES_FOR_USUAL}
                aria-label="평소 패턴 비교까지 필요한 분석 기록"
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-beige"
              >
                <div
                  className="h-full rounded-full bg-brand transition-all duration-700"
                  style={{ width: `${Math.min(100, (n / MIN_ANALYSES_FOR_USUAL) * 100)}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {n}/{MIN_ANALYSES_FOR_USUAL}
              </span>
            </div>
            <Link href="/upload" className="btn-secondary mt-4">
              🎥 영상 분석하기
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ── 활성: 5개 이상 (여기까지 오면 analyses가 있어요)
  const list = analyses ?? [];
  // 이번 영상: 지정한 분석이 있으면 그것, 없으면(예: 기록에서 지워짐) 가장 최근 분석
  const current = list.find((a) => a.id === currentId) ?? list[0];
  const others = list.filter((a) => a !== current);
  const result = current ? compareToUsual(current.seconds, others.map((a) => a.seconds)) : null;
  const subject = variant === "home" ? "가장 최근 영상" : "이 영상";

  return (
    <Shell variant={variant}>
      <div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">✨ 평소와 다른 점</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {subject}을 이전에 분석한 영상 {result?.baselineCount ?? others.length}개의 평균과 비교했어요.
          </p>
        </div>
      </div>

      {!result ? (
        <p className="mt-4 rounded-2xl bg-background p-4 text-sm text-muted">
          이번 영상에서 비교할 행동 데이터가 부족해요.
        </p>
      ) : result.diffs.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-background p-4 text-sm leading-relaxed">
          이번 영상의 행동 비율은 평소 평균과 크게 다르지 않아요.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {result.diffs.map((d) => {
            const up = d.direction === "up";
            return (
              <li key={d.key} className="tile">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl"
                    style={{ backgroundColor: `${BEHAVIOR_COLORS[d.key]}66` }}
                  >
                    {BEHAVIOR_ICONS[d.key]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
                      {d.text}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          up ? "bg-pink-soft text-foreground/80" : "bg-sage-soft text-brand-dark"
                        }`}
                      >
                        {up ? "▲" : "▼"} {Math.abs(d.diffPoints)}%p
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {d.label} · 평소 평균 {d.usualPercent}% → {variant === "home" ? "최근 영상" : "이번 영상"}{" "}
                      {d.currentPercent}%
                    </p>
                    <div className="mt-2 space-y-1" aria-hidden>
                      <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                        <div className="h-full rounded-full bg-foreground/25" style={{ width: `${Math.max(d.usualPercent, 1)}%` }} />
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-beige">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(d.currentPercent, 1)}%`, backgroundColor: BEHAVIOR_COLORS[d.key] }} />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        영상마다 행동 비율을 구해 평균낸 참고용 정보예요. 멍로그는 의료 진단을 하지 않아요. 변화가 계속되거나 걱정되면
        수의사와 상담해 주세요.
      </p>
    </Shell>
  );
}
