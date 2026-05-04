/** 미국 동부시간(ET) 기준 오늘 날짜 YYYY-MM-DD 반환. DST 자동 처리. */
export function getTodayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date())
}
