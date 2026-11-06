import MyRoomHome from "@/components/MyRoomHome";

const STEPS = [
  {
    icon: "🎥",
    title: "영상 올리기",
    desc: "휴대폰이나 홈캠으로 찍은 1~3분 정도의 강아지 영상을 올려 주세요.",
  },
  {
    icon: "🔍",
    title: "AI가 행동 분석",
    desc: "영상 속 강아지가 무엇을 했는지 AI가 시간순으로 살펴봐요.",
  },
  {
    icon: "📖",
    title: "영상 속 멍로그",
    desc: "영상 속 이야기와 행동 비율, 영상에서 확인된 특징을 한눈에 확인해요.",
  },
];

export default function Home() {
  return (
    <div>
      {/* 내 강아지 · 마이룸 · 도감 (기기에 저장된 기록 기반) */}
      <MyRoomHome />

      {/* 이렇게 작동해요 */}
      <section className="border-y border-line bg-beige/50">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-xl font-bold">이렇게 작동해요</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="card !rounded-3xl"
              >
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-2xl"
                >
                  {s.icon}
                </span>
                <h3 className="mt-4 text-lg font-bold">
                  <span className="mr-1.5 text-brand">{i + 1}.</span>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="rounded-[1.75rem] bg-sage-soft p-5 sm:p-8">
          <h2 className="text-lg font-bold">멍로그가 하지 않는 것</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            멍로그는 질병을 진단하거나 판단하지 않아요. 영상에서 실제로 확인된 행동만 기록하고,
            걱정되는 부분은 수의사와 상담하시길 권해요.
          </p>
        </div>
      </section>
    </div>
  );
}
