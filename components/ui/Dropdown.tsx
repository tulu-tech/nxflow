'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'center' | 'left' | 'right';
  width?: number;
}

export function Dropdown({ children, anchorRef, open, onClose, align = 'center', width = 200 }: Props) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const dropRef = useRef<HTMLDivElement>(null);

  // Calculate position from anchor
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    let left = rect.left + rect.width / 2;
    if (align === 'left') left = rect.left;
    if (align === 'right') left = rect.right - width;
    if (align === 'center') left = rect.left + rect.width / 2 - width / 2;

    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const top = rect.bottom + 4;

    setPos({ top, left });
  }, [open, anchorRef, align, width]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={dropRef}
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        minWidth: width,
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
}
