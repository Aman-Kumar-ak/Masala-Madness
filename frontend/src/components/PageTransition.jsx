import React from 'react';
import { motion } from 'framer-motion';
import { pageFadeIn } from '../utils/animations';

/**
 * PageTransition component for wrapping pages with smooth animations
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be animated
 * @param {string} [props.transitionType='fade'] - Type of transition animation ('fade', 'slide', 'scale')
 * @param {number} [props.duration=0.5] - Duration of the animation in seconds
 * @param {Object} [props.className=''] - Additional CSS classes
 * @returns {React.ReactNode} Animated component
 */
const PageTransition = ({ children, transitionType = 'fade', duration = 0.5, className = '' }) => {
  // Define animation variants based on transition type
  const getAnimationVariants = () => {
    switch (transitionType) {
      case 'slide':
        return {
          initial: { opacity: 0, x: -30 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: 30 }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 1.1 }
        };
      case 'slideUp':
        return {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          exit: { opacity: 0, y: -30 }
        };
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={{ 
        duration, 
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Staggered container for list items with animations
 * 
 * @param {Object} props - Component props 
 * @param {React.ReactNode} props.children - Child components to be animated
 * @param {number} [props.staggerDelay=0.1] - Delay between each child animation
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactNode} Animated container with staggered children
 */
export const StaggerContainer = ({ children, staggerDelay = 0.1, className = '' }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Animated item for use within StaggerContainer
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be animated
 * @param {Object} [props.customVariants=null] - Custom animation variants
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {React.ReactNode} Animated item
 */
export const StaggerItem = ({ children, customVariants = null, className = '' }) => {
  // Default animation for stagger items
  const defaultVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 15 }
  };

  return (
    <motion.div
      variants={customVariants || defaultVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition; 