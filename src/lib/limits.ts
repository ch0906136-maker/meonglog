// 서버 전용: 로그인 없는 MVP에서 Gemini 호출/저장소 남용을 막는 최소한의 제한값
// (환경변수로 조절할 수 있어요. 값이 없으면 기본값을 써요.)
const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export const LIMITS = {
  // 동시에 진행 중인 분석 수 (Gemini 쿼터/함수 동시 실행 보호)
  maxConcurrentAnalyses: num(process.env.MAX_CONCURRENT_ANALYSES, 3),
  // 최근 24시간 동안 시작할 수 있는 전체 분석 수 (하루 Gemini 비용 상한)
  maxAnalysesPerDay: num(process.env.MAX_ANALYSES_PER_DAY, 100),
  // 같은 영상에 대해 실패 후 다시 시도할 수 있는 최대 횟수 (성공/진행 중이면 기존 분석을 재사용)
  maxAttemptsPerVideo: 2,
  // 최근 1시간 동안 올릴 수 있는 전체 영상 수 (저장소 도배 방지)
  maxUploadsPerHour: num(process.env.MAX_UPLOADS_PER_HOUR, 60),
  // 이 시간이 지나도 끝나지 않은 분석은 중단된 것으로 봐요. (maxDuration 300초 + 여유)
  staleAnalysisMs: 6 * 60 * 1000,
};

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 버킷 제한과 동일
