import React from 'react';

/**
 * Base Skeleton component for shimmering placeholder blocks.
 * Matches design system tokens with subtle pulse and shimmer animations.
 */
export function Skeleton({
  className = '',
  variant = 'rounded', // 'text' | 'circular' | 'rectangular' | 'rounded' | 'pill'
  width,
  height,
  style = {},
  ...props
}) {
  const variantClasses = {
    text: 'rounded-md h-4 w-full',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-none w-full',
    rounded: 'rounded-xl w-full',
    pill: 'rounded-full w-full',
  };

  const inlineStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      className={`relative overflow-hidden bg-surface-container-high/60 dark:bg-surface-container-high/40 animate-pulse motion-reduce:animate-none ${
        variantClasses[variant] || 'rounded-xl'
      } ${className}`}
      style={inlineStyles}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-shimmer motion-reduce:hidden" />
    </div>
  );
}

export default Skeleton;

