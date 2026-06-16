export function Loading({ text = '正在加载...' }: { text?: string }) {
  return <div className="loading">{text}</div>;
}
