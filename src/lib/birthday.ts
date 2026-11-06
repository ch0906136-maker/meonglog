// 생일 / 나이 계산 (순수 함수, 서버·브라우저 어디서나 같은 결과)
// - 생일은 "YYYY-MM-DD" 문자열로 저장해요. (시간대 문제가 없는 "날짜"만 다뤄요)
// - "오늘"은 항상 인자로 받아요. 호출하는 쪽이 사용자 기기의 오늘 날짜를 넘겨요. (lib/today.ts)
// - 나중에 생일 이벤트/보상을 붙일 수 있도록 getBirthdayInfo()가 "오늘이 생일인지, 다음 생일까지 며칠인지,
//   몇 살이 되는지, 연 1회 보상용 이벤트 id"를 한 번에 돌려줘요.

export type Ymd = { y: number; m: number; d: number };

export const MIN_BIRTH_YEAR = 1990; // 이보다 이전 연도는 잘못 입력한 것으로 봐요

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

// "YYYY-MM-DD"가 실제로 있는 날짜일 때만 돌려줘요. (2023-02-30 같은 값은 null)
export function parseYmd(value: unknown): Ymd | null {
  if (typeof value !== "string") return null;
  const m = ISO.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return { y, m: mo, d };
}

export function toIso({ y, m, d }: Ymd): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// 저장해도 되는 생일인지 (실제 날짜 + 너무 오래된 연도가 아님). 미래 날짜 검사는 "오늘"이 필요해서 isValidBirthday에서 해요.
export function normalizeBirthday(value: unknown): string | null {
  const p = parseYmd(value);
  return p && p.y >= MIN_BIRTH_YEAR ? toIso(p) : null;
}

// 입력 검사: 실제 날짜이고, 오늘보다 미래가 아니어야 해요.
export function isValidBirthday(value: string, todayIso: string): boolean {
  const b = normalizeBirthday(value);
  return b !== null && b <= todayIso; // "YYYY-MM-DD"는 문자열 비교가 곧 날짜 비교예요
}

export function formatBirthday(value: string): string {
  const p = parseYmd(value);
  return p ? `${String(p.y).padStart(4, "0")}.${String(p.m).padStart(2, "0")}.${String(p.d).padStart(2, "0")}` : "";
}

export type Age = {
  years: number; // 만 나이
  months: number; // 태어난 뒤 지난 전체 개월 수 (years*12 + 남은 개월)
};

// 만 나이를 달력 기준으로 계산해요. (생일이 지났으면 +1, 아직이면 그대로)
// 말일 처리: 31일에 태어났는데 이번 달이 30일까지면 그 달의 말일에 한 달이 찬 것으로 봐요.
// 윤일(2/29) 생일은 윤년이 아닌 해에 2/28에 한 살이 늘어요.
// 생일이 미래이거나 날짜가 잘못되면 null이에요.
export function calcAge(birthdayIso: string, todayIso: string): Age | null {
  const b = parseYmd(birthdayIso);
  const t = parseYmd(todayIso);
  if (!b || !t || toIso(t) < toIso(b)) return null;
  let months = (t.y - b.y) * 12 + (t.m - b.m);
  if (t.d < Math.min(b.d, daysInMonth(t.y, t.m))) months -= 1;
  return { years: Math.floor(months / 12), months };
}

// "4살" / "7개월" / "1개월 미만"
export function ageText(age: Age): string {
  if (age.years >= 1) return `${age.years}살`;
  if (age.months >= 1) return `${age.months}개월`;
  return "1개월 미만";
}

// 프로필 카드용: "🎂 2022.05.18 · 4살" 에서 🎂 뒤의 글자 ("2022.05.18 · 4살"). 생일이 없거나 잘못되면 null.
export function birthdayLine(birthdayIso: string, todayIso: string): string | null {
  const date = formatBirthday(birthdayIso);
  if (!date) return null;
  const age = calcAge(birthdayIso, todayIso);
  return age ? `${date} · ${ageText(age)}` : date;
}

// 해당 연도의 생일 날짜. 2/29생은 윤년이 아닌 해에 2/28이에요.
export function anniversaryIn(b: Ymd, year: number): Ymd {
  if (b.m === 2 && b.d === 29 && !isLeapYear(year)) return { y: year, m: 2, d: 28 };
  return { y: year, m: b.m, d: b.d };
}

function dayNumber({ y, m, d }: Ymd): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type BirthdayInfo = {
  isToday: boolean; // 오늘이 생일인지
  daysUntil: number; // 다음 생일까지 남은 날 (오늘이 생일이면 0)
  turnsAge: number; // 다음(또는 오늘) 생일에 몇 살이 되는지
  eventId: string; // 생일 이벤트 식별자 ("birthday:2026"). 보상을 해마다 한 번만 주고 싶을 때 키로 쓰세요
};

// 생일 이벤트/보상용 정보. 아직 화면에서는 쓰지 않고, 나중에 붙일 수 있게 준비해 둔 거예요.
export function getBirthdayInfo(birthdayIso: string, todayIso: string): BirthdayInfo | null {
  const b = parseYmd(birthdayIso);
  const t = parseYmd(todayIso);
  if (!b || !t || toIso(t) < toIso(b)) return null;
  let next = anniversaryIn(b, t.y);
  if (toIso(next) < toIso(t)) next = anniversaryIn(b, t.y + 1);
  const daysUntil = dayNumber(next) - dayNumber(t);
  return {
    isToday: daysUntil === 0,
    daysUntil,
    turnsAge: next.y - b.y,
    eventId: `birthday:${next.y}`,
  };
}
