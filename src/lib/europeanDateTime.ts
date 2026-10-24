const EUROPEAN_DATE_TIME_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;

export function formatEuropeanDateTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  const hour = digits.slice(8, 10);
  const minute = digits.slice(10, 12);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  if (digits.length <= 8) return `${day}/${month}/${year}`;
  if (digits.length <= 10) return `${day}/${month}/${year} ${hour}`;
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export function isValidEuropeanDateTime(value: string): boolean {
  const match = value.match(EUROPEAN_DATE_TIME_PATTERN);
  if (!match) return false;

  const [, dayRaw, monthRaw, yearRaw, hourRaw, minuteRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!day || !month || month < 1 || month > 12 || hour > 23 || minute > 59) return false;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute;
}
