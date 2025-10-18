import { useRef, useEffect } from 'react';
import type { RefObject } from 'react';

interface UseDragToScrollOptions {
  disabled?: boolean;
}

export const useDragToScroll = <T extends HTMLElement>(
  options: UseDragToScrollOptions = {}
): RefObject<T | null> => {
  const { disabled = false } = options;
  const ref = useRef<T>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);
  const hasMoved = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

            // Don't start drag on inputs or elements with data-no-drag
      const target = e.target as HTMLElement;
      if (target.closest('[data-no-drag="true"]')) {
        return;
      }

      // Only prevent default if element is horizontally scrollable
      if (element.scrollWidth > element.clientWidth) {
        e.preventDefault();
      }

      isDragging.current = true;
      hasMoved.current = false;
      startX.current = e.clientX;
      startY.current = e.clientY;
      scrollLeft.current = element.scrollLeft;
      scrollTop.current = element.scrollTop;

      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
    };

    const handleDragStart = (e: DragEvent) => {
      // Prevent native drag and drop (prevents red circle cursor on images/links)
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;

      e.preventDefault();

      const deltaX = e.clientX - startX.current;
      const deltaY = e.clientY - startY.current;

      // Check if user has moved enough to consider it a drag
      if (!hasMoved.current && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        hasMoved.current = true;
        element.classList.add('is-dragging');
      }

      if (hasMoved.current) {
        element.scrollLeft = scrollLeft.current - deltaX;
        element.scrollTop = scrollTop.current - deltaY;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      element.style.cursor = 'grab';
      element.style.userSelect = '';
      element.classList.remove('is-dragging');

      // If the user didn't move much, allow the click to propagate
      if (!hasMoved.current) {
        // Let the click event fire normally
        return;
      }

      // Prevent click events if it was a drag
      const preventClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        element.removeEventListener('click', preventClick, true);
      };

      element.addEventListener('click', preventClick, true);
      setTimeout(() => {
        element.removeEventListener('click', preventClick, true);
      }, 0);

      hasMoved.current = false;
    };

    const handleMouseLeave = () => {
      if (isDragging.current) {
        isDragging.current = false;
        element.style.cursor = 'grab';
        element.style.userSelect = '';
        element.classList.remove('is-dragging');
        hasMoved.current = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // For horizontal scroll containers, convert vertical wheel to horizontal scroll
      if (element.scrollWidth > element.clientWidth) {
        e.preventDefault();
        element.scrollLeft += e.deltaY;
      }
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('wheel', handleWheel, { passive: false });

    // Set initial cursor
    element.style.cursor = 'grab';

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('wheel', handleWheel);
      element.style.cursor = '';
      element.style.userSelect = '';
    };
  }, [disabled]);

  return ref;
};
