import { useEffect, useRef } from 'react';

/**
 * Enables mouse click-and-drag scrolling on an element or the window.
 * Allows users to click and drag to scroll vertically and horizontally.
 */
export function useDragToScroll({ enabled = true, isContainer = false, maxMobileWidth = 720 } = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let isDown = false;
    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let startScrollLeft = 0;
    let hasMoved = false;
    let prevUserSelect = '';
    let prevWebkitUserSelect = '';

    const targetNode = isContainer ? containerRef.current : window;
    if (isContainer && !targetNode) return;

    const handleMouseDown = (e) => {
      // Drag-to-scroll is only active in mobile view (screen width <= maxMobileWidth)
      if (typeof window !== 'undefined' && window.innerWidth > maxMobileWidth) return;
      if (e.button !== 0) return;
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
        return;
      }

      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      if (isContainer && containerRef.current) {
        startScrollTop = containerRef.current.scrollTop;
        startScrollLeft = containerRef.current.scrollLeft;
      } else {
        startScrollTop = window.scrollY || document.documentElement.scrollTop;
        startScrollLeft = window.scrollX || document.documentElement.scrollLeft;
      }
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMoved = true;
        prevUserSelect = document.body.style.userSelect;
        prevWebkitUserSelect = document.body.style.webkitUserSelect;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
      }

      if (hasMoved) {
        if (e.cancelable) e.preventDefault();
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
        if (isContainer && containerRef.current) {
          containerRef.current.scrollTop = startScrollTop - dy;
          containerRef.current.scrollLeft = startScrollLeft - dx;
        } else {
          window.scrollTo({
            top: startScrollTop - dy,
            left: startScrollLeft - dx,
            behavior: 'instant',
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDown && hasMoved) {
        document.body.style.userSelect = prevUserSelect;
        document.body.style.webkitUserSelect = prevWebkitUserSelect;
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
        const captureClick = (clickEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
          window.removeEventListener('click', captureClick, true);
        };
        window.addEventListener('click', captureClick, true);
        setTimeout(() => window.removeEventListener('click', captureClick, true), 100);
      }
      isDown = false;
      hasMoved = false;
    };

    const attachTo = isContainer && containerRef.current ? containerRef.current : window;
    attachTo.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });

    return () => {
      document.body.style.userSelect = prevUserSelect;
      document.body.style.webkitUserSelect = prevWebkitUserSelect;
      attachTo.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, isContainer]);

  return containerRef;
}

