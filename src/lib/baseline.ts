// "평소" 행동 비율 기준 데이터.
//
// 실제 서비스: getBaseline()이 충분한 과거 기록(예: 영상 여러 개)을 모아
// 행동별 평균 비율을 반환하도록 바꾸면 돼요.
// 다른 코드는 getBaseline()의 반환 형태(Baseline)만 알면 되도록 분리해 뒀어요.
import type { Baseline } from "./behaviors";

// 과거 데이터가 충분하지 않으면 null을 돌려줘요. (null이면 평소와의 정량 비교를 하지 않아요)
// MVP에는 과거 기록 집계가 없어서 항상 null이에요. (샘플/가짜 기준값은 화면 어디에도 쓰지 않아요)
export async function getBaseline(): Promise<Baseline | null> {
  return null;
}
