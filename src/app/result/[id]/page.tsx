import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import DogCharacter from "@/components/DogCharacter";
import ResultView from "@/components/ResultView";
import { loadResult } from "@/lib/results";

export const metadata = { title: "영상 속 멍로그 - 멍로그" };

async function Content({ params }: PageProps<"/result/[id]">) {
  const { id } = await params;

  const result = await loadResult(id);
  if (result.state === "not_found") notFound();
  if (result.state === "pending") redirect(`/analysis/${id}`);
  if (result.state === "failed") {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <DogCharacter className="mx-auto h-32 w-32" label="아쉬워하는 강아지" />
        <h1 className="mt-6 text-2xl font-bold">분석에 실패했어요</h1>
        <p className="mt-3 text-muted">{result.error}</p>
        <Link
          href="/upload"
          className="btn-primary mt-8 !py-4 text-base"
        >
          다시 시도하기
        </Link>
      </div>
    );
  }
  return <ResultView data={result.data} analysisId={id} />;
}

export default function ResultPage(props: PageProps<"/result/[id]">) {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-muted">불러오는 중…</div>}>
      <Content {...props} />
    </Suspense>
  );
}
