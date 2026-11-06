import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "멍로그 - 영상 속 강아지의 행동을 AI가 기록해요",
  description: "강아지 영상을 올리면 AI가 영상 속 행동을 분석해 멍로그로 기록해요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-beige/60 py-10 text-center text-xs text-muted">
          <p className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
            <span aria-hidden>🐾</span> 멍로그
          </p>
          <p className="mt-1">영상 속 강아지의 행동을 AI가 이해하고 기록해요.</p>
          <p className="mx-auto mt-3 max-w-md px-5 leading-relaxed">
            멍로그는 의료 진단을 하지 않아요. 평소와 다른 변화가 걱정되면 수의사와 상담해 주세요.
          </p>
        </footer>
      </body>
    </html>
  );
}
