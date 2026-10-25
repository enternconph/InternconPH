import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 4,
  },
  in: {
    opacity: 1,
    y: 0,
    transitionEnd: {
      transform: 'none',
    },
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15,
};

export default function PageTransition({ children, className = '' }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="in"
      variants={pageVariants}
      transition={pageTransition}
      className={`w-full max-w-full min-w-0 h-full overflow-x-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
}
