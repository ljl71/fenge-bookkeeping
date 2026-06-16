interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, message, danger, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="dialog__actions">
          <button type="button" className="button button--ghost" onClick={onCancel}>
            取消
          </button>
          <button type="button" className={danger ? 'button button--danger' : 'button button--primary'} onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
