import type { DatePreset } from '../types';

const pad = (value: number) => String(value).padStart(2, '0');

export function todayString(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthDay(dateString: string): string {
  const [, month, day] = dateString.split('-');
  return `${month}-${day}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getDateRange(preset: DatePreset, customStart?: string, customEnd?: string) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === 'yesterday') {
    start.setDate(now.getDate() - 1);
    end.setDate(now.getDate() - 1);
  }

  if (preset === 'week') {
    const day = now.getDay() || 7;
    start.setDate(now.getDate() - day + 1);
  }

  if (preset === 'month') {
    start.setDate(1);
  }

  if (preset === 'custom') {
    return {
      startDate: customStart || todayString(),
      endDate: customEnd || customStart || todayString()
    };
  }

  return {
    startDate: todayString(start),
    endDate: todayString(end)
  };
}

export function isBetweenDate(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

export function sortByDateDesc<T extends { date: string; createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => `${b.date}${b.createdAt ?? ''}`.localeCompare(`${a.date}${a.createdAt ?? ''}`));
}
