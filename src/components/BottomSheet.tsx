import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

export type SheetSnapState = 'collapsed' | 'half' | 'expanded';

interface BottomSheetProps {
  state: SheetSnapState;
  onStateChange: (newState: SheetSnapState) => void;
  headerContent?: React.ReactNode;
  collapsedPreview?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  id?: string;
}

// Target snap point percentages (relative to viewport height)
// collapsed: ~16vh, half: ~52vh, expanded: ~88vh
const SNAP_PERCENTAGES: Record<SheetSnapState, number> = {
  collapsed: 16,
  half: 52,
  expanded: 88,
};

export function BottomSheet({
  state,
  onStateChange,
  headerContent,
  collapsedPreview,
  children,
  className = '',
  ariaLabel = 'Interactive panel',
  id,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Gesture state
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(0);
  const dragSourceRef = useRef<'handle' | 'content'>('handle');

  // Live transform offset during drag (in pixels)
  const [dragOffsetPx, setDragOffsetPx] = useState<number | null>(null);

  // Check reduced motion preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // Compute translation in pixels for a given state
  const getTranslateYForState = useCallback((snapState: SheetSnapState): number => {
    if (typeof window === 'undefined') return 0;
    const vh = window.innerHeight;
    const expandedHeight = (vh * SNAP_PERCENTAGES.expanded) / 100;
    const currentHeight = (vh * SNAP_PERCENTAGES[snapState]) / 100;
    // translateY is how far down from expanded height the top of the sheet sits
    return Math.max(0, expandedHeight - currentHeight);
  }, []);

  // Handle pointer down (mouse or touch)
  const handlePointerDown = useCallback((e: React.PointerEvent, source: 'handle' | 'content') => {
    // Only primary button
    if (e.button !== 0) return;

    // If source is content, only allow dragging when scrolled to top
    if (source === 'content') {
      const scrollEl = contentRef.current;
      if (scrollEl && scrollEl.scrollTop > 5) {
        return; // User is scrolling inner content
      }
    }

    isDraggingRef.current = true;
    dragSourceRef.current = source;
    startYRef.current = e.clientY;
    currentYRef.current = e.clientY;
    startTimeRef.current = Date.now();

    // Capture pointer
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    currentYRef.current = e.clientY;
    const deltaY = currentYRef.current - startYRef.current;

    // If drag started in content and user is scrolling content down, don't drag sheet up
    if (dragSourceRef.current === 'content') {
      const scrollEl = contentRef.current;
      if (scrollEl && scrollEl.scrollTop > 0) {
        return;
      }
      // If at expanded state and dragging upwards, allow native scroll
      if (state === 'expanded' && deltaY < 0) {
        return;
      }
    }

    // Apply elastic resistance at extreme bounds
    let dampenedDelta = deltaY;
    if (state === 'expanded' && deltaY < 0) {
      dampenedDelta = deltaY * 0.25; // resistance dragging higher than expanded
    } else if (state === 'collapsed' && deltaY > 0) {
      dampenedDelta = deltaY * 0.25; // resistance dragging lower than collapsed
    }

    setDragOffsetPx(dampenedDelta);
  }, [state]);

  // Handle pointer up/end
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }

    const deltaY = currentYRef.current - startYRef.current;
    const deltaTime = Math.max(1, Date.now() - startTimeRef.current);
    const velocity = deltaY / deltaTime; // positive = downward, negative = upward

    setDragOffsetPx(null);

    // Fast flick/swipe detection (velocity threshold ~0.35 px/ms)
    if (velocity < -0.35) {
      // Swiping up
      if (state === 'collapsed') {
        onStateChange('half');
      } else if (state === 'half') {
        onStateChange('expanded');
      }
      return;
    }

    if (velocity > 0.35) {
      // Swiping down
      if (state === 'expanded') {
        onStateChange('half');
      } else if (state === 'half') {
        onStateChange('collapsed');
      }
      return;
    }

    // Distance threshold snapping (drag > 50px)
    if (deltaY < -55) {
      // Dragged up
      if (state === 'collapsed') {
        onStateChange(deltaY < -180 ? 'expanded' : 'half');
      } else if (state === 'half') {
        onStateChange('expanded');
      }
    } else if (deltaY > 55) {
      // Dragged down
      if (state === 'expanded') {
        onStateChange(deltaY > 180 ? 'collapsed' : 'half');
      } else if (state === 'half') {
        onStateChange('collapsed');
      }
    }
  }, [state, onStateChange]);

  // Keyboard navigation on handle
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state === 'collapsed') onStateChange('half');
      else if (state === 'half') onStateChange('expanded');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state === 'expanded') onStateChange('half');
      else if (state === 'half') onStateChange('collapsed');
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state === 'collapsed') onStateChange('half');
      else if (state === 'half') onStateChange('expanded');
      else onStateChange('collapsed');
    }
  }, [state, onStateChange]);

  // Cycle toggle action for chevron buttons
  const handleCollapseClick = useCallback(() => {
    if (state === 'expanded') onStateChange('half');
    else if (state === 'half') onStateChange('collapsed');
  }, [state, onStateChange]);

  const handleExpandClick = useCallback(() => {
    if (state === 'collapsed') onStateChange('half');
    else if (state === 'half') onStateChange('expanded');
  }, [state, onStateChange]);

  // Compute inline transform style
  const baseTranslateY = getTranslateYForState(state);
  const activeTranslateY = baseTranslateY + (dragOffsetPx ?? 0);

  const isActivelyDragging = dragOffsetPx !== null;

  const sheetStyle: React.CSSProperties = {
    transform: `translate3d(0, ${Math.max(0, activeTranslateY)}px, 0)`,
    transition: isActivelyDragging || prefersReducedMotion
      ? 'none'
      : 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <section
      ref={sheetRef}
      className={`kpn-unified-bottom-sheet is-${state} ${className}`}
      style={sheetStyle}
      aria-label={ariaLabel}
      id={id}
    >
      {/* 1. ACCESSIBLE DRAG HANDLE & PULL AREA */}
      <div
        className="kpn-sheet-drag-touch-area"
        onPointerDown={(e) => handlePointerDown(e, 'handle')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Drag handle. Currently ${state}. Tap or swipe to change height.`}
      >
        <span className="kpn-drag-bar" />
      </div>

      {/* 2. SHEET TOP CONTROL BAR */}
      <div
        className="kpn-sheet-top-bar"
        onPointerDown={(e) => handlePointerDown(e, 'handle')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="kpn-sheet-top-content">
          {state === 'collapsed' && collapsedPreview ? collapsedPreview : headerContent}
        </div>

        {/* Quick state navigation controls */}
        <div className="kpn-sheet-state-controls" onClick={(e) => e.stopPropagation()}>
          {state !== 'collapsed' && (
            <button
              type="button"
              className="kpn-sheet-state-btn"
              onClick={handleCollapseClick}
              aria-label="Collapse panel downwards"
              title="Collapse"
            >
              <ChevronDownIcon size={18} />
            </button>
          )}

          {state !== 'expanded' && (
            <button
              type="button"
              className="kpn-sheet-state-btn"
              onClick={handleExpandClick}
              aria-label="Expand panel upwards"
              title="Expand"
            >
              <ChevronUpIcon size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 3. SCROLLABLE SHEET BODY */}
      <div
        ref={contentRef}
        className="kpn-sheet-inner-scroll"
        onPointerDown={(e) => handlePointerDown(e, 'content')}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </section>
  );
}
