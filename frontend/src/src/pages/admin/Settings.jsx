import React, { useState, useEffect } from 'react';

const [editUserLoading, setEditUserLoading] = useState(false);

// State to manage expanded user cards
const [expandedUsers, setExpandedUsers] = useState(new Set());

// State to determine if it's a desktop view
const [isDesktopView, setIsDesktopView] = useState(false);

// Function to toggle expanded state of a user card
const toggleExpandUser = (userId) => {
  setExpandedUsers(prev => {
    const newSet = new Set(prev);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    return newSet;
  });
};

// Effect to detect desktop view based on screen width
useEffect(() => {
  const handleResize = () => {
    // Tailwind's 'md' breakpoint is typically 768px
    setIsDesktopView(window.innerWidth >= 768);
  };

  // Set initial value
  handleResize();

  // Add event listener for window resize
  window.addEventListener('resize', handleResize);

  // Clean up event listener
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);


// Add state for delete confirmation
const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false); 