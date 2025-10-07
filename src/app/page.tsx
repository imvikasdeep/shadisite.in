'use client';

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
const TOTAL_STEPS = 3;

// A4 Proportion-Matched Metrics: ADJUSTED FOR HIGH DENSITY VISUAL FIT
const PADDING = 80; // <<< UPDATED PADDING
const FIELD_GAP = 8; // Drastically reduced spacing (was 18)
const LINE_HEIGHT = 14; // Drastically reduced line height (was 22) to increase line count
const FONT_SIZE = 10; // Drastically reduced font size (was 14) to increase content density

// Derived constants now based on PADDING = 80
const CONTENT_START_Y = PADDING + 175; // Y coordinate where main text content starts (below photos/header)
const MAX_CONTENT_Y = CANVAS_HEIGHT - PADDING - 25; // Max Y coordinate before forcing a page break (leaving space for footer)

// Drawing configuration for side-by-side layout
const LABEL_COL_WIDTH = 150;
const VALUE_COL_OFFSET = PADDING + 160;
const VALUE_COL_WIDTH = CANVAS_WIDTH - VALUE_COL_OFFSET - PADDING;

// Placeholder image URLs
const TEMPLATE_BACKGROUND_IMAGE = "https://placehold.co/500x707/f0f0f0/8c6e6e?text=Elegant+Floral+Background";
const TEMPLATE_BACKGROUND_IMAGE_2 = "https://placehold.co/500x707/f0f0f0/6e8c8c?text=Modern+Geometric+Background";
const PLACEHOLDER_PHOTO_URL = "https://placehold.co/120x160/cccccc/333333?text=User+Photo";
const PLACEHOLDER_LOGO_URL = "https://placehold.co/60x60/ffffff/5c4b51?text=Logo";


// --- INTERFACES & TYPES ---
type FieldType = 'mandatory' | 'custom';

interface BiodataField {
    id: string;
    label: string;
    value: string;
    type: FieldType;
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
}

// --- INITIAL DATA ---

const templates: Template[] = [
    {
        id: 'elegant',
        name: 'Elegant Floral',
        bgImageUrl: TEMPLATE_BACKGROUND_IMAGE,
        primaryColor: '#8c6e6e', // Deep Mauve
    },
    {
        id: 'modern',
        name: 'Modern Geometric',
        bgImageUrl: TEMPLATE_BACKGROUND_IMAGE_2,
        primaryColor: '#6e8c8c', // Slate Teal
    },
];

const initialFields: BiodataField[] = [
    // Personal Details
    { id: 'name', label: 'Full Name', value: 'Jane Doe', type: 'mandatory' },
    { id: 'dob', label: 'Date of Birth / Age', value: '01 Jan 1995 / 30 Years', type: 'mandatory' },
    { id: 'height', label: 'Height / Weight', value: '5 ft 6 in / 55 kg', type: 'mandatory' },
    { id: 'education', label: 'Education', value: 'M.S. Computer Science, Stanford University', type: 'mandatory' },
    { id: 'occupation', label: 'Occupation', value: 'Senior Software Engineer at Google', type: 'mandatory' },
    { id: 'hobbies', label: 'Hobbies / Interests', value: 'Reading, hiking, painting, playing piano, and cooking new international cuisines. These interests define my personality and are important to me.', type: 'mandatory' },
    { id: 'religion', label: 'Religion / Caste / Gotra', value: 'Hindu / Brahmin / Kaundinya', type: 'mandatory' },
    // Family Details
    { id: 'father', label: 'Father\'s Name / Occupation', value: 'Mr. John Doe / Retired IAS Officer', type: 'mandatory' },
    { id: 'mother', label: 'Mother\'s Name / Status', value: 'Mrs. Mary Doe / Homemaker', type: 'mandatory' },
    { id: 'siblings', label: 'Siblings', value: 'One elder brother (married, settled in USA), one younger sister (studying medicine).', type: 'mandatory' },
    { id: 'familyType', label: 'Family Type / Values', value: 'Nuclear family with modern values and a traditional root. We are closely knit and supportive.', type: 'mandatory' },
    // Partner Preferences (Long field to test pagination)
    { id: 'partnerPref', label: 'Partner Preference Summary (Long field to test pagination)', value: 'Seeking a highly educated, ambitious, and caring partner from a similar background. Must be kind-hearted, respectful, and value family above all. Location preference is flexible, but must be willing to settle internationally. Seeking someone who enjoys travel and exploration, and is ready for long-term commitment. This detail is very important for a match. The ideal partner should also have a great sense of humor and enjoy quiet evenings at home as much as exciting trips. This field is intentionally made long to ensure that the new, higher-density layout correctly handles wrapping and pagination across the pages.', type: 'mandatory' },
    { id: 'contact', label: 'Contact Details', value: 'Email: jane.doe@example.com | Phone: +1 123-456-7890 (Please contact after 7 PM IST)', type: 'mandatory' },
    { id: 'appendix', label: 'Appendix Note', value: 'A detailed horoscope is available upon request. We believe in meeting the right person to forge a strong bond.', type: 'mandatory' },
    // Extra fields to test high density
    { id: 'extra1', label: 'Extra Field 1', value: 'This is an extra field added to test the new, highly dense content layout and ensure all content fits appropriately across multiple pages as needed.', type: 'custom' },
    { id: 'extra2', label: 'Extra Field 2', value: 'This field also helps verify the spacing and line breaks are accurate with the new, tighter $10 \text{px}$ font and $14 \text{px}$ line height. The goal is to maximize the content on the A4 page simulation.', type: 'custom' },
    { id: 'extra3', label: 'Extra Field 3', value: 'Another line of information to push the content down and confirm the pagination logic is correctly splitting the fields based on the smaller, tighter pixel requirements.', type: 'custom' },
    { id: 'extra4', label: 'Extra Field 4', value: 'Final check to see how much content we can comfortably fit on the first page before triggering the second page, achieving the density you expected.', type: 'custom' },

];


// --- EXTERNAL SCRIPT LOADING HOOK (FIX for PDF Library Not Found) ---
/**
 * Custom hook to dynamically load external scripts and wait for a global variable to be defined.
 * This is much more robust than relying on a single 'onload' event for complex libraries.
 */
const useExternalScript = (url: string, globalVariableName: string) => {
    const [isLoaded, setIsLoaded] = useState(false);

    // Assert window as a Record<string, unknown> to allow dynamic property access
    // without violating the 'no-explicit-any' rule.
    const globalScope = globalThis as Record<string, unknown>;

    useEffect(() => {
        // 1. Check if already loaded
        const globalRef = globalScope[globalVariableName];
        if (globalRef) {
            setIsLoaded(true);
            return;
        }

        // 2. Dynamically load script
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        document.body.appendChild(script);

        // 3. Polling check for loaded status (more robust than just onload)
        let attempts = 0;
        const maxAttempts = 50; // Check for up to 5 seconds
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

        // Start check immediately after appending (and on load event)
        script.onload = () => {
            // Give a slight delay after onload completes
            setTimeout(checkLoad, 50);
        };
        script.onerror = () => {
            console.error(`Script loading error for: ${url}`);
            setIsLoaded(false);
        };

        // Also start a check shortly after execution begins
        setTimeout(checkLoad, 200);

        return () => {
            // Cleanup script tag on component unmount
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [url, globalVariableName]);

    return isLoaded;
};
// --------------------------------------------------------------------


// --- TEXT MEASUREMENT HELPER ---

/**
 * Counts the number of lines a piece of text will wrap into, given a maxWidth.
 * @returns The total number of lines.
 */
const countWrappedTextLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number => {
    const words = text.split(' ');
    let line = '';

    // If text is empty or only whitespace, it consumes 0 lines of content
    if (text.trim() === '') return 0;

    let lineCount = 1;
    ctx.font = `${FONT_SIZE}px Inter, sans-serif`; // Ensure correct font size for measurement

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

// --- PAGINATION CALCULATION CORE (Runs on client-side only) ---

/**
 * Pre-calculates the field distribution across pages by simulating drawing height.
 */
const calculatePagination = (fields: BiodataField[]): PageInfo[] => {
    if (typeof document === 'undefined') return [];

    const pages: PageInfo[] = [];

    // 1. Filter out fields that have no value (they consume no space)
    const contentFields = fields.filter(f => f.value.trim() !== '');
    let remainingFields = [...contentFields];


    // Use a dummy canvas for accurate text measurement 
    const dummyCanvas = document.createElement('canvas');
    const ctx = dummyCanvas.getContext('2d');
    if (!ctx) return [];
    ctx.scale(DPI_SCALE, DPI_SCALE);
    // Set the simulation font size for accurate wrapping measurement
    ctx.font = `${FONT_SIZE}px Inter, sans-serif`;

    // Helper to calculate space consumed by a field
    const calculateFieldConsumption = (field: BiodataField): number => {

        // 1. Calculate how many lines the Value text will wrap into.
        const valueLineCount = countWrappedTextLines(ctx, field.value, VALUE_COL_WIDTH);

        // The total vertical space taken by the text block is determined by the number of wrapped value lines, 
        // since the label is always 1 line. If valueLineCount is 0, the height is 0. 
        // If valueLineCount is 1 or more, the effective line count is max(1, valueLineCount).
        const textLines = Math.max(1, valueLineCount); // At least 1 line for the label if there's a label

        // Text Block Height = (Number of lines) * LINE_HEIGHT
        const textBlockHeight = textLines * LINE_HEIGHT;

        // Total consumption: Text Block Height + Spacing (FIELD_GAP)
        return textBlockHeight + FIELD_GAP;
    };


    while (remainingFields.length > 0) {
        // Page 1 start is CONTENT_START_Y. Subsequent pages start at PADDING + FIELD_GAP.
        let currentY = pages.length === 0 ? CONTENT_START_Y : PADDING + FIELD_GAP;
        const pageFields: BiodataField[] = [];

        for (let i = 0; i < remainingFields.length; i++) {
            const field = remainingFields[i];

            // Calculate the total height this field will consume
            const requiredHeight = calculateFieldConsumption(field);

            // The position the Y cursor will be at AFTER drawing this field and the gap
            const nextCalculatedY = currentY + requiredHeight;

            // Check for page overflow. If it doesn't fit and we already drew fields on this page, break to a new page.
            if (nextCalculatedY > MAX_CONTENT_Y && pageFields.length > 0) {
                break;
            }

            // If it fits 
            pageFields.push(field);
            currentY = nextCalculatedY;
        }

        // Add the fields collected for this page
        if (pageFields.length > 0) {
            pages.push({ fields: pageFields });
            // Update remaining fields for the next iteration
            remainingFields = remainingFields.slice(pageFields.length);
        } else if (remainingFields.length > 0) {
            console.error("Pagination failed to place a field. This indicates a field is taller than a whole page.");
            // If we couldn't place any field, force it onto the page anyway (shouldn't happen with the current field structure)
            pages.push({ fields: remainingFields });
            remainingFields = [];
        }
    }

    return pages;
};


// --- Core Drawing Logic for a Single Page ---

/**
 * Utility to wrap text on the canvas and track vertical position,
 * returning the final baseline Y coordinate of the last line drawn.
 */
const wrapTextAndGetLastY = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
    const words = text.split(' ');
    let line = '';
    let lineY = y; // Start at the initial Y baseline

    // If text is empty, return the starting Y
    if (text.trim() === '') return y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, lineY);
            line = words[n] + ' ';
            lineY += lineHeight; // Move down for the next line
        } else {
            line = testLine;
        }
    }
    // Draw the last line
    ctx.fillText(line.trim(), x, lineY);
    // Return the baseline Y of the *last line drawn*.
    return lineY;
}

/**
 * Draws the content of a single page using only the fields provided.
 */
const drawContentForPage = (
    ctx: CanvasRenderingContext2D,
    pageFields: BiodataField[],
    template: Template,
    logo: ImageState,
    photo: ImageState,
    pageNumber: number = 1
) => {

    const width = CANVAS_WIDTH;
    const height = CANVAS_HEIGHT;
    let currentY = PADDING + 10;

    // 1. Draw Background
    ctx.fillStyle = template.primaryColor + '1A';
    ctx.fillRect(0, 0, width, height);

    // 2. Page Indicator
    ctx.font = `12px Inter, sans-serif`;
    ctx.fillStyle = template.primaryColor;
    ctx.textAlign = 'center';
    // Anchored 10px above the bottom padding line
    ctx.fillText(`- Page ${pageNumber} -`, width / 2, height - PADDING + 55); // Adjusted Y for new PADDING

    if (pageNumber === 1) {
        // --- 3. Header Elements (Only on Page 1) ---
        const logoSize = 60;
        const photoWidth = 120;
        const photoHeight = 160;

        // Photo Border/Background
        ctx.fillStyle = template.primaryColor;
        ctx.fillRect(width - PADDING - photoWidth, PADDING, photoWidth, photoHeight);
        ctx.fillStyle = '#ffffff'; // Inner white background
        ctx.fillRect(width - PADDING - photoWidth + 2, PADDING + 2, photoWidth - 4, photoHeight - 4);

        // Logo
        if (logo.object) {
            ctx.drawImage(logo.object, PADDING, PADDING, logoSize, logoSize);
        }

        // Photo
        if (photo.object) {
            // Draw photo slightly inset from the border
            ctx.drawImage(photo.object, width - PADDING - photoWidth + 2, PADDING + 2, photoWidth - 4, photoHeight - 4);
        }

        // Title/Name
        ctx.textAlign = 'left';
        // Title font size is slightly larger than content font size
        ctx.font = `32px bold Inter, sans-serif`;
        ctx.fillStyle = template.primaryColor;

        const nameField = pageFields.find(f => f.id === 'name');
        let nameText = 'BIO-DATA';

        if (nameField) {
            // Only take the first three words if too long for the title area
            nameText = nameField.value.split(' ').slice(0, 3).join(' ').toUpperCase();
        }

        ctx.fillText(nameText, PADDING, PADDING + 120);

        // Start content drawing here
        currentY = CONTENT_START_Y;
    } else {
        // Start content drawing closer to the top for subsequent pages
        currentY = PADDING + FIELD_GAP;
    }

    // --- 4. Draw Fields for this Page (Side-by-Side) ---
    ctx.textAlign = 'left';
    const labelX = PADDING;
    const valueX = VALUE_COL_OFFSET; // 160px offset
    const valueWidth = VALUE_COL_WIDTH; // 260px width for value

    pageFields.forEach((field) => {

        // 1. Draw Label
        ctx.font = `${FONT_SIZE}px bold Inter, sans-serif`;
        ctx.fillStyle = template.primaryColor;
        ctx.fillText(field.label, labelX, currentY);

        // Add a colon slightly offset from the label (max 150px)
        ctx.fillText(':', PADDING + LABEL_COL_WIDTH - 10, currentY);

        // 2. Draw Value (starts side-by-side with label, wraps underneath the value column)
        ctx.font = `${FONT_SIZE}px Inter, sans-serif`;
        ctx.fillStyle = '#1f2937'; // dark gray
        const displayValue = field.value;

        // lastValueLineY is the baseline Y of the last line of value text drawn
        const lastValueLineY = wrapTextAndGetLastY(ctx, displayValue, valueX, currentY, valueWidth, LINE_HEIGHT);

        // 3. Determine the baseline position for the next content block.
        // We take the last baseline drawn and add one LINE_HEIGHT to get the Y *after* the content block.
        const nextYAfterTextBlock = lastValueLineY + LINE_HEIGHT;

        // 4. Draw a separator line
        ctx.strokeStyle = template.primaryColor + '33';
        ctx.beginPath();
        // Separator Y: Halfway between the last line of text and the next line start
        ctx.moveTo(labelX, nextYAfterTextBlock - LINE_HEIGHT / 2);
        ctx.lineTo(width - PADDING, nextYAfterTextBlock - LINE_HEIGHT / 2);
        ctx.stroke();

        // 5. Move Y cursor for the next field: nextYAfterTextBlock + FIELD_GAP
        currentY = nextYAfterTextBlock + FIELD_GAP;
    });
};


// --- Sub-Component: The Biodata Preview (The Canvas) ---

interface BiodataPreviewProps {
    pageContent: PageInfo;
    template: Template;
    logo: ImageState;
    photo: ImageState;
    pageNumber: number;
}

const BiodataPreview = React.forwardRef<HTMLCanvasElement, BiodataPreviewProps>(({ pageContent, template, logo, photo, pageNumber }, ref) => {
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

        // Set canvas resolution for high DPI
        canvas.width = CANVAS_WIDTH * DPI_SCALE;
        canvas.height = CANVAS_HEIGHT * DPI_SCALE;
        canvas.style.width = `${CANVAS_WIDTH}px`;
        canvas.style.height = `${CANVAS_HEIGHT}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale context down so drawing operations work on logical pixels (500x707)
        ctx.scale(DPI_SCALE, DPI_SCALE);

        // Clear the canvas before redrawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // This function handles the async nature of image loading.
        const drawBackgroundAndContent = () => {
            // Redraw Background
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous';
            bgImg.src = template.bgImageUrl;

            const drawPage = (img: HTMLImageElement | null) => {
                if (img) {
                    ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                } else {
                    // Fallback to solid color
                    ctx.fillStyle = template.primaryColor + '1A';
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }

                // Draw the specific page content
                drawContentForPage(ctx, pageContent.fields, template, logo, photo, pageNumber);
            }

            if (bgImg.complete) {
                drawPage(bgImg);
            } else {
                bgImg.onload = () => drawPage(bgImg);
                bgImg.onerror = () => drawPage(null);
            }
        };

        drawBackgroundAndContent();

    }, [pageContent, template, logo.object, photo.object, pageNumber]);


    return (
        <div
            id="biodata-preview-container"
            // Adjusted styling to better resemble a tall, standard piece of paper
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

// --- FieldInput Component (Moved outside and memoized for focus stability) ---

interface FieldInputProps {
    field: BiodataField;
    index: number;
    isLast: boolean;
    onFieldChange: (id: string, value: string) => void;
    onLabelChange: (id: string, newLabel: string) => void;
    onFieldMove: (id: string, direction: 'up' | 'down') => void;
    onRemoveCustomField: (id: string) => void;
}

const FieldInput: React.FC<FieldInputProps> = React.memo(({
    field,
    index,
    isLast,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    onRemoveCustomField
}) => {

    const handleValueChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onFieldChange(field.id, e.target.value);
    };

    const handleLabelInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        onLabelChange(field.id, e.target.value);
    };

    return (
        <div className="flex items-start space-x-2 p-2 border-b border-gray-100 hover:bg-gray-50 rounded-md transition duration-150">
            <div className="flex flex-col space-y-1 mt-1">
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-violet-600 disabled:opacity-30 rounded transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                </button>
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'down')}
                    disabled={isLast}
                    className="p-1 text-gray-500 hover:text-violet-600 disabled:opacity-30 rounded transition duration-150"
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" /></svg>
                </button>
            </div>
            <div className="flex-1 min-w-0">
                <input
                    type="text"
                    value={field.label}
                    onChange={handleLabelInput}
                    className="w-full text-sm font-semibold p-1 mb-1 border rounded-md"
                    placeholder="Field Label"
                />
                <textarea
                    value={field.value}
                    onChange={handleValueChange}
                    rows={field.value.length > 50 ? 3 : 1}
                    className="w-full text-sm p-1 border rounded-md resize-y"
                    placeholder="Field Value / Details"
                />
            </div>
            {field.type === 'custom' && (
                <button
                    type="button"
                    onClick={() => onRemoveCustomField(field.id)}
                    className="p-1 mt-1 text-red-500 hover:text-red-700 rounded transition duration-150"
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

    // NEW: Use the robust external script loader
    const isJsPdfLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        'jspdf' // Check for the global 'jspdf' object
    );
    const isHtml2CanvasLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        'html2canvas'
    );
    const isLibrariesLoaded = isJsPdfLoaded && isHtml2CanvasLoaded;

    // The previous state 'isJsPdfLoaded' is now calculated by the hook

    const [pageContentMap, setPageContentMap] = useState<PageInfo[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Pagination Calculation (Client-side only) ---
    // Recalculated whenever fields or layout constants (like font size) change.
    useEffect(() => {
        const pages = calculatePagination(fields);
        setPageContentMap(pages);

        // Keep the current page view, or reset if it's out of bounds
        setCurrentPageIndex(prev => Math.min(prev, pages.length - 1));
        if (pages.length === 0) setCurrentPageIndex(0);

    }, [fields]);


    const totalPages = pageContentMap.length;
    const currentPageData = pageContentMap[currentPageIndex] || { fields: [] };


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

    // --- Optimized Field Handlers using useCallback for stability ---

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
            const index = prevFields.findIndex(f => f.id === id);
            if (index === -1) return prevFields;

            const newIndex = index + (direction === 'up' ? -1 : 1);

            if (newIndex < 0 || newIndex >= prevFields.length) return prevFields;

            const newFields = [...prevFields];
            [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

            return newFields;
        });
    }, []);

    const addCustomField = () => {
        const newId = `custom-${Date.now()}`;
        const newField: BiodataField = {
            id: newId,
            label: 'New Custom Detail',
            value: '', // Empty default value
            type: 'custom',
        };
        setFields(prevFields => [...prevFields, newField]);
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

        // Robust check for jsPDF constructor
        // We use window.jspdf or window.jsPDF (which is what the global definition covers)
        const jsPDFConstructor = (window).jspdf ? (window).jspdf.jsPDF : (window).jsPDF;

        if (typeof jsPDFConstructor === 'undefined' || typeof window.html2canvas === 'undefined') {
            setGenerationStatus('error');
            console.error("PDF generation failed: jsPDF or html2canvas library not found.");
            setIsGenerating(false);
            return;
        }

        try {
            // New jsPDF instance: portrait ('p'), millimeters ('mm'), A4 format ('a4')
            // Use the robustly found constructor
            const pdf = new jsPDFConstructor('p', 'mm', 'a4');
            const pdfWidth = 210; // A4 width in mm
            const pdfHeight = CANVAS_HEIGHT * pdfWidth / CANVAS_WIDTH; // A4 height (297mm) based on aspect ratio of the canvas

            // Create a temporary, off-screen canvas for rendering each page
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
                    pageNum
                );

                // 3. Add page to PDF
                if (i > 0) {
                    pdf.addPage();
                }

                // Get image data from the rendered canvas
                const imgData = tempCanvas.toDataURL('image/png');
                // Add the canvas image data to the PDF.
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            // Save the PDF
            pdf.save(`WeddingBiodata_${fields.find(f => f.id === 'name')?.value.replace(/\s/g, '_') || 'New'}.pdf`);

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
        switch (step) {
            case 1:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-violet-600">Step 1: Choose Template & Style</h2>
                        <p className="text-gray-600 mb-6">Select a pre-designed template. This determines the overall look, background, and color palette of your biodata.</p>
                        <div className="space-y-4">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition duration-200 shadow-md 
                                        ${selectedTemplate.id === template.id
                                            ? 'border-violet-600 bg-violet-50 ring-4 ring-violet-200'
                                            : 'border-gray-200 hover:border-violet-400 bg-white'
                                        }`}
                                >
                                    <div className="font-semibold text-lg" style={{ color: template.primaryColor }}>{template.name}</div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-violet-600">Step 2: Upload Photos</h2>
                        <p className="text-gray-600 mb-6">Upload your main photo and an optional logo (e.g., a family crest or initials) for the top corners.</p>
                        <div className="space-y-6">
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
                    </>
                );
            case 3:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-violet-600">Step 3: Edit & Rearrange Fields</h2>
                        <p className="text-gray-600 mb-6">
                            Customize the content. Use the **arrows** to reorder sections. Edit the **Label** (bold) and the **Value** (details) for each field. **Fields left blank will be automatically removed from the PDF.** The density of the content in the preview is now much higher to simulate a standard A4 printout.
                        </p>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {fields.map((field, index) => (
                                <FieldInput
                                    key={field.id}
                                    field={field}
                                    index={index}
                                    isLast={index === fields.length - 1}
                                    onFieldChange={handleFieldChange}
                                    onLabelChange={handleLabelChange}
                                    onFieldMove={handleFieldMove}
                                    onRemoveCustomField={removeCustomField}
                                />
                            ))}
                        </div>
                        <button
                            onClick={addCustomField}
                            className="mt-6 w-full px-4 py-2 text-base font-medium text-violet-700 bg-violet-100 rounded-lg hover:bg-violet-200 transition duration-150 shadow-sm"
                        >
                            + Add Custom Field
                        </button>

                        <div className="mt-8 pt-4 border-t border-gray-200">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Download</h3>
                            <button
                                onClick={generatePdf}
                                disabled={isGenerating || !isLibrariesLoaded}
                                className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-xl text-white transition-all duration-200 ${(!isLibrariesLoaded || isGenerating)
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-500 focus:ring-offset-2'
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
                                    <>
                                        <span className="mr-2">⬇</span>
                                        Download Final Biodata PDF (A4)
                                    </>
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

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-inter">
            <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-7">

                {/* Left Column: Wizard Controls and Steps (60%) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-lg h-fit order-2 lg:order-1">
                    {/* Step Indicator (Unchanged) */}
                    <div className="flex justify-between items-center mb-8 space-x-2">
                        {[1, 2, 3].map((s) => (
                            <React.Fragment key={s}>
                                <div className={`flex-1 flex flex-col items-center relative z-10 ${s <= step ? 'text-violet-600' : 'text-gray-400'}`}>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold border-2 transition-all duration-300 ${s <= step ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-300'}`}>
                                        {s}
                                    </div>
                                    <span className={`mt-2 text-xs font-medium text-center ${s <= step ? 'text-violet-700' : 'text-gray-500'}`}>
                                        {s === 1 ? 'Template' : s === 2 ? 'Images' : 'Content & Download'}
                                    </span>
                                </div>
                                {s < TOTAL_STEPS && (
                                    <div className={`flex-auto border-t-2 h-0 transition-all duration-300 ${s < step ? 'border-violet-400' : 'border-gray-200'}`}></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step Content */}
                    <div className="min-h-[400px]">
                        {renderStepContent()}
                    </div>

                    {/* Navigation Buttons (Unchanged) */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handlePrev}
                            disabled={step === 1}
                            className="px-6 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition duration-150"
                        >
                            ← Previous
                        </button>
                        {step < TOTAL_STEPS ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 transition duration-150"
                            >
                                Next Step →
                            </button>
                        ) : (
                            <div className="text-sm text-gray-500 flex items-center">
                                Done Editing
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
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-1">
                                Live Preview
                            </h3>

                            {/* Page Counter and Navigation */}
                            <div className="flex items-center justify-center space-x-3 mb-3 text-sm font-medium text-gray-600">
                                <button
                                    onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentPageIndex === 0}
                                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" /></svg>
                                </button>
                                <span>
                                    Page <span className="text-violet-600 font-bold">{currentPageIndex + 1}</span> of <span className="font-bold">{totalPages}</span>
                                </span>
                                <button
                                    onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={currentPageIndex === totalPages - 1}
                                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 0 0 .708L10.293 8l-5.647 5.646a.5.5 0 0 0 .708.708l6-6a.5.5 0 0 0 0-.708l-6-6a.5.5 0 0 0-.708 0z" /></svg>
                                </button>
                            </div>

                            <BiodataPreview
                                ref={currentPageIndex === 0 ? canvasRef : undefined} // Only pass ref to page 1 for PDF creation fallback
                                pageContent={currentPageData}
                                template={selectedTemplate}
                                logo={logo}
                                photo={photo}
                                pageNumber={currentPageIndex + 1}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiodataGenerator;
