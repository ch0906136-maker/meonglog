# 🐾 멍로그

강아지 영상을 올리면 AI가 영상 속 행동을 분석해서 **영상 속 멍로그**로 기록해 주는 서비스예요.
내 강아지를 꾸미고 키우듯, 분석 기록이 쌓이는 재미까지 더했어요.

🔗 https://meonglog.vercel.app

## 이런 걸 할 수 있어요

- **영상 분석** — 1~3분 정도의 강아지 영상을 올리면 Gemini가 행동을 시간 구간으로 나눠서 기록해요.
  (휴식, 이동, 놀이, 주변 관찰, 식사, 물 마시기, 짖기)
- **행동 타임라인 & 기록** — 영상 기준 시간(`0:07 ~ 0:09`)으로 구간을 보여주고, 같은 행동은 모아서 총 시간·횟수·비율로 요약해요.
- **영상 속 멍로그** — AI가 관찰한 행동만 바탕으로 짧은 글을 써줘요. (의료 진단이나 감정 추측은 하지 않아요)
- **평소와 다른 점** — 분석 완료 영상이 5개 이상이면, 이번 영상을 이전 분석들의 평균과 비교해서 달라진 점을 알려줘요.
- **내 강아지 프로필** — 사진, 이름, 견종, 털색, 성별, 생일(나이 자동 계산). 견종과 털색에 따라 캐릭터 모습이 달라져요.
- **마이룸 꾸미기** — 옷장과 방 꾸미기, 행동 도감, 경험치/레벨. 분석 결과가 쌓일수록 새 아이템이 열려요.

## 어떻게 동작해요?

```
영상 업로드 → Supabase Storage → Gemini 행동 분석 → behaviors 저장 → 멍로그 작성 → 결과 화면
```

- 분석은 서버에서 진행되고, 진행 상황은 `analyses` 테이블(status/progress)을 통해 화면에 보여요.
- Gemini 호출마다 제한 시간이 있고, 모델이 바쁘거나 일일 한도를 넘으면 다른 모델로 넘어가요.
  전체 분석도 정해진 시간 안에 끝나요.
- 강아지 프로필, 꾸미기, 기록은 이 기기의 브라우저(localStorage)에 저장돼요. (로그인 기능은 아직 없어요)
- 비밀 키(`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`)는 서버에서만 사용해요.

## 기술 스택

Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres, Storage) · Google Gemini · Vercel

## 직접 실행해 보기

```bash
npm install
cp .env.example .env.local   # 값을 채워 주세요
npm run dev                  # http://localhost:3000
```

`.env.local`에 필요한 값은 `.env.example`을 참고하세요.
Supabase에는 `supabase/schema.sql`을 먼저 실행하고, 이어서 `supabase/migrations/`의 파일을 날짜 순서대로 실행해요.

```bash
npm run build   # 프로덕션 빌드
npm run lint    # ESLint
```

## 알아 두세요

- 멍로그는 **의료 진단을 하지 않아요.** 영상에서 확인된 행동만 기록해요.
- Gemini 무료 티어는 하루 요청 한도가 작아서, 한도를 넘으면 그날은 분석이 제한될 수 있어요.
- 현재는 한 마리의 강아지만 지원해요.
