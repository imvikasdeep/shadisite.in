'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { PageInfo, Template, ImageState, CustomizationSettings, CanonicalGroupId } from '../types';
import { drawContentForPage } from '../utils/canvasDrawing';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DPI_SCALE } from '../data/constants';

interface BiodataPreviewProps {
    pageContent: PageInfo;
    template: Template;
    logo: string;
    dietyText: string;
    templateHeading: string;
    photo: ImageState;
    pageNumber: number;
    prevPageEndGroup: CanonicalGroupId | null;
    customization: CustomizationSettings;
}

const BiodataPreview = React.forwardRef<HTMLCanvasElement, BiodataPreviewProps>(
    ({ pageContent, template, logo, dietyText, templateHeading, photo, pageNumber, prevPageEndGroup, customization }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);

        const setRefs = useCallback((node: HTMLCanvasElement | null) => {
            (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;

            if (!ref) return;
            if (typeof ref === 'function') {
                ref(node);
            } else {
                (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
            }
        }, [ref]);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = CANVAS_WIDTH * DPI_SCALE;
            canvas.height = CANVAS_HEIGHT * DPI_SCALE;
            canvas.style.width = `${CANVAS_WIDTH}px`;
            canvas.style.height = `${CANVAS_HEIGHT}px`;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.scale(DPI_SCALE, DPI_SCALE);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const drawBackgroundAndContent = () => {
                const bgImg = new Image();
                bgImg.crossOrigin = 'anonymous';
                bgImg.src = template.bgImageUrl;

                const drawPage = (img: HTMLImageElement | null) => {
                    // Draw the full background image (if loaded)
                    if (img) {
                        ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    } else {
                        // Fallback to solid color if image fails to load
                        ctx.fillStyle = template.primaryColor + '1A';
                        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                    }

                    drawContentForPage(ctx, pageContent.fields, template, logo, dietyText, templateHeading, photo, pageNumber, prevPageEndGroup, customization);
                };

                if (bgImg.complete) {
                    drawPage(bgImg);
                } else {
                    bgImg.onload = () => drawPage(bgImg);
                    bgImg.onerror = () => drawPage(null);
                }
            };

            drawBackgroundAndContent();

        }, [pageContent, template, photo.object, pageNumber, prevPageEndGroup, logo, photo, dietyText, templateHeading, customization]);

        return (
            <div
                id="biodata-preview-container"
                className="shadow-2xl rounded-sm transition-all duration-300 border-4 border-gray-100 bg-white text-gray-800"
                style={{
                    width: `${CANVAS_WIDTH}px`,
                    maxWidth: `100%`,
                    height: `${CANVAS_HEIGHT}px`,
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2), 0 0 4px rgba(0, 0, 0, 0.05)',
                }}
            >
                <canvas ref={setRefs} id="biodata-preview-target" />
            </div>
        );
    }
);

BiodataPreview.displayName = 'BiodataPreview';

export default BiodataPreview;
