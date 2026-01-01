'use client';
import React from 'react';

interface PageNavigationProps {
    currentPageIndex: number;
    totalPages: number;
    onPageChange: (pageIndex: number) => void;
}

const PageNavigation: React.FC<PageNavigationProps> = ({
    currentPageIndex,
    totalPages,
    onPageChange,
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center space-x-3 mb-3 text-sm font-medium text-gray-600">
            <button
                onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                </svg>
            </button>

            <span>
                Page <span className="text-fuchsia-600 font-bold">{currentPageIndex + 1}</span> of <span className="font-bold">{totalPages}</span>
            </span>

            <button
                onClick={() => onPageChange(Math.min(totalPages - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === totalPages - 1}
                className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 0 0 .708L10.293 8l-5.647 5.646a.5.5 0 0 0 .708.708l6-6a.5.5 0 0 0 0-.708l-6-6a.5.5 0 0 0-.708 0z" />
                </svg>
            </button>
        </div>
    );
};

export default PageNavigation;
