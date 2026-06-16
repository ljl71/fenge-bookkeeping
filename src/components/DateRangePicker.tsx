import type { DatePreset } from '../types';

interface DateRangePickerProps {
  preset: DatePreset;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: DatePreset) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

const presets: Array<{ value: DatePreset; label: string }> = [
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
];

export function DateRangePicker({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onStartChange,
  onEndChange
}: DateRangePickerProps) {
  return (
    <div className="field-group">
      <span className="field-label">日期范围</span>
      <div className="segmented">
        {presets.map((item) => (
          <button
            key={item.value}
            type="button"
            className={preset === item.value ? 'is-selected' : ''}
            onClick={() => onPresetChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="two-cols">
          <label className="field">
            <span>开始</span>
            <input type="date" value={startDate} onChange={(event) => onStartChange(event.target.value)} />
          </label>
          <label className="field">
            <span>结束</span>
            <input type="date" value={endDate} onChange={(event) => onEndChange(event.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
