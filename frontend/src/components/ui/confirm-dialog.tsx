'use client';

import { Modal } from '@/components/modal';

/** تأكيد حذف / إجراء خطير بدون reload */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onClose}>
      <div className="modal-panel surface-card p-5 sm:p-6 space-y-4" style={{ width: 'min(100%, 24rem)' }}>
        <h2 className="font-display font-extrabold text-lg text-[var(--teal-dark)] m-0">{title}</h2>
        {description ? <p className="text-sm text-[var(--muted)] m-0 leading-7">{description}</p> : null}
        <div className="flex gap-2 justify-end flex-wrap">
          <button type="button" className="btn-ghost text-sm" disabled={loading} onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${danger ? 'btn-orange' : 'btn-teal'} text-sm disabled:opacity-50`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
