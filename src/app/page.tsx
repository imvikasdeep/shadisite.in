/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// import Image from 'next/image';
import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- External Library Type Definitions (for PDF download) ---
interface JsPDFInstance {
    addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
    save: (filename: string) => void;
    addPage: () => void;
}

// Define the global types for libraries loaded via UMD bundles
declare global {
    interface Window {
        // UMD bundle for jspdf often exposes the constructor under .jsPDF or directly
        jsPDF: new (orientation: string, unit: string, format: string) => JsPDFInstance;
        // The jspdf UMD bundle often exposes its contents under 'jspdf' (lowercase)
        jspdf: {
            jsPDF: new (orientation: string, unit: string, format: string) => JsPDFInstance;
        };
        html2canvas: (element: HTMLElement) => Promise<HTMLCanvasElement>;
    }
}

// --- CONSTANTS & CONFIGURATION (A4 Proportions: 500x707 px) ---
const CANVAS_WIDTH = 500;
// A4 aspect ratio is 1:1.414. 500 * 1.414 = 707 (approx)
const CANVAS_HEIGHT = 707;
const DPI_SCALE = 2; // High DPI for crisp canvas rendering
const TOTAL_STEPS = 4;

// A4 Proportion-Matched Metrics: ADJUSTED FOR HIGH DENSITY VISUAL FIT
const PADDING = 60;
const FIELD_GAP = 8;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10;

// Drawing configuration for headings
const HEADING_FONT_SIZE = 14;
const HEADING_LINE_GAP = 10; // Space above and below line

// Derived constants
// CONTENT_START_Y needs to accommodate space for the first heading on page 1
const CONTENT_START_Y = PADDING + 175;
const MAX_CONTENT_Y = CANVAS_HEIGHT - PADDING - 25;

// Drawing configuration for side-by-side layout
const VALUE_COL_OFFSET = PADDING + 160;
const VALUE_COL_WIDTH = CANVAS_WIDTH - VALUE_COL_OFFSET - PADDING;

// Placeholder image URLs
const PLACEHOLDER_PHOTO_URL = "https://placehold.co/120x160/cccccc/333333?text=User+Photo";
const PLACEHOLDER_LOGO_URL = "./images/layouts/ganesh-intro.png";


// --- INTERFACES & TYPES ---
type FieldType = 'mandatory' | 'custom';
type CanonicalGroupId = 'personal' | 'family' | 'contact' | 'other';

// Updated groupId to include specific groups for custom fields
type FieldGroupId = 'personal' | 'family' | 'contact' | 'custom-personal' | 'custom-family' | 'custom';

interface BiodataField {
    id: string; // Unique ID (e.g., 'dob-0', 'custom-12345')
    label: string; // The single label for this line item (e.g., 'Date of Birth')
    value: string; // The single value for this line item (e.g., '01 Jan 1995')
    type: FieldType;
    groupId: FieldGroupId;
}

interface Template {
    id: string;
    name: string;
    bgImageUrl: string;
    primaryColor: string;
}

interface ImageState {
    url: string;
    object: HTMLImageElement | null;
}

interface PageInfo {
    fields: BiodataField[]; // Fields to be drawn on this specific page
    // NEW: Tracks the group ID of the last item on the *previous* page to prevent repeating headings
    prevPageEndGroup: CanonicalGroupId | null;
}

// Mapping the actual group IDs to a canonical group ID for grouping logic
const getCanonicalGroupId = (groupId: FieldGroupId): CanonicalGroupId => {
    if (groupId.includes('personal')) return 'personal';
    if (groupId.includes('family')) return 'family';
    if (groupId.includes('contact') || groupId === 'custom') return 'contact';
    return 'other';
};

// Titles for the sections as requested by the user
const GROUP_TITLES: Record<'personal' | 'family' | 'contact', string> = {
    'personal': 'Personal Details',
    'family': 'Family Details',
    'contact': 'Contact & Other Details',
};


// --- INITIAL DATA & STEP GROUPINGS (COMPLEX STRUCTURE) ---

interface ComplexField {
    id: string;
    label: string;
    value: string;
    group: 'personal' | 'family' | 'contact';
}

const INITIAL_COMPLEX_FIELDS: ComplexField[] = [
    // Step 2: Personal Details (Group: 'personal')
    { id: 'name', label: 'Full Name', value: '', group: 'personal' },
    { id: 'dob', label: 'Date of Birth / Age', value: '', group: 'personal' },
    { id: 'height', label: 'Height / Weight', value: '', group: 'personal' },
    { id: 'education', label: 'Education', value: '', group: 'personal' },
    { id: 'occupation', label: 'Occupation', value: '', group: 'personal' },
    { id: 'hobbies', label: 'Hobbies / Interests', value: '', group: 'personal' },
    { id: 'religion', label: 'Religion / Caste / Gotra', value: '', group: 'personal' },

    // Step 3: Family Details (Group: 'family')
    { id: 'father', label: 'Father\'s Name / Occupation', value: '', group: 'family' },
    { id: 'mother', label: 'Mother\'s Name / Status', value: '', group: 'family' },
    { id: 'siblings', label: 'Siblings', value: '', group: 'family' },
    { id: 'familyType', label: 'Family Type / Values', value: '', group: 'family' },
    { id: 'partnerPref', label: 'Partner Preference Summary (Long field to test pagination)', value: '', group: 'family' },

    // Step 4: Contact & Other Details (Group: 'contact')
    { id: 'contact', label: 'Contact Details', value: '', group: 'contact' },
    { id: 'appendix', label: 'Appendix Note', value: '', group: 'contact' },
];

/**
 * Flattens the complex field structure into a list of single-line BiodataField objects.
 */
const flattenFields = (complexFields: ComplexField[]): BiodataField[] => {
    const flatFields: BiodataField[] = [];

    complexFields.forEach(cf => {
        // Split labels and values by the '/' character
        const labels = cf.label.split('/').map(s => s.trim());
        const values = cf.value.split('/').map(s => s.trim());

        const finalCount = Math.max(labels.length, values.length, 1);

        for (let i = 0; i < finalCount; i++) {
            const label = (labels[i] || '').replace(':', '').trim(); // Remove colon from label and trim
            const value = (values[i] || '').trim();

            if (label || value) {
                flatFields.push({
                    id: `${cf.id}-${i}`,
                    label: label,
                    value: value,
                    type: 'mandatory',
                    groupId: cf.group,
                });
            }
        }
    });
    return flatFields;
};

// Generate the initial flat list of fields
const initialFields: BiodataField[] = flattenFields(INITIAL_COMPLEX_FIELDS);

// const DEFAULT_PRIMARY_COLOR = '#ffffff';

// --- UPDATED TEMPLATE CONFIGURATION ---
const templates: Template[] = [
    {
        id: 'modern',
        name: 'Modern Geometric',
        // Updated URL to remove placeholder text
        bgImageUrl: "https://i.ibb.co/q3J2rQck/Whats-App-Image-2025-10-06-at-9-49-57-AM-2.jpg",
        primaryColor: '#333333', // Dark Grey
    },
    {
        id: 'classic',
        name: 'Classic Minimal',
        // Updated URL to remove placeholder text
        bgImageUrl: "https://i.ibb.co/jPJk6GHC/Whats-App-Image-2025-10-06-at-9-49-57-AM-1.jpg",
        primaryColor: '#374151', // Deep Slate
    },
    {
        id: 'nature',
        name: 'Nature Green',
        // Updated URL to remove placeholder text
        bgImageUrl: "https://i.ibb.co/RF3rzCW/Whats-App-Image-2025-10-06-at-9-49-56-AM-1.jpg",
        primaryColor: '#059669', // Emerald Green
    },
    {
        id: 'royal',
        name: 'Royal Maroon',
        // Updated URL to remove placeholder text
        bgImageUrl: "https://i.ibb.co/20QR6kWp/Whats-App-Image-2025-10-06-at-9-49-56-AM.jpg",
        primaryColor: '#881337', // Deep Maroon
    },
    {
        id: 'neww',
        name: 'Yellow Maroon',
        // Updated URL to remove placeholder text
        bgImageUrl: "https://i.ibb.co/mL68Xsh/Whats-App-Image-2025-10-06-at-9-49-57-AM.jpg",
        primaryColor: '#222222', // Deep Maroon
    },
];
// ------------------------------------


// --- EXTERNAL SCRIPT LOADING HOOK (FIX for PDF Library Not Found) ---

const useExternalScript = (url: string, globalVariableName: string) => {
    const [isLoaded, setIsLoaded] = useState(false);

    const globalScope = globalThis as Record<string, unknown>;

    useEffect(() => {
        const globalRef = globalScope[globalVariableName];
        if (globalRef) {
            setIsLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        document.body.appendChild(script);

        let attempts = 0;
        const maxAttempts = 50;
        const checkLoad = () => {
            const globalRef = globalScope[globalVariableName];
            if (globalRef) {
                setIsLoaded(true);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkLoad, 100);
            } else {
                console.error(`Failed to find global variable '${globalVariableName}' after loading ${url}.`);
                setIsLoaded(false);
            }
        };

        script.onload = () => {
            setTimeout(checkLoad, 50);
        };
        script.onerror = () => {
            console.error(`Script loading error for: ${url}`);
            setIsLoaded(false);
        };

        setTimeout(checkLoad, 200);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [url, globalVariableName, globalScope]);

    return isLoaded;
};
// --------------------------------------------------------------------


// --- TEXT MEASUREMENT HELPER ---

/**
 * Counts the number of lines a piece of text will wrap into, given a maxWidth.
 */
const countWrappedTextLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number => {
    const words = text.split(' ');
    let line = '';

    if (text.trim() === '') return 0;

    let lineCount = 1;
    ctx.font = `${FONT_SIZE}px Inter, sans-serif`;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            line = words[n] + ' ';
            lineCount++;
        } else {
            line = testLine;
        }
    }
    return lineCount;
}

// --- PAGINATION CALCULATION CORE ---

/**
 * Pre-calculates the field distribution across pages by simulating drawing height.
 * This is crucial for determining where page breaks occur and if a heading is needed.
 */
const calculatePagination = (fields: BiodataField[]): PageInfo[] => {
    if (typeof document === 'undefined') return [];

    const pages: PageInfo[] = [];

    // ✅ Filter out fields with empty label OR empty value
    const contentFields = fields.filter(f =>
        f.label.trim() !== '' &&
        f.value &&
        f.value.trim() !== ''
    );

    if (contentFields.length === 0) {
        return []; // ✅ Nothing to paginate
    }

    let remainingFields = [...contentFields];

    const dummyCanvas = document.createElement('canvas');
    const ctx = dummyCanvas.getContext('2d');
    if (!ctx) return [];
    ctx.scale(DPI_SCALE, DPI_SCALE);
    ctx.font = `${FONT_SIZE}px Inter, sans-serif`;

    const calculateConsumption = (field: BiodataField, lastGroupId: CanonicalGroupId | null): number => {
        let height = 0;
        const currentCanonicalGroupId = getCanonicalGroupId(field.groupId);

        if (currentCanonicalGroupId !== lastGroupId && currentCanonicalGroupId !== 'other') {
            height += 25; // space above the line
            height += HEADING_FONT_SIZE + HEADING_LINE_GAP + 10;
        }

        const valueLineCount = countWrappedTextLines(ctx, field.value, VALUE_COL_WIDTH);
        const textLines = Math.max(1, valueLineCount);
        const textBlockHeight = textLines * LINE_HEIGHT;

        height += textBlockHeight + FIELD_GAP;

        return height;
    };

    while (remainingFields.length > 0) {
        const pageFields: BiodataField[] = [];

        const prevPageEndGroup = pages.length > 0
            ? getCanonicalGroupId(pages[pages.length - 1].fields.slice(-1)[0].groupId)
            : null;

        let lastGroupIdDrawnOrReferenced = prevPageEndGroup;
        let currentY = pages.length === 0 ? CONTENT_START_Y : PADDING + FIELD_GAP;

        for (let i = 0; i < remainingFields.length; i++) {
            const field = remainingFields[i];
            const requiredHeight = calculateConsumption(field, lastGroupIdDrawnOrReferenced);
            const nextCalculatedY = currentY + requiredHeight;

            if (nextCalculatedY > MAX_CONTENT_Y && pageFields.length > 0) {
                break;
            }

            pageFields.push(field);
            currentY = nextCalculatedY;
            lastGroupIdDrawnOrReferenced = getCanonicalGroupId(field.groupId);
        }

        // ✅ Only add a page if it actually has renderable fields
        if (pageFields.length > 0) {
            pages.push({ fields: pageFields, prevPageEndGroup });
            remainingFields = remainingFields.slice(pageFields.length);
        } else {
            break; // ✅ stop the loop — nothing more to paginate
        }
    }

    return pages;
};

// --- Core Drawing Logic for a Single Page ---

/**
 * Utility to wrap text on the canvas and track vertical position,
 * returning the final baseline Y coordinate of the last line drawn.
 */
const wrapTextAndGetLastY = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
): number => {
    const words = text.split(' ');
    let line = '';
    let lineY = y;

    if (text.trim() === '') return y + lineHeight;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, lineY);
            line = words[n] + ' ';
            lineY += lineHeight;
        } else {
            line = testLine;
        }
    }

    ctx.fillText(line.trim(), x, lineY);

    // Return bottom Y after the last line
    return lineY + lineHeight;
};


/**
 * Draws the content of a single page using only the fields provided.
 */
const drawContentForPage = (
    ctx: CanvasRenderingContext2D,
    pageFields: BiodataField[],
    template: Template,
    logo: ImageState,
    photo: ImageState,
    pageNumber: number = 1,
    prevPageEndGroup: CanonicalGroupId | null = null
) => {

    const width = CANVAS_WIDTH;

    let currentY: number;

    if (pageNumber === 1) {
        // --- Header Elements ---
        const logoWidth = 150;
        const logoHeight = 60;

        const photoWidth = 120;
        const photoHeight = 160;

        const spacingBelowLogo = 10;
        const spacingFromTop = PADDING;

        // Center logo horizontally at top
        const logoX = (width - logoWidth) / 2;
        const logoY = spacingFromTop;

        // Draw logo
        if (logo.object) {
            ctx.drawImage(logo.object, logoX, logoY, logoWidth, logoHeight);
        }

        // Photo: top-right but slightly below logo
        const photoX = width - PADDING - photoWidth;
        const photoY = logoY + logoHeight + spacingBelowLogo;

        // Draw photo border/background
        ctx.fillStyle = template.primaryColor;
        ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(photoX + 2, photoY + 2, photoWidth - 4, photoHeight - 4);

        if (photo.object) {
            ctx.drawImage(photo.object, photoX + 2, photoY + 2, photoWidth - 4, photoHeight - 4);
        }

        // Start content *just below the logo*, from top-left
        currentY = logoY + logoHeight + PADDING;
    } else {
        // For next pages, start near top
        currentY = PADDING + FIELD_GAP;
    }

    // === Draw Fields ===
    ctx.textAlign = 'left';
    const labelX = PADDING;
    const valueX = VALUE_COL_OFFSET;
    const valueWidth = VALUE_COL_WIDTH;

    let lastCanonicalGroupId: CanonicalGroupId | null = pageNumber === 1
        ? 'none' as CanonicalGroupId
        : prevPageEndGroup || 'none' as CanonicalGroupId;

    pageFields.forEach((field) => {
        const currentCanonicalGroupId = getCanonicalGroupId(field.groupId);

        // ✅ Skip drawing *everything* if value is empty
        if (!field.value || field.value.trim() === '') {
            return;
        }

        // === Section Heading ===
        if (currentCanonicalGroupId !== lastCanonicalGroupId && currentCanonicalGroupId !== 'other') {
            const headingText = GROUP_TITLES[currentCanonicalGroupId];
            if (headingText) {
                currentY += 20;
                ctx.font = `${HEADING_FONT_SIZE + 2}px Pacifico, cursive`;
                ctx.fillStyle = template.primaryColor;
                ctx.fillText(headingText, PADDING + 0.3, currentY + 0.3);
                ctx.fillText(headingText, PADDING, currentY);

                const headingFontSize = HEADING_FONT_SIZE + 2;
                currentY += headingFontSize + 16;
            }
            lastCanonicalGroupId = currentCanonicalGroupId;
        }

        // === Label ===
        ctx.font = `bold ${FONT_SIZE}px Inter, sans-serif`;
        ctx.fillStyle = template.primaryColor;
        const labelMaxWidth = VALUE_COL_OFFSET - PADDING - 10;
        wrapTextAndGetLastY(ctx, field.label, labelX, currentY, labelMaxWidth, LINE_HEIGHT);

        // === Value ===
        ctx.font = `${FONT_SIZE}px Inter, sans-serif`;
        ctx.fillStyle = '#1f2937';
        const bottomY = wrapTextAndGetLastY(ctx, field.value, valueX, currentY, valueWidth, LINE_HEIGHT);

        currentY = bottomY + FIELD_GAP;
    });

};


// --- Sub-Component: The Biodata Preview (The Canvas) ---

interface BiodataPreviewProps {
    pageContent: PageInfo;
    template: Template;
    logo: ImageState;
    photo: ImageState;
    pageNumber: number;
    // NEW: Passed down to control heading drawing
    prevPageEndGroup: CanonicalGroupId | null;
}

const BiodataPreview = React.forwardRef<HTMLCanvasElement, BiodataPreviewProps>(({ pageContent, template, logo, photo, pageNumber, prevPageEndGroup }, ref) => {
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

                drawContentForPage(ctx, pageContent.fields, template, logo, photo, pageNumber, prevPageEndGroup);
            }

            if (bgImg.complete) {
                drawPage(bgImg);
            } else {
                bgImg.onload = () => drawPage(bgImg);
                bgImg.onerror = () => drawPage(null);
            }
        };

        drawBackgroundAndContent();

    }, [pageContent, template, logo.object, photo.object, pageNumber, prevPageEndGroup, logo, photo]);


    return (
        <div
            id="biodata-preview-container"
            className={`shadow-2xl rounded-sm transition-all duration-300 border-4 border-gray-100 bg-white text-gray-800`}
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
});

BiodataPreview.displayName = 'BiodataPreview';

// --- FieldInput Component ---

interface FieldInputProps {
    field: BiodataField;
    index: number;
    isLast: boolean;
    onFieldChange: (id: string, value: string) => void;
    onLabelChange: (id: string, newLabel: string) => void;
    onFieldMove: (id: string, direction: 'up' | 'down') => void;
    onRemoveCustomField: (id: string) => void;
    fieldGroupIds: string[];
}

const FieldInput: React.FC<FieldInputProps> = React.memo(({
    field,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    onRemoveCustomField,
    fieldGroupIds
}) => {

    const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onFieldChange(field.id, e.target.value);
    };

    const handleLabelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        onLabelChange(field.id, e.target.value);
    };

    const currentGroupIndex = fieldGroupIds.findIndex(id => id === field.id);
    const isFirstInGroup = currentGroupIndex === 0;
    const isLastInGroup = currentGroupIndex === fieldGroupIds.length - 1;


    return (
        <div
            id={`field-input-${field.id}`}
            className="flex items-start space-x-3 p-3 border-b-2 border-fuchsia-50 hover:bg-fuchsia-50 rounded-lg transition duration-200"
        >
            <div className="flex flex-col space-y-1 mt-1 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'up')}
                    disabled={isFirstInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                </button>
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'down')}
                    disabled={isLastInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                </button>
            </div>
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:space-x-4">
                <div className="w-full md:w-2/5 mb-2 md:mb-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Field Label</label>
                    <input
                        type="text"
                        value={field.label}
                        onChange={handleLabelInput}
                        className="w-full text-sm font-semibold p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                        placeholder="e.g., Full Name"
                    />
                </div>
                <div className="w-full md:w-3/5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Field Value</label>
                    <textarea
                        value={field.value}
                        onChange={handleValueChange}
                        rows={field.value.length > 50 ? 3 : 1}
                        className="w-full text-sm p-2 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                        placeholder={`Enter ${field.label}...`}
                    />
                </div>
            </div>
            {field.type === 'custom' && (
                <button
                    type="button"
                    onClick={() => onRemoveCustomField(field.id)}
                    className="p-2 mt-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-100 transition duration-150 self-start"
                    title="Remove Custom Field"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" /></svg>
                </button>
            )}
        </div>
    );
});

FieldInput.displayName = 'FieldInput';


// --- Main Application Component ---

const BiodataGenerator: React.FC = () => {
    const [fields, setFields] = useState<BiodataField[]>(initialFields);
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
    const [logo, setLogo] = useState<ImageState>({ url: PLACEHOLDER_LOGO_URL, object: null });
    const [photo, setPhoto] = useState<ImageState>({ url: PLACEHOLDER_PHOTO_URL, object: null });
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStatus, setGenerationStatus] = useState<'success' | 'error' | 'loading' | null>(null);
    const [step, setStep] = useState(1);
    const [highestStepVisited, setHighestStepVisited] = useState(1);

    const scrollRef = useRef<HTMLDivElement>(null);
    const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);

    // Define theme variables
    const primaryTextClass = "text-fuchsia-600";
    const primaryBgClass = "bg-fuchsia-600";
    const primaryBgHoverClass = "hover:bg-fuchsia-700";
    const primaryRingClass = "ring-fuchsia-200";
    const primaryBorderClass = "border-fuchsia-600";


    const isJsPdfLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        'jspdf'
    );
    const isHtml2CanvasLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        'html2canvas'
    );
    const isLibrariesLoaded = isJsPdfLoaded && isHtml2CanvasLoaded;

    const [pageContentMap, setPageContentMap] = useState<PageInfo[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Update highest visited step whenever 'step' changes
    useEffect(() => {
        setHighestStepVisited(prev => Math.max(prev, step));
    }, [step]);


    // --- Pagination Calculation (Client-side only) ---
    useEffect(() => {
        const pages = calculatePagination(fields);
        setPageContentMap(pages);

        // Keep the current page view, or reset if it's out of bounds
        setCurrentPageIndex(prev => Math.min(prev, pages.length - 1));
        if (pages.length === 0) setCurrentPageIndex(0);

    }, [fields]);


    // Effect to scroll the field list when a new custom field is added
    useEffect(() => {
        if (lastAddedFieldId && scrollRef.current) {

            const scrollToBottom = () => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    setLastAddedFieldId(null);
                }
            };

            setTimeout(scrollToBottom, 0);
        }
    }, [lastAddedFieldId]);


    const totalPages = pageContentMap.length;
    // Extract the page data and the previous group ID for drawing logic
    const currentPageData = pageContentMap[currentPageIndex] || { fields: [], prevPageEndGroup: null };
    const prevGroup = currentPageData.prevPageEndGroup;


    // Load initial placeholder images on mount
    const loadImage = useCallback((src: string, setter: React.Dispatch<React.SetStateAction<ImageState>>) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setter({ url: src, object: img });
        img.onerror = () => setter({ url: src, object: null });
        img.src = src;
    }, []);

    useEffect(() => {
        loadImage(PLACEHOLDER_LOGO_URL, setLogo);
        loadImage(PLACEHOLDER_PHOTO_URL, setPhoto);
        templates.forEach(t => {
            if (t.bgImageUrl) {
                new Image().src = t.bgImageUrl;
            }
        });
    }, [loadImage]);

    // Navigation handlers
    const handleNext = () => setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

    const handleStepClick = (s: number) => {
        if (s <= highestStepVisited) {
            setStep(s);
        }
    }


    // --- Optimized Field Handlers using useCallback for stability ---

    const getCurrentStepFieldIds = useCallback((currentStep: number): string[] => {
        switch (currentStep) {
            case 2:
                return fields
                    .filter(f => f.groupId === 'personal' || f.groupId === 'custom-personal')
                    .map(f => f.id);
            case 3:
                return fields
                    .filter(f => f.groupId === 'family' || f.groupId === 'custom-family')
                    .map(f => f.id);
            case 4:
                return fields
                    .filter(f => f.groupId === 'contact' || f.groupId === 'custom')
                    .map(f => f.id);
            default:
                return [];
        }
    }, [fields]);


    const handleFieldChange = useCallback((id: string, value: string) => {
        setFields(prevFields =>
            prevFields.map(field =>
                field.id === id ? { ...field, value } : field
            )
        );
    }, []);

    const handleLabelChange = useCallback((id: string, newLabel: string) => {
        setFields(prevFields =>
            prevFields.map(field =>
                field.id === id ? { ...field, label: newLabel } : field
            )
        );
    }, []);

    const handleFieldMove = useCallback((id: string, direction: 'up' | 'down') => {
        setFields(prevFields => {
            const currentGroupIds = getCurrentStepFieldIds(step);
            const groupIndex = currentGroupIds.findIndex(groupId => groupId === id);

            if (groupIndex === -1) return prevFields;

            const newGroupIndex = groupIndex + (direction === 'up' ? -1 : 1);

            if (newGroupIndex < 0 || newGroupIndex >= currentGroupIds.length) return prevFields;

            const targetId = currentGroupIds[newGroupIndex];
            const sourceAbsIndex = prevFields.findIndex(f => f.id === id);
            const targetAbsIndex = prevFields.findIndex(f => f.id === targetId);

            if (sourceAbsIndex === -1 || targetAbsIndex === -1) return prevFields;

            const newFields = [...prevFields];
            [newFields[sourceAbsIndex], newFields[targetAbsIndex]] = [newFields[targetAbsIndex], newFields[sourceAbsIndex]];

            return newFields;
        });
    }, [step, getCurrentStepFieldIds]);

    /**
     * Adds a new custom field to the specified group and ensures it is inserted 
     * immediately after the last field currently visible in the current step.
     */
    const addCustomField = (groupType: 'personal' | 'family' | 'custom') => {
        const newId = `custom-${groupType}-${Date.now()}`;

        let targetGroupId: FieldGroupId;
        if (groupType === 'personal') targetGroupId = 'custom-personal';
        else if (groupType === 'family') targetGroupId = 'custom-family';
        else targetGroupId = 'custom';

        const newField: BiodataField = {
            id: newId,
            label: 'New Custom Detail',
            value: '',
            type: 'custom',
            groupId: targetGroupId,
        };

        setFields(prevFields => {
            const currentStepIds = getCurrentStepFieldIds(step);
            const lastVisibleId = currentStepIds[currentStepIds.length - 1];
            const lastVisibleIndex = prevFields.findIndex(f => f.id === lastVisibleId);

            const newFields = [...prevFields];

            const insertIndex = (lastVisibleIndex !== -1) ? lastVisibleIndex + 1 : prevFields.length;
            newFields.splice(insertIndex, 0, newField);

            return newFields;
        });

        setLastAddedFieldId(newId);
    };

    const removeCustomField = useCallback((id: string) => {
        setFields(prevFields => prevFields.filter(field => field.id !== id));
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'logo' | 'photo') => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            const setter = imageType === 'logo' ? setLogo : setPhoto;

            const currentUrl = imageType === 'logo' ? logo.url : photo.url;
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }

            loadImage(tempUrl, setter);
        }
    };


    /**
     * Generates and downloads the biodata as a multi-page PDF using the pre-calculated page data.
     */
    const generatePdf = useCallback(async () => {
        setGenerationStatus('loading');
        setIsGenerating(true);

        const jsPDFConstructor = (window as any).jspdf ? (window as any).jspdf.jsPDF : (window as any).jsPDF;

        if (typeof jsPDFConstructor === 'undefined' || typeof window.html2canvas === 'undefined') {
            setGenerationStatus('error');
            console.error("PDF generation failed: jsPDF or html2canvas library not found.");
            setIsGenerating(false);
            return;
        }

        try {
            const pdf = new jsPDFConstructor('p', 'mm', 'a4');
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = CANVAS_HEIGHT * pdfWidth / CANVAS_WIDTH;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = CANVAS_WIDTH * DPI_SCALE;
            tempCanvas.height = CANVAS_HEIGHT * DPI_SCALE;
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error("Could not get 2D context for temporary canvas.");
            ctx.scale(DPI_SCALE, DPI_SCALE);

            // Preload background image
            const bgImage = new Image();
            bgImage.crossOrigin = 'anonymous';
            bgImage.src = selectedTemplate.bgImageUrl;

            const loadBgPromise = new Promise<HTMLImageElement | null>((resolve) => {
                if (bgImage.complete) {
                    resolve(bgImage);
                } else {
                    bgImage.onload = () => resolve(bgImage);
                    bgImage.onerror = () => {
                        console.warn("Background image failed to load for PDF.");
                        resolve(null);
                    };
                }
            });

            const loadedBgImage = await loadBgPromise;

            // Loop through the pre-calculated pages
            for (let i = 0; i < pageContentMap.length; i++) {
                const pageInfo = pageContentMap[i];
                const pageNum = i + 1;

                // 1. Clear and draw background
                ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                if (loadedBgImage) {
                    ctx.drawImage(loadedBgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else {
                    ctx.fillStyle = selectedTemplate.primaryColor + '1A';
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }

                // 2. Draw the content for this specific page
                drawContentForPage(
                    ctx,
                    pageInfo.fields,
                    selectedTemplate,
                    logo,
                    photo,
                    pageNum,
                    pageInfo.prevPageEndGroup
                );

                // 3. Add page to PDF
                if (i > 0) {
                    pdf.addPage();
                }

                const imgData = tempCanvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            // Save the PDF
            pdf.save(`WeddingBiodata_${fields.find(f => f.id === 'name-0')?.value.replace(/\s/g, '_') || 'New'}.pdf`);

            setGenerationStatus('success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            setGenerationStatus('error');
        } finally {
            setTimeout(() => setGenerationStatus(null), 3000);
            setIsGenerating(false);
        }
    }, [fields, selectedTemplate, logo, photo, pageContentMap]);


    // --- ImageUpload Component (Defined inside main component to access handlers) ---
    interface ImageUploadProps {
        label: string;
        imageType: 'logo' | 'photo';
        onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'photo') => void;
        currentUrl: string;
    }

    const ImageUpload: React.FC<ImageUploadProps> = ({ label, imageType, onUpload, currentUrl }) => (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-16 w-16 bg-gray-200 rounded-lg overflow-hidden border">
                    <img
                        src={currentUrl}
                        alt={label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = imageType === 'logo' ? PLACEHOLDER_LOGO_URL : PLACEHOLDER_PHOTO_URL;
                        }}
                    />
                </div>
                <label className="flex-1 cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-lg shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition duration-150">
                    Choose File
                    <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => onUpload(e, imageType)}
                    />
                </label>
            </div>
        </div>
    );


    const renderStepContent = () => {
        // Filter fields based on the current step group
        const groupIds = getCurrentStepFieldIds(step);
        const filteredFields = fields.filter(f => groupIds.includes(f.id));

        const addCustomButton = (groupType: 'personal' | 'family' | 'custom', label: string) => (
            <div className="flex justify-end mt-6">
                <button
                    onClick={() => addCustomField(groupType)}
                    // Button UI matches the 'Back' button style and is aligned to the right
                    className="px-6 py-2 border border-gray-300 rounded-full text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition duration-150 cursor-pointer shadow-sm"
                >
                    {label}
                </button>
            </div>
        );

        switch (step) {
            case 1:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">Step 1: Template & Photo Setup</h2>
                        <p className="text-gray-600 mb-6">Select a visual theme and provide your photos.</p>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Select Template</h3>
                            <div className="flex flex-wrap gap-4">
                                {templates.map((template) => (
                                    <div key={template.id} onClick={() => setSelectedTemplate(template)} className={`w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.33%-12px)] p-4 border-2 rounded-xl cursor-pointer transition duration-200 shadow-md ${selectedTemplate.id === template.id ? `${primaryBorderClass} ring-4 ${primaryRingClass}` : 'border-gray-200 hover:border-fuchsia-400'}`} >
                                        <img src={template.bgImageUrl} alt={template.name} />
                                        <div className="font-semibold text-sm text-center">{template.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Upload Photos</h3>
                            <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
                                <ImageUpload
                                    label="User Photo (Top Right)"
                                    imageType="photo"
                                    onUpload={handleImageUpload}
                                    currentUrl={photo.url}
                                />
                                <ImageUpload
                                    label="Organization Logo (Top Left)"
                                    imageType="logo"
                                    onUpload={handleImageUpload}
                                    currentUrl={logo.url}
                                />
                            </div>
                        </div>
                    </>
                );
            case 2:
            case 3:
                const stepTitle = step === 2 ? 'Personal Info' : 'Family Info';
                const stepSubtitle = step === 2 ? 'Customize your primary personal details and add custom entries for this section.' : 'Enter details about your family, preferences, and add custom entries specific to this section.';
                const addGroup = step === 2 ? 'personal' : 'family';
                const addLabel = step === 2 ? '+ Add More Personal Detail' : '+ Add More Family Detail';

                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">Step {step}: Edit {stepTitle}</h2>
                        <p className="text-gray-600 mb-6">{stepSubtitle}</p>
                        <div
                            ref={scrollRef}
                            className="space-y-2 max-h-[500px] overflow-y-auto pr-2"
                        >
                            {filteredFields.map((field, index) => (
                                <FieldInput
                                    key={field.id}
                                    field={field}
                                    index={index}
                                    isLast={index === filteredFields.length - 1}
                                    onFieldChange={handleFieldChange}
                                    onLabelChange={handleLabelChange}
                                    onFieldMove={handleFieldMove}
                                    onRemoveCustomField={removeCustomField}
                                    fieldGroupIds={groupIds}
                                />
                            ))}
                        </div>
                        {addCustomButton(addGroup as 'personal' | 'family', addLabel)}
                    </>
                );
            case 4:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">Step 4: Contact & Download</h2>
                        <p className="text-gray-600 mb-6">
                            Enter contact details, any final notes, and add **Custom Fields**. Use the download button below to generate your multi-page PDF.
                        </p>
                        <div
                            ref={scrollRef}
                            className="space-y-2 max-h-[350px] overflow-y-auto pr-2"
                        >
                            {filteredFields.map((field, index) => (
                                <FieldInput
                                    key={field.id}
                                    field={field}
                                    index={index}
                                    isLast={index === filteredFields.length - 1}
                                    onFieldChange={handleFieldChange}
                                    onLabelChange={handleLabelChange}
                                    onFieldMove={handleFieldMove}
                                    onRemoveCustomField={removeCustomField}
                                    fieldGroupIds={groupIds}
                                />
                            ))}
                        </div>
                        {addCustomButton('custom', '+ Add Custom Detail')}

                        <div className="mt-8 pt-4 border-t border-gray-200">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Download</h3>
                            <button
                                onClick={generatePdf}
                                disabled={isGenerating || !isLibrariesLoaded}
                                className={`w-full flex items-center justify-center px-10 py-4 border border-transparent text-base font-medium rounded-xl shadow-xl text-white transition-all duration-200 cursor-pointer ${(!isLibrariesLoaded || isGenerating)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-fuchsia-600 hover:bg-fuchsia-700 focus:ring-4 focus:ring-fuchsia-500 focus:ring-offset-2'
                                    }`}
                            >
                                {!isLibrariesLoaded ? (
                                    <>
                                        <span className="animate-pulse mr-2">⏳</span>
                                        Loading PDF Libraries...
                                    </>
                                ) : isGenerating && generationStatus === 'loading' ? (
                                    <>
                                        <span className="animate-spin mr-2">⟳</span>
                                        Generating Multi-Page PDF...
                                    </>
                                ) : generationStatus === 'success' ? (
                                    <>
                                        <span className="mr-2">✓</span>
                                        Download Complete!
                                    </>
                                ) : (
                                    'Download Final Biodata PDF (A4)'
                                )}
                            </button>
                            {generationStatus === 'error' && (
                                <p className="mt-2 text-sm text-red-600 text-center">
                                    An error occurred during PDF generation. Please ensure your network is stable.
                                </p>
                            )}
                        </div>
                    </>
                );
            default:
                return <p className="text-gray-500">Select a step to begin.</p>;
        }
    };

    const STEP_LABELS = ['Template', 'Personal Info', 'Family Info', 'Contact'];

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-inter">
            <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-7 bg-white rounded-xl">

                {/* Left Column: Wizard Controls and Steps (60%) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl h-fit order-2 lg:order-1">
                    <div className="flex justify-between items-center mb-8 space-x-2">
                        {[1, 2, 3, 4].map((s) => {
                            const isCompleted = s < step;
                            const isCurrent = s === step;
                            const isVisited = s <= highestStepVisited;

                            return (
                                <React.Fragment key={s}>
                                    <div className={`flex-1 flex flex-col items-center relative z-10 ${isCurrent ? primaryTextClass : 'text-gray-400'}`}>
                                        <button
                                            onClick={() => handleStepClick(s)}
                                            disabled={!isVisited || isCurrent}
                                            className={`w-10 h-10 flex items-center justify-center rounded-full font-bold border-2 transition-all duration-300 ${isVisited ? `${primaryBgClass} border-fuchsia-600 text-white cursor-pointer` : 'bg-white border-gray-300'} ${isCurrent ? 'ring-4 ring-fuchsia-200' : 'hover:border-fuchsia-400 disabled:opacity-100 disabled:ring-0'}`}
                                        >
                                            {s}
                                        </button>
                                        <span className={`mt-2 text-sm font-semibold text-center ${isVisited ? 'text-fuchsia-700' : 'text-gray-500'}`}>
                                            {STEP_LABELS[s - 1]}
                                        </span>
                                    </div>
                                    {s < TOTAL_STEPS && (
                                        <div className={`flex-auto border-t-4 h-0 transition-all duration-300 ${isCompleted ? 'border-fuchsia-400' : 'border-gray-200'}`}></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Step Content */}
                    <div className="min-h-[400px]">
                        {renderStepContent()}
                    </div>

                    {/* Navigation Buttons */}
                    <div
                        className="sticky bottom-0 bg-white flex justify-between mt-8 py-6 border-t border-gray-200 z-20"
                    >
                        <button
                            onClick={handlePrev}
                            disabled={step === 1}
                            className="px-10 py-3 md:px-12 md:py-4 border border-gray-300 rounded-full text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition duration-150 cursor-pointer shadow-sm"
                        >
                            Back
                        </button>
                        {step < TOTAL_STEPS ? (
                            <button
                                onClick={handleNext}
                                className={`px-10 py-3 md:px-12 md:py-4 border border-transparent rounded-full text-base font-semibold text-white ${primaryBgClass} ${primaryBgHoverClass} transition duration-150 cursor-pointer shadow-lg`}
                            >
                                Continue
                            </button>
                        ) : (
                            <div className="text-sm text-gray-500 flex items-center font-semibold">
                                Final Step: Download
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sticky Canvas Live Preview (40%) */}
                <div className="lg:col-span-2 flex justify-center lg:justify-start items-start order-1 lg:order-2">
                    <div
                        className="lg:sticky lg:top-8 w-full flex justify-center"
                        style={{ height: `${CANVAS_HEIGHT + 100}px` }}
                    >
                        <div className="bg-white py-4 rounded-2xl ">
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-3">
                                Live Preview
                            </h3>

                            {/* Page Counter and Navigation */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center space-x-3 mb-3 text-sm font-medium text-gray-600">
                                    <button
                                    onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
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
                                    onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={currentPageIndex === totalPages - 1}
                                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                    >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 0 0 .708L10.293 8l-5.647 5.646a.5.5 0 0 0 .708.708l6-6a.5.5 0 0 0 0-.708l-6-6a.5.5 0 0 0-.708 0z" />
                                    </svg>
                                    </button>
                                </div>
                            )}

                            <BiodataPreview
                                ref={currentPageIndex === 0 ? canvasRef : undefined}
                                pageContent={currentPageData}
                                template={selectedTemplate}
                                logo={logo}
                                photo={photo}
                                pageNumber={currentPageIndex + 1}
                                prevPageEndGroup={prevGroup}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiodataGenerator;
