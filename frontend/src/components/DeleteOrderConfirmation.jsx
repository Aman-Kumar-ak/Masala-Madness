import React from 'react';
import ConfirmationDialog from './ConfirmationDialog';

const DeleteOrderConfirmation = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderNumber 
}) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Order"
      message={`Are you sure you want to delete Order #${orderNumber}? This action cannot be undone.`}
      confirmText="Delete Order"
      cancelText="Cancel"
      type="danger"
    />
  );
};

export default DeleteOrderConfirmation; 