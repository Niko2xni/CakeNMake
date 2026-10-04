import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';

// Reusable scrollbar matching the Messages panel's custom track + thumb design
// originally built for Chats.jsx. Wrap any vertical scrollable content with this
// instead of the browser's native scrollbar.
export default function CustomScrollbar({ className = '', contentClassName = '', children }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const dragStateRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [thumbMetrics, setThumbMetrics] = useState({ top: 0, height: 0, visible: false });

  function getTrackMetrics(el) {
    const trackHeight = el.clientHeight - 40;
    const thumbHeight = Math.max(24, (el.clientHeight / el.scrollHeight) * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    return { thumbHeight, maxThumbTop, maxScroll };
  }

  function updateThumbMetrics() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    let next;
    if (scrollHeight - clientHeight <= 1) {
      next = { top: 0, height: 0, visible: false };
    } else {
      const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
      next = { top: thumbTop, height: thumbHeight, visible: true };
    }
    setThumbMetrics((prev) => {
      const same =
        prev.visible === next.visible &&
        Math.abs(prev.top - next.top) < 0.5 &&
        Math.abs(prev.height - next.height) < 0.5;
      return same ? prev : next;
    });
  }

  function scrollUp() {
    scrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  }
  function scrollDown() {
    scrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  }

  function handleTrackClick(e) {
    if (justDraggedRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
    const desiredThumbTop = Math.min(maxThumbTop, Math.max(0, clickY - thumbHeight / 2));
    const scrollRatio = maxThumbTop > 0 ? desiredThumbTop / maxThumbTop : 0;
    el.scrollTo({ top: scrollRatio * maxScroll, behavior: 'smooth' });
  }

  function handleThumbMouseDown(e) {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    dragStateRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    window.addEventListener('mousemove', handleThumbMouseMove);
    window.addEventListener('mouseup', handleThumbMouseUp);
  }

  function handleThumbMouseMove(e) {
    const el = scrollRef.current;
    const drag = dragStateRef.current;
    if (!el || !drag) return;
    const { maxThumbTop, maxScroll } = getTrackMetrics(el);
    if (maxThumbTop <= 0) return;
    const deltaScroll = ((e.clientY - drag.startY) / maxThumbTop) * maxScroll;
    el.scrollTop = Math.min(maxScroll, Math.max(0, drag.startScrollTop + deltaScroll));
    updateThumbMetrics();
  }

  function handleThumbMouseUp() {
    dragStateRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);
    window.removeEventListener('mousemove', handleThumbMouseMove);
    window.removeEventListener('mouseup', handleThumbMouseUp);
  }

  useLayoutEffect(() => {
    updateThumbMetrics();
  });

  useEffect(() => {
    window.addEventListener('resize', updateThumbMetrics);
    const ro = new ResizeObserver(updateThumbMetrics);
    if (scrollRef.current) ro.observe(scrollRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener('resize', updateThumbMetrics);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative min-h-0 ${className}`}>
      {thumbMetrics.visible && (
        <div className="absolute top-0 right-0 h-full w-5 flex flex-col z-10">
          <button
            type="button"
            onClick={scrollUp}
            aria-label="Scroll up"
            className="h-5 flex-shrink-0 flex items-center justify-center text-primary/60 hover:text-primary text-[10px] leading-none transition-colors cursor-pointer"
          >
            ▲
          </button>
          <div onClick={handleTrackClick} className="relative flex-1 cursor-pointer bg-muted/30 rounded-full my-0.5">
            <div
              onMouseDown={handleThumbMouseDown}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 -translate-x-1/2 w-2.5 bg-primary/40 hover:bg-primary/70 rounded-full transition-colors cursor-grab active:cursor-grabbing shadow-sm"
              style={{ top: thumbMetrics.top, height: thumbMetrics.height }}
            />
          </div>
          <button
            type="button"
            onClick={scrollDown}
            aria-label="Scroll down"
            className="h-5 flex-shrink-0 flex items-center justify-center text-primary/60 hover:text-primary text-[10px] leading-none transition-colors cursor-pointer"
          >
            ▼
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={updateThumbMetrics}
        className={`h-full overflow-y-auto ${thumbMetrics.visible ? 'pr-6' : ''} [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
      >
        <div ref={contentRef} className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}