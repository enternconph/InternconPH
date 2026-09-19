import React from 'react';

export default function LoadingSpinner({ fullScreen = false, message = "Loading data..." }) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-vibrant-orange border-t-transparent shadow-lg"></div>
      <p className="text-sm font-bold text-on-surface-variant animate-pulse">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center py-12">
      {content}
    </div>
  );
}
