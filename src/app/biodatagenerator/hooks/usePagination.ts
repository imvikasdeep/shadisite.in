import { useState, useEffect } from 'react';
import { BiodataField, PageInfo } from '../types';
import { calculatePagination } from '../utils/paginationEngine';

/**
 * Hook to manage pagination state and calculations
 */
export const usePagination = (fields: BiodataField[]) => {
    const [pageContentMap, setPageContentMap] = useState<PageInfo[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    useEffect(() => {
        const pages = calculatePagination(fields);
        setPageContentMap(pages);

        // Keep the current page view, or reset if it's out of bounds
        setCurrentPageIndex(prev => Math.min(prev, pages.length - 1));
        if (pages.length === 0) setCurrentPageIndex(0);
    }, [fields]);

    const totalPages = pageContentMap.length;
    const currentPageData = pageContentMap[currentPageIndex] || { fields: [], prevPageEndGroup: null };

    return {
        pageContentMap,
        currentPageIndex,
        setCurrentPageIndex,
        totalPages,
        currentPageData
    };
};
