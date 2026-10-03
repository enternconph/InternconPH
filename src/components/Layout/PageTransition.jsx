import React from 'react';
import { useLocation } from 'react-router-dom';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  in: {
    opacity: 1,
    y: 0,
  },
  out: {
    opacity: 0,
    y: -10,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3,
};

export default function PageTransition({ children, className = '' }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={`w-full max-w-full min-w-0 h-full overflow-x-hidden ${className}`}
    >
      {children}
    </div>
  );
}
