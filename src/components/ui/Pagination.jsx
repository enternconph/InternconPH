import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-outline-variant bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">
            Showing <span className="font-bold text-on-surface">Page {currentPage}</span> of{' '}
            <span className="font-bold text-on-surface">{totalPages}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-on-surface-variant ring-1 ring-inset ring-outline-variant hover:bg-surface-container-high focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            
            {pages[0] > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-on-surface ring-1 ring-inset ring-outline-variant hover:bg-surface-container-high focus:z-20 focus:outline-offset-0"
                >
                  1
                </button>
                {pages[0] > 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-on-surface-variant ring-1 ring-inset ring-outline-variant">
                    ...
                  </span>
                )}
              </>
            )}

            {pages.map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                  page === currentPage
                    ? 'z-10 bg-vibrant-orange text-white ring-1 ring-inset ring-vibrant-orange hover:bg-orange-600'
                    : 'text-on-surface ring-1 ring-inset ring-outline-variant hover:bg-surface-container-high'
                }`}
              >
                {page}
              </button>
            ))}

            {pages[pages.length - 1] < totalPages && (
              <>
                {pages[pages.length - 1] < totalPages - 1 && (
                  <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-on-surface-variant ring-1 ring-inset ring-outline-variant">
                    ...
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-on-surface ring-1 ring-inset ring-outline-variant hover:bg-surface-container-high focus:z-20 focus:outline-offset-0"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-on-surface-variant ring-1 ring-inset ring-outline-variant hover:bg-surface-container-high focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
