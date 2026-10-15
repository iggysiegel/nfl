import { X } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import s from './Dialog.module.css';

interface DialogProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  /** Widest the sheet is allowed to get, in pixels. */
  width?: number;
  children: ReactNode;
}

export function Dialog({ open, title, onClose, width = 440, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // Everything that dismisses the sheet goes through the element's own close(), so the
  // native close event below is the single place the parent is told.
  const dismiss = () => ref.current?.close();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      style={{ '--dialog-max': `${width}px` } as CSSProperties}
      aria-label={typeof title === 'string' ? title : undefined}
      onClose={onClose}
      // The backdrop belongs to the dialog element, so a click landing on the element
      // itself rather than on its contents is a click outside the sheet.
      onClick={(event) => {
        if (event.target === ref.current) dismiss();
      }}
    >
      <header className={s.header}>
        <h3>{title}</h3>
        <button type="button" aria-label="Close" className="icon-button" onClick={dismiss}>
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </header>
      <div className={s.body}>{children}</div>
    </dialog>
  );
}
