import React from 'react';
import { useLocation } from 'react-router-dom';

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
