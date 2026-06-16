interface EmptyStateProps {
  title?: string;
  text?: string;
}

export function EmptyState({ title = '暂无数据', text = '刷新后仍没有内容，可以先新增一条记录。' }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
