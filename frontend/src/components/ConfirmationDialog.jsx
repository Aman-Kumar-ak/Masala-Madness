import React from 'react';

const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  onCancel,  // Add support for cancel action
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
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs sm:max-w-sm relative animate-scale-in mx-4">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">{message}</p>
          
          {/* Render custom content if provided */}
          {customContent && (
            <div className="mb-4 sm:mb-6">
              {customContent}
            </div>
          )}
          
          {/* Only render buttons if confirmText is not null */}
          {confirmText !== null && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onConfirm}
                className={`${getConfirmButtonStyle()} text-white px-4 py-2 rounded-lg flex-1 font-medium transition-colors duration-200`}
              >
                {confirmText}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex-1 font-medium hover:bg-gray-200 transition-colors duration-200"
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