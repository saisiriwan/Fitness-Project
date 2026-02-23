import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toRFC3339String(date: Date): string {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  const timezoneOffset = -date.getTimezoneOffset();
  const diff = timezoneOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(timezoneOffset);
  const hoursOffset = Math.floor(absOffset / 60);
  const minutesOffset = absOffset % 60;

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds()) +
    diff +
    pad(hoursOffset) +
    ":" +
    pad(minutesOffset)
  );
}
