import React, { useState } from 'react';

export default function TruncatedText({ text, maxLength = 50, modalTitle = "Details" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return <span>-</span>;

  const textStr = String(text);
  const isLong = textStr.length > maxLength;
  const displayText = isLong ? `${textStr.substring(0, maxLength)}...` : textStr;

  return (
    <>
      <span className="whitespace-normal break-words">
        {displayText}
        {isLong && (
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(true); }}
            className="ml-2 text-primary hover:underline font-medium text-xs whitespace-nowrap cursor-pointer inline-flex items-center"
          >
            View More
          </button>
        )}
      </span>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          />
          {/* Modal content */}
          <div 
            className="relative bg-surface-container text-on-surface rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col z-[10000]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-outline-variant">
              <h3 className="text-lg font-bold text-on-surface">{modalTitle}</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed custom-scrollbar">
              {textStr}
            </div>
            <div className="p-5 border-t border-outline-variant flex justify-end">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
