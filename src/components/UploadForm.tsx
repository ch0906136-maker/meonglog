"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const ACCEPTED = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_MB = 200;

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<"upload" | "analyzing">("upload");

  const [dragging, setDragging] = useState(false);

  function selectFile(f: File | undefined) {
    setError(null);
    setFile(null);
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError("MP4, MOV, WebM 형식의 영상만 올릴 수 있어요.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_MB}MB 이하여야 해요.`);
      return;
    }
    setFile(f);
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0]);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    selectFile(e.dataTransfer.files?.[0]);
  }

  async function onStart() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    // 서버가 업로드 전용 서명 URL과 videos 행을 만들어 줘요. (한글/공백 파일명 문제를 피하려고 저장 경로는 서버가 랜덤ID로 정해요)
    let prep: { videoId?: string; path?: string; token?: string; error?: string } = {};
    try {
      const prepRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
      });
      prep = await prepRes.json();
      if (!prepRes.ok || !prep.videoId || !prep.path || !prep.token) {
        throw new Error(prep.error ?? "업로드를 준비하지 못했어요.");
      }
    } catch (e) {
      setError(`영상 업로드에 실패했어요: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
      setUploading(false);
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("dog-videos")
      .uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });

    if (uploadError) {
      setError(`영상 업로드에 실패했어요: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    const data = { id: prep.videoId };

    // 업로드한 영상으로 AI 분석을 시작해요. (분석 자체는 서버에서 이어서 진행돼요)
    setStage("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: data.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.analysisId) {
        throw new Error(json.error ?? "분석을 시작하지 못했어요.");
      }
      router.push(`/analysis/${json.analysisId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석을 시작하지 못했어요.");
      setUploading(false);
      setStage("upload");
    }
  }

  const statusText = uploading
    ? stage === "upload"
      ? "영상을 올리는 중이에요…"
      : "분석을 시작하는 중이에요…"
    : file
      ? "분석을 시작할 준비가 됐어요"
      : "영상을 선택해 주세요";

  return (
    <div>
      <label
        htmlFor="video"
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border-2 border-dashed px-5 py-12 text-center shadow-soft sm:px-6 sm:py-14 transition focus-within:border-brand ${
          dragging
            ? "border-brand bg-brand-soft"
            : "border-line bg-surface hover:-translate-y-0.5 hover:border-brand"
        } ${uploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <span
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-3xl"
        >
          🎬
        </span>
        {file ? (
          <>
            <span className="mt-4 break-all text-lg font-bold">{file.name}</span>
            <span className="mt-1 text-sm text-muted">다른 영상을 고르려면 클릭하세요</span>
          </>
        ) : (
          <>
            <span className="mt-4 break-keep text-lg font-bold">
              영상을 끌어다 놓거나 눌러서 선택하세요
            </span>
            <span className="mt-1 text-sm text-muted">
              MP4, MOV, WebM · 최대 {MAX_MB}MB
            </span>
          </>
        )}
        <input
          id="video"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={onSelect}
          disabled={uploading}
          className="sr-only"
        />
      </label>

      {/* 영상 정보 */}
      {file && (
        <dl className="card mt-4 grid grid-cols-3 gap-2 !p-4 text-center text-sm">
          <div>
            <dt className="text-xs text-muted">형식</dt>
            <dd className="mt-0.5 font-bold">
              {(file.name.split(".").pop() ?? "").toUpperCase() || "영상"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">크기</dt>
            <dd className="mt-0.5 font-bold">{(file.size / 1024 / 1024).toFixed(1)}MB</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">상태</dt>
            <dd className="mt-0.5 font-bold text-brand-dark">
              {uploading ? (stage === "upload" ? "업로드 중" : "분석 시작 중") : "준비 완료"}
            </dd>
          </div>
        </dl>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-pink-soft px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-5 rounded-2xl bg-brand-soft p-4 text-sm leading-relaxed text-brand-dark sm:p-5">
        <p className="font-bold">🐾 권장 영상 길이: 1~3분</p>
        <p className="mt-1">
          지금은 짧은 영상으로 먼저 체험해 볼 수 있어요. 강아지가 화면에 잘 보이면 더 정확하게 분석해요.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!file || uploading}
        aria-live="polite"
        className="mt-6 min-h-14 w-full rounded-full bg-brand px-7 py-4 text-lg font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark active:scale-[0.98] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:shadow-none"
      >
        {uploading ? statusText : "🐾 분석 시작하기"}
      </button>
    </div>
  );
}
