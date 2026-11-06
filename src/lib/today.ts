"use client";

// 사용자 기기의 "오늘" 날짜("YYYY-MM-DD", 기기의 현지 시간 기준)를 돌려주는 훅.
// 서버 렌더링 때는 ""이에요. (서버와 브라우저의 날짜가 달라서 생기는 화면 불일치를 막으려고 비워 둬요)
// 탭으로 돌아오면(날짜가 바뀌었을 수 있어서) 다시 확인해요.
import { useSyncExternalStore } from "react";

export function localTodayIso(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subscribe(cb: () => void) {
  const onVisible = () => {
    if (document.visibilityState === "visible") cb();
  };
  window.addEventListener("focus", cb);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("focus", cb);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function useToday(): string {
  return useSyncExternalStore(subscribe, () => localTodayIso(), () => "");
}
