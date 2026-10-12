import React, { useState } from 'react';

interface BottomSheetProps {
  children: React.ReactNode;
  title: string;
  count?: number;
}

export function BottomSheet({ children, title, count }: BottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`kpn-bottom-sheet ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      <div
        className="kpn-sheet-handle-bar"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <div className="kpn-sheet-pill" />
        <div className="kpn-sheet-header-info">
          <strong>{title}</strong>
          {count !== undefined && <span className="kpn-sheet-count">{count}</span>}
          <span className="kpn-sheet-chevron">{isOpen ? '▼ Collapse' : '▲ View List'}</span>
        </div>
      </div>
      <div className="kpn-sheet-content">{children}</div>
    </div>
  );
}
