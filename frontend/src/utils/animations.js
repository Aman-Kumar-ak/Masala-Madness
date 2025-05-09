// Animation utility for Masala Madness
// This file contains reusable animations for components

// Performance optimized animations - reduced duration and complexity
// Hardware acceleration hint with translateZ for better GPU usage
export const fadeIn = {
  initial: { opacity: 0, translateZ: 0 },
  animate: { opacity: 1, translateZ: 0 },
  exit: { opacity: 0, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 15, translateZ: 0 },
  animate: { opacity: 1, y: 0, translateZ: 0 },
  exit: { opacity: 0, y: 15, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const fadeInDown = {
  initial: { opacity: 0, y: -15, translateZ: 0 },
  animate: { opacity: 1, y: 0, translateZ: 0 },
  exit: { opacity: 0, y: -15, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -15, translateZ: 0 },
  animate: { opacity: 1, x: 0, translateZ: 0 },
  exit: { opacity: 0, x: -15, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const fadeInRight = {
  initial: { opacity: 0, x: 15, translateZ: 0 },
  animate: { opacity: 1, x: 0, translateZ: 0 },
  exit: { opacity: 0, x: 15, translateZ: 0 },
  transition: { duration: 0.2 }
};

// Scale animations
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95, translateZ: 0 },
  animate: { opacity: 1, scale: 1, translateZ: 0 },
  exit: { opacity: 0, scale: 0.95, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const scaleUp = {
  initial: { opacity: 0, scale: 0.9, translateZ: 0 },
  animate: { opacity: 1, scale: 1, translateZ: 0 },
  exit: { opacity: 0, scale: 0.9, translateZ: 0 },
  transition: { duration: 0.2 }
};

// Special animations - optimized for smoother performance
export const modalAnimation = {
  initial: { opacity: 0, scale: 0.95, y: 5, translateZ: 0 },
  animate: { opacity: 1, scale: 1, y: 0, translateZ: 0 },
  exit: { opacity: 0, scale: 0.95, y: 5, translateZ: 0 },
  transition: { 
    type: "tween", // Use tween instead of spring for more predictable performance
    duration: 0.15,
    ease: "easeOut"
  }
};

export const notificationAnimation = {
  initial: { opacity: 0, x: 20, translateZ: 0 },
  animate: { opacity: 1, x: 0, translateZ: 0 },
  exit: { opacity: 0, x: 20, translateZ: 0 },
  transition: { 
    type: "tween",
    duration: 0.15,
    ease: "easeOut"
  }
};

export const dropdownAnimation = {
  initial: { opacity: 0, scaleY: 0.95, transformOrigin: "top", translateZ: 0 },
  animate: { opacity: 1, scaleY: 1, transformOrigin: "top", translateZ: 0 },
  exit: { opacity: 0, scaleY: 0.95, transformOrigin: "top", translateZ: 0 },
  transition: { duration: 0.15 }
};

export const buttonHoverAnimation = {
  scale: 1.03,
  transition: { duration: 0.15 }
};

export const pageFadeIn = {
  initial: { opacity: 0, translateZ: 0 },
  animate: { opacity: 1, translateZ: 0 },
  exit: { opacity: 0, translateZ: 0 },
  transition: { duration: 0.2 }
};

export const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.05 // Faster stagger for smoother appearance
    }
  }
};

export const listItem = {
  initial: { opacity: 0, y: 10, translateZ: 0 },
  animate: { opacity: 1, y: 0, translateZ: 0 },
  exit: { opacity: 0, y: 10, translateZ: 0 },
  transition: { duration: 0.15 }
};

// CSS animation classes (for components that don't use Framer Motion)
export const cssAnimationClasses = {
  fadeIn: 'animate-fadeIn',
  fadeInUp: 'animate-fadeInUp',
  fadeInDown: 'animate-fadeInDown',
  slideIn: 'animate-slideIn',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin'
};

// Timing functions - optimized for performance
export const timingFunctions = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1]
};

// Animation durations - reduced for better performance
export const durations = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3
}; 