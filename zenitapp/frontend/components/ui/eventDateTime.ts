export interface EventDateTimeProps {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  disabled?: boolean;
}

const pad = (part: number) => String(part).padStart(2, "0");

export function localDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function displayDate(value: string) {
  return value.split("-").reverse().join("/");
}

export function combineLocalDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const value = new Date(`${date}T${time}:00`);
  if (
    Number.isNaN(value.getTime()) ||
    localDateValue(value) !== date ||
    localTimeValue(value) !== time
  ) return null;
  return value;
}
