import type { ReactNode } from 'react';

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  tone?: 'income' | 'expense' | 'neutral';
}

export function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  return (
    <div className={`summary-card summary-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
