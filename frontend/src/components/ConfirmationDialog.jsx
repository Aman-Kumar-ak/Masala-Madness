import React from 'react';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  onCancel,
  title, 
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  customContent = null
}) => {
  if (!isOpen) return null;

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 active:bg-red-700';
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700';
      default:
        return 'bg-green-500 hover:bg-green-600 active:bg-green-700';
    }
  };

  const getIconByType = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const handleCancel = () => {
    // If onCancel is provided, use it, otherwise just close
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs sm:max-w-md relative animate-scale-in mx-4 overflow-hidden">
        {/* Optional colored bar at top based on type */}
        <div className={`h-1.5 w-full ${
          type === 'danger' ? 'bg-red-500' : 
          type === 'warning' ? 'bg-orange-500' : 
          type === 'info' ? 'bg-blue-500' : 
          'bg-green-500'
        }`}></div>
        
        <div className="p-5 sm:p-6">
          {/* Icon based on dialog type */}
          {getIconByType()}

          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">{title}</h3>
          <p className="text-gray-600 mb-6 text-base text-center">{message}</p>
          
          {/* Render custom content if provided */}
          {customContent && (
            <div className="mb-5 sm:mb-6">
              {customContent}
            </div>
          )}
          
          {/* Only render buttons if confirmText is not null */}
          {confirmText !== null && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onConfirm}
                className={`${getConfirmButtonStyle()} text-white px-5 py-3 rounded-xl flex-1 font-medium transition-all duration-200 text-base shadow-sm hover:shadow`}
              >
                {confirmText}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-100 text-gray-700 px-5 py-3 rounded-xl flex-1 font-medium hover:bg-gray-200 active:bg-gray-300 transition-colors duration-200 text-base"
              >
                {cancelText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;