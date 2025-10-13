import React, { useRef, useEffect, useState } from 'react';
import './Dropdown.css';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, isOpen, onToggle, className = '' }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && dropdownRef.current && menuRef.current) {
      const triggerRect = dropdownRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();

      // Calculate initial position (align right edge of menu with right edge of trigger)
      let left = triggerRect.right - menuRect.width;

      // Check if menu would overflow left side of viewport
      if (left < 0) {
        // Align with left edge of trigger instead
        left = triggerRect.left;
      }

      // Check if menu would overflow right side of viewport
      if (left + menuRect.width > window.innerWidth) {
        // Push it back to fit
        left = window.innerWidth - menuRect.width - 10;
      }

      setPosition({
        top: triggerRect.bottom + 6,
        left: Math.max(10, left) // Ensure at least 10px from left edge
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);

  return (
    <div className={`dropdown-container ${className}`} ref={dropdownRef}>
      <div onClick={onToggle}>
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="dropdown-menu-portal"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 10000
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
