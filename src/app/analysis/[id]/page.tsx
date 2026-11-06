import { Suspense } from "react";
import AnalysisProgress from "@/components/AnalysisProgress";

export const metadata = { title: "분석 중 - 멍로그" };

async function Content({ params }: PageProps<"/analysis/[id]">) {
  const { id } = await params;
  return <AnalysisProgress id={id} />;
}

export default function AnalysisPage(props: PageProps<"/analysis/[id]">) {
  return (
    <Suspense fallback={<div className="px-5 py-16 text-center text-muted">불러오는 중…</div>}>
      <Content {...props} />
    </Suspense>
  );
}
