import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBluetooth } from '../contexts/BluetoothContext';

export default function PosStatusIndicator() {
  const { isConnected, error, connect } = useBluetooth();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [showNotification, setShowNotification] = useState(false);
  const timeoutRef = useRef(null);
  const dotRef = useRef(null);

  // Determine color classes
  let colorClass = 'bg-red-400 border-red-600';
  let statusText = 'POS Not Connected';
  if (isConnected) {
    colorClass = 'bg-green-400 border-green-600';
    statusText = 'POS Connected';
  } else if (error) {
    colorClass = 'bg-yellow-300 border-yellow-500';
    statusText = 'POS Error';
  }

  // Show notification when connected
  useEffect(() => {
    if (isConnected) {
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Show tooltip for 1 second on hover or click
  const showStatus = () => {
    if (dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      let left = rect.left + window.scrollX + rect.width / 2;
      let top = rect.top + window.scrollY - 2;
      // Clamp tooltip to viewport for small screens
      const minMargin = 6; // px
      const tooltipWidth = 120; // estimate, px
      const screenWidth = window.innerWidth;
      // Calculate left for tooltip center
      let leftClamped = left;
      if (screenWidth < 380) {
        // Clamp so tooltip doesn't overflow
        const halfTooltip = tooltipWidth / 2;
        if (left - halfTooltip < minMargin) leftClamped = minMargin + halfTooltip;
        if (left + halfTooltip > screenWidth - minMargin) leftClamped = screenWidth - minMargin - halfTooltip;
      }
      setTooltipPos({ top, left: leftClamped });
    }
    setShowTooltip(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowTooltip(false), 1000);
  };

  useEffect(() => {
    if (!showTooltip) return;
    // Hide tooltip on scroll or global touch
    const hide = () => setShowTooltip(false);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('touchstart', hide, true);
    window.addEventListener('mousedown', hide, true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      window.removeEventListener('scroll', hide, { passive: true });
      window.removeEventListener('touchstart', hide, true);
      window.removeEventListener('mousedown', hide, true);
    };
  }, [showTooltip]);

  return (
    <span className="relative inline-block">
      <span
        ref={dotRef}
        className={`h-6 w-6 rounded-full inline-block border-4 ${colorClass} shadow-md transition-colors duration-200 cursor-pointer`}
        title={statusText}
        onMouseEnter={showStatus}
        onClick={showStatus}
        onTouchStart={showStatus}
      />
      {!isConnected && (
        <button
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
          onClick={connect}
        >
          Connect POS
        </button>
      )}
      {showTooltip && typeof window !== 'undefined' && createPortal(
        <span
          className="fixed z-[99999] px-2 py-1 rounded bg-gray-900 text-white text-xs sm:text-sm whitespace-nowrap shadow-lg animate-fade-in"
          style={{
            top: tooltipPos.top - 24,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            minWidth: 80,
            maxWidth: 180,
            textAlign: 'center',
          }}
        >
          {statusText}
        </span>,
        document.body
      )}
      {showNotification && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-green-600 text-white rounded shadow-lg text-xs animate-fade-in">
          POS Connected
        </div>
      )}
      {error && !isConnected && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-4 py-2 bg-yellow-500 text-white rounded shadow-lg text-xs animate-fade-in">
          {error}
        </div>
      )}
    </span>
  );
}

// Add fade-in animation
// In your global CSS (e.g., index.css or tailwind config):
// .animate-fade-in { animation: fadeIn 0.15s ease; }
// @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } 