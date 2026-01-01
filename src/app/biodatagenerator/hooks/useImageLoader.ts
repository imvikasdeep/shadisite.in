import { useCallback } from 'react';
import { ImageState } from '../types';

/**
 * Hook to load images and manage image state
 */
export const useImageLoader = () => {
    const loadImage = useCallback((src: string, setter: React.Dispatch<React.SetStateAction<ImageState>>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setter({ url: src, border_radius: '', object: img });
        img.onerror = () => setter({ url: src, border_radius: '', object: null });
        img.src = src;
    }, []);

    return { loadImage };
};
