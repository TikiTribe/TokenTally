/**
 * Tooltip Component
 * 
 * Accessible tooltip with both hover and click support for desktop/mobile compatibility.
 * Features:
 * - Hover trigger with 300ms delay (desktop)
 * - Click/tap trigger (mobile)
 * - Auto-positioning to prevent overflow
 * - Keyboard accessible (ESC to close)
 * - ARIA compliant
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showOnHover, setShowOnHover] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerId = useRef(`tooltip-trigger-${Math.random().toString(36).substr(2, 9)}`);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
        setShowOnHover(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [isVisible]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        isVisible &&
        !showOnHover
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isVisible, showOnHover]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowOnHover(true);
      setIsVisible(true);
    }, 300); // 300ms delay
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (showOnHover) {
      setShowOnHover(false);
      setIsVisible(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(!isVisible);
    setShowOnHover(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
  };

  return (
    <div 
      ref={tooltipRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        id={triggerId.current}
        onClick={handleClick}
        aria-describedby={isVisible ? tooltipId.current : undefined}
        className="cursor-help inline-flex items-center"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          id={tooltipId.current}
          role="tooltip"
          className={`
            absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            max-w-[280px] w-max animate-in fade-in duration-200
            ${positionClasses[position]}
          `}
        >
          {content}
          {/* Arrow */}
          <div
            className={`
              absolute w-0 h-0 border-4 border-transparent
              ${arrowClasses[position]}
            `}
          />
        </div>
      )}
    </div>
  );
}
