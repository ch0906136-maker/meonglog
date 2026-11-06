import Link from "next/link";

// 실제로 존재하는 경로만 연결해요. (행동도감은 메인 페이지의 도감 섹션으로 이동해요)
const NAV = [
  { href: "/", label: "홈" },
  { href: "/upload", label: "멍로그" },
  { href: "/#dex", label: "행동도감" },
  { href: "/#my-dog", label: "내 강아지" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-lg"
          >
            🐾
          </span>
          멍로그
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="order-3 flex w-full items-center gap-1 text-sm font-medium sm:order-none sm:w-auto"
        >
          {NAV.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="rounded-full px-4 py-2 text-foreground/80 transition hover:bg-beige hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/upload"
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          🎥 영상 올리기
        </Link>
      </div>
    </header>
  );
}
