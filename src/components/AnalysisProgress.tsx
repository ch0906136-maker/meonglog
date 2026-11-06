"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MyDogCharacter from "./MyDogCharacter";
import { useMyDog } from "@/lib/my-dog";

// analyses.progress(0~100)를 읽어 단계로 보여줘요. (서버의 analysis-job.ts가 값을 기록해요)
const STEPS = [
  { icon: "🐾", label: "영상을 확인하는 중" },
  { icon: "🔍", label: "행동을 찾는 중" },
  { icon: "📊", label: "행동 기록을 정리하는 중" },
  { icon: "📖", label: "멍로그를 만드는 중" },
  { icon: "✨", label: "멍로그 완성!" },
];

// 실제 progress 값(서버가 기록)에 따라 단계를 정해요. 마지막 단계는 100%(완료)일 때만 켜져요.
function stepFromProgress(p: number) {
  if (p >= 100) return STEPS.length;
  if (p >= 75) return 3;
  if (p >= 60) return 2;
  if (p >= 10) return 1;
  return 0;
}

const POLL_MS = 2000;
const GIVE_UP_MS = 6 * 60 * 1000;

type Status = "pending" | "processing" | "completed" | "failed";

export default function AnalysisProgress({ id }: { id: string }) {
  const router = useRouter();
  const { name: dogName } = useMyDog();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("processing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let failures = 0;
    const startedAt = Date.now();

    async function poll() {
      // 서버 API로 진행 상태를 읽어요. (브라우저가 DB를 직접 읽지 않아요)
      let data: { status: Status; progress: number; error: string | null } | null = null;
      let error = false;
      try {
        const res = await fetch(`/api/analysis/${id}`, { cache: "no-store" });
        if (res.ok) data = await res.json();
        else error = true;
      } catch {
        error = true;
      }
      if (stopped) return;

      if (error || !data) {
        failures += 1;
        if (failures >= 3) {
          setStatus("failed");
          setErrorMsg("분석 정보를 찾을 수 없어요. 다시 시도해 주세요.");
          return;
        }
      } else {
        failures = 0;
        setProgress(data.progress);
        setStatus(data.status as Status);
        if (data.status === "completed") {
          setTimeout(() => router.push(`/result/${id}`), 800);
          return;
        }
        if (data.status === "failed") {
          setErrorMsg(data.error ?? "분석에 실패했어요.");
          return;
        }
      }

      if (Date.now() - startedAt > GIVE_UP_MS) {
        setStatus("failed");
        setErrorMsg("분석이 너무 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stopped = true;
    };
  }, [id, router]);

  const failed = status === "failed";
  const done = status === "completed";
  const step = done ? STEPS.length : stepFromProgress(progress);

  if (failed) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <MyDogCharacter className="mx-auto h-32 w-32 grayscale-[30%]" label="아쉬워하는 강아지" />
        <h1 className="mt-6 text-2xl font-bold">분석에 실패했어요</h1>
        <p role="alert" className="mt-3 text-muted">{errorMsg}</p>
        <Link
          href="/upload"
          className="mt-8 inline-block rounded-full bg-brand px-8 py-4 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          다시 시도하기
        </Link>
      </div>
    );
  }

  const shown = done ? 100 : progress;

  return (
    <div className="mx-auto max-w-xl px-5 py-12 text-center">
      <MyDogCharacter
        mood={done ? "done" : "thinking"}
        className="animate-float mx-auto h-40 w-40"
        label={done ? "멍로그를 완성한 강아지" : "생각하는 강아지"}
      />
      <h1 className="mt-6 text-2xl font-bold sm:text-3xl">
        {done ? "✨ 멍로그가 완성됐어요!" : `🐶 ${dogName}의 영상을 살펴보고 있어요...`}
      </h1>
      <p className="mt-2 text-muted">
        {done
          ? "📖 멍로그에 기록이 저장됐어요. 결과 화면으로 이동할게요."
          : "영상 길이에 따라 1~2분 정도 걸릴 수 있어요. 이 화면을 닫지 말아 주세요."}
      </p>

      <div
        role="progressbar"
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="분석 진행률"
        className="mt-8 h-4 overflow-hidden rounded-full bg-beige"
      >
        <div
          className="h-full rounded-full bg-brand transition-all duration-700"
          style={{ width: `${shown}%` }}
        />
      </div>
      <p className="mt-2 text-sm font-medium text-muted">{shown}%</p>

      <ul className="mt-8 space-y-3 text-left">
        {STEPS.map((st, i) => {
          const state = i < step ? "done" : i === step ? "active" : "wait";
          return (
            <li
              key={st.label}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition ${
                state === "active"
                  ? "border-brand bg-brand-soft font-bold shadow-soft"
                  : state === "done"
                    ? "border-line bg-surface"
                    : "border-line bg-surface/60 text-muted"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
                  state === "done"
                    ? "bg-brand text-white"
                    : state === "active"
                      ? "bg-white motion-safe:animate-pulse"
                      : "bg-beige grayscale"
                }`}
              >
                {state === "done" ? "✓" : st.icon}
              </span>
              {st.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
