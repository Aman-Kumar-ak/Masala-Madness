import React, { useEffect } from 'react';

const Modal = ({ children, onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={onClose}>
      <div
        className="relative bg-white rounded-lg shadow-lg max-w-full"
        style={{ minWidth: 320, maxWidth: 400 }}
        onClick={e => e.stopPropagation()}
      >
        {children}
        {onClose && (
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal; 