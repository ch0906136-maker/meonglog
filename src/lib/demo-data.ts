// "예시 멍로그 보기"에서 쓰는 데모 데이터입니다. 실제 분석 결과가 아니에요.
import type { ResultData } from "./behaviors";

export const DEMO_RESULT: ResultData = {
  isDemo: true,
  dogName: "보리",
  dateLabel: "2026년 11월 5일",
  sourceLabel: "데모 데이터 (홈캠 10시간 기준)",
  summary:
    "보리는 오늘 대부분의 시간을 편안히 쉬었고, 오후에 장난감 놀이를 즐겼어요.",
  body: [
    "아침에는 햇볕이 드는 거실 방석에서 오래 잠들어 있었어요. 점심때쯤 일어나 물을 마시고 사료를 맛있게 먹었어요.",
    "오후 1시쯤에는 좋아하는 장난감을 물고 한참 놀았어요. 그러다 오후 3시 넘어 현관 쪽을 보며 여러 번 짖었어요.",
    "저녁에는 문 앞에서 서성이며 보호자를 기다리는 모습이 보였어요.",
  ],
  // 분 단위 합계 600분(10시간)을 초로 환산
  seconds: {
    rest: 372 * 60,
    move: 84 * 60,
    play: 66 * 60,
    watch: 0,
    eat: 18 * 60,
    drink: 12 * 60,
    bark: 30 * 60,
    etc: 18 * 60,
  },
  usualRatio: null, // 데모에서도 "평소와 비교"는 보여주지 않아요
  uncertainSec: 0,
  segments: [],
  timeline: [
    { label: "09:12", behavior: "rest", note: "거실 방석에서 잠들었어요", confident: true },
    { label: "10:40", behavior: "drink", note: "물그릇에서 물을 마셨어요", confident: true },
    { label: "11:05", behavior: "move", note: "집 안을 천천히 돌아다녔어요", confident: true },
    { label: "12:30", behavior: "eat", note: "사료를 먹었어요", confident: true },
    { label: "13:10", behavior: "play", note: "장난감을 물고 혼자 놀았어요", confident: true },
    { label: "15:20", behavior: "bark", note: "현관 쪽을 보며 여러 번 짖었어요", confident: true },
    { label: "16:00", behavior: "rest", note: "다시 낮잠을 잤어요", confident: true },
    { label: "18:45", behavior: "move", note: "문 앞에서 서성였어요", confident: true },
  ],
};
