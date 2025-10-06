'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// --- External Library Type Definitions (for PDF download) ---
interface JsPDFInstance {
    addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
    save: (filename: string) => void;
    addPage: () => void;
}

declare global {
    interface Window {
        jsPDF: new (orientation: string, unit: string, format: string) => JsPDFInstance;
    }
}

// --- CONSTANTS & CONFIGURATION (A4 Proportions: 500x707 px) ---
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 707; // A4 aspect ratio (500 * 1.414)
const DPI_SCALE = 2; // High DPI for crisp canvas rendering
const TOTAL_STEPS = 3;

// A4 Proportion-Matched Metrics
const PADDING = 40; // Spacing around the page
const CONTENT_START_Y = PADDING + 175; // Y coordinate where main text content starts (below photos/header)
const LINE_HEIGHT = 20; // Tighter line height for A4 density (12px font)
const MAX_CONTENT_Y = CANVAS_HEIGHT - PADDING; // Max Y coordinate before forcing a page break

// Placeholder image URLs
const TEMPLATE_BACKGROUND_IMAGE = "./images/layout-1.jpeg";
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
    font: string;
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
        font: 'serif',
        primaryColor: '#8c6e6e', // Deep Mauve
    },
    {
        id: 'modern',
        name: 'Modern Geometric',
        bgImageUrl: TEMPLATE_BACKGROUND_IMAGE_2,
        font: 'sans-serif',
        primaryColor: '#6e8c8c', // Slate Teal
    },
];

const initialFields: BiodataField[] = [
    // Personal Details
    { id: 'name', label: 'Full Name', value: 'Jane Doe', type: 'mandatory' },
    { id: 'dob', label: 'Date of Birth / Age', value: '12-05-1997 / 28', type: 'mandatory' },
    { id: 'height', label: 'Height / Weight', value: '5 ft 6 in / 55 kg', type: 'mandatory' },
    { id: 'education', label: 'Education', value: 'Master of Science (Computer Science)', type: 'mandatory' },
    { id: 'occupation', label: 'Occupation', value: 'Software Engineer at Google', type: 'mandatory' },
    { id: 'hobbies', label: 'Hobbies / Interests', value: 'Reading, Hiking, Painting, Cooking, Writing short stories and traveling to remote mountains to try new vegetarian cuisines.', type: 'mandatory' },
    { id: 'religion', label: 'Religion / Caste / Gotra', value: 'Hindu / Brahmin / Kashyap', type: 'mandatory' },
    // Family Details
    { id: 'father', label: 'Father\'s Name / Occupation', value: 'Mr. John Doe / Business Owner, retired from MNC services after 30 years.', type: 'mandatory' },
    { id: 'mother', label: 'Mother\'s Name / Status', value: 'Mrs. Lisa Doe / Homemaker, highly involved in local community charity work.', type: 'mandatory' },
    { id: 'siblings', label: 'Siblings', value: '1 Elder Brother (Married, working as a Doctor in London), 1 Younger Sister (In college).', type: 'mandatory' },
    { id: 'familyType', label: 'Family Type / Values', value: 'Nuclear / Liberal, with strong emphasis on education and traditional values.', type: 'mandatory' },
    // Partner Preferences (Made this long to force page break for demonstration)
    { id: 'partnerPref', label: 'Partner Preference Summary (Long field to test pagination)', value: 'Seeking an ambitious, caring, and well-educated professional, aged 28-32, preferably from a similar background or community. Must value family and have a positive, forward-looking approach to life. Someone who shares my interest in outdoor activities and intellectual discussions would be highly preferred. This section is intentionally lengthy to stress-test the multi-page logic, ensuring proper text wrapping and element placement across the page break. We are looking for someone who shares our family\'s core values of respect, honesty, and continuous self-improvement. The text is extended further to ensure we cross a page boundary in typical usage. We believe in mutual respect and open communication as the foundation of any lasting relationship. Compatibility in lifestyle and future goals is essential for us. This line is specifically for pushing the content further down the page.', type: 'mandatory' },
    { id: 'contact', label: 'Contact Details', value: 'jdoe@email.com | +91 98765 43210', type: 'mandatory' },
    { id: 'appendix', label: 'Appendix Note', value: 'Thank you for reviewing the biodata. We look forward to hearing from you soon.', type: 'mandatory' },
];

// --- TEXT MEASUREMENT HELPER ---

/**
 * Utility to calculate the required vertical space for text wrapping.
 * NOTE: This function is critical for pagination accuracy.
 */
const calculateWrappedTextHeight = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number => {
    const words = text.split(' ');
    let line = '';
    let lineCount = 1;

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
    // Total height = number of lines * LINE_HEIGHT
    return lineCount * LINE_HEIGHT;
}

// --- PAGINATION CALCULATION CORE (Runs on client-side only) ---

/**
 * Pre-calculates the field distribution across pages by simulating drawing height.
 */
const calculatePagination = (fields: BiodataField[], template: Template): PageInfo[] => {
    if (typeof document === 'undefined') return []; // Safety check for SSR

    const pages: PageInfo[] = [];
    let remainingFields = [...fields];

    // Use a dummy canvas for accurate text measurement 
    const dummyCanvas = document.createElement('canvas');
    const ctx = dummyCanvas.getContext('2d');
    if (!ctx) return [];
    ctx.scale(DPI_SCALE, DPI_SCALE); // Ensure scale matches drawing context

    const contentWidth = CANVAS_WIDTH - 2 * PADDING;
    const valueWidth = contentWidth - 150;

    // Helper to calculate space consumed by a field, which includes label, wrapped value, and spacing.
    const calculateFieldConsumption = (field: BiodataField): number => {
        // Label height: always 1 line
        let height = LINE_HEIGHT;

        // Value height: calculate wrapped text height
        ctx.font = `12px Inter, ${template.font}`;
        height += calculateWrappedTextHeight(ctx, field.value, valueWidth);

        // Add spacing for separator and next field: 15px
        height += 15;
        return height;
    };


    while (remainingFields.length > 0) {
        // Y position where content begins on the current page
        let currentY = pages.length === 0 ? CONTENT_START_Y : PADDING + 15;
        const pageFields: BiodataField[] = [];

        for (let i = 0; i < remainingFields.length; i++) {
            const field = remainingFields[i];

            // Calculate the total height this field will consume
            const requiredHeight = calculateFieldConsumption(field);

            // The position the Y cursor will be at AFTER drawing this field
            const nextCalculatedY = currentY + requiredHeight;

            // Check for page overflow
            if (nextCalculatedY > MAX_CONTENT_Y && pageFields.length > 0) {
                // If it doesn't fit and we already drew fields on this page, break to a new page
                break;
            }

            // If it fits (or if it's the very first field on a new page, even if long)
            pageFields.push(field);
            currentY = nextCalculatedY;

            // Edge case: If the field is so long it takes multiple pages, the loop should 
            // only take the part that fits and move on, but since we are breaking fields by
            // entry, we must ensure every field that starts on a page is placed there.
            // The current logic places the whole field, and if it's too long, it pushes 
            // the max Y limit slightly. This is acceptable for a biodata where fields
            // are short. For simplicity, we ensure if it's the first element (pageFields.length === 0),
            // it MUST be included, regardless of length.
            if (pageFields.length === 1 && nextCalculatedY > MAX_CONTENT_Y) {
                // If the *first* field is too long, we keep it on the page and move on to the next.
                // This handles the case where a single field exceeds the page boundary.
                // The assumption is the content will flow off the canvas, but we prioritize
                // placing every field. However, for an A4 template, a single field must
                // always be allowed on a page. The check `pageFields.length > 0` ensures this.
            }

        }

        // Add the fields collected for this page
        if (pageFields.length > 0) {
            pages.push({ fields: pageFields });
            // Update remaining fields for the next iteration
            remainingFields = remainingFields.slice(pageFields.length);
        } else if (remainingFields.length > 0) {
            // Should only happen if content is extremely tall, but for safety:
            console.error("Pagination failed to place a field. Forcing remaining fields onto one page.");
            pages.push({ fields: remainingFields });
            remainingFields = [];
        }
    }

    return pages;
};


// --- Core Drawing Logic for a Single Page ---

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
    const contentWidth = width - 2 * PADDING;
    let currentY = PADDING + 10;

    // 1. Draw Background
    ctx.fillStyle = template.primaryColor + '1A';
    ctx.fillRect(0, 0, width, height);

    // 2. Page Indicator
    ctx.font = `10px ${template.font}`;
    ctx.fillStyle = template.primaryColor;
    ctx.textAlign = 'center';
    ctx.fillText(`- Page ${pageNumber} -`, width / 2, height - PADDING + 10);

    if (pageNumber === 1) {
        // --- 3. Header Elements (Only on Page 1) ---
        const logoSize = 60;
        const photoWidth = 120;
        const photoHeight = 160;

        // Logo
        if (logo.object) {
            ctx.drawImage(logo.object, PADDING, PADDING, logoSize, logoSize);
        }

        // Photo
        if (photo.object) {
            ctx.drawImage(photo.object, width - PADDING - photoWidth, PADDING, photoWidth, photoHeight);
        }

        // Title/Name
        ctx.textAlign = 'left';
        ctx.font = `28px bold Inter, ${template.font}`;
        ctx.fillStyle = template.primaryColor;
        const nameField = pageFields.find(f => f.id === 'name') || pageFields[0];
        ctx.fillText(nameField?.value.toUpperCase() || 'BIO-DATA', PADDING, PADDING + 120);

        // Start content drawing here
        currentY = CONTENT_START_Y;
    } else {
        // Start content drawing closer to the top for subsequent pages
        currentY = PADDING + 15;
    }

    // --- 4. Draw Fields for this Page ---
    ctx.textAlign = 'left';
    const labelX = PADDING;
    const valueX = PADDING + 150;
    const valueWidth = contentWidth - 150;

    // Ensure text is black for content
    ctx.fillStyle = '#1f2937';

    pageFields.forEach((field) => {
        // Draw Label
        ctx.font = `12px bold Inter, ${template.font}`;
        ctx.fillStyle = template.primaryColor;
        ctx.fillText(field.label, labelX, currentY);

        // Draw Value (may wrap)
        ctx.font = `12px Inter, ${template.font}`;
        ctx.fillStyle = '#1f2937'; // gray-800
        const nextY = wrapText(ctx, field.value, valueX, currentY, valueWidth, LINE_HEIGHT);

        // Draw a separator line
        ctx.strokeStyle = template.primaryColor + '33';
        ctx.beginPath();
        ctx.moveTo(labelX, nextY - LINE_HEIGHT / 2);
        ctx.lineTo(width - PADDING, nextY - LINE_HEIGHT / 2);
        ctx.stroke();

        // Move Y cursor for the next field
        currentY = nextY + 15; // 15px gap
    });
};

/**
 * Utility to wrap text on the canvas and track vertical position.
 * @returns The next Y coordinate after drawing this text block.
 */
const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
    const words = text.split(' ');
    let line = '';
    let lineY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, lineY);
            line = words[n] + ' ';
            lineY += lineHeight;
        } else {
            line = testLine;
        }
    }
    // Draw the last line
    ctx.fillText(line.trim(), x, lineY);
    return lineY + lineHeight;
}


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
            className={`shadow-2xl rounded-2xl transition-all duration-300 border-4 border-gray-200 text-gray-800`}
            style={{
                width: `${CANVAS_WIDTH}px`,
                maxWidth: `100%`,
                height: `${CANVAS_HEIGHT}px`,
            }}
        >
            <canvas ref={setRefs} id="biodata-preview-target" />
        </div>
    );
});

BiodataPreview.displayName = 'BiodataPreview';


// --- Main Application Component ---

const BiodataGenerator: React.FC = () => {
    const [fields, setFields] = useState<BiodataField[]>(initialFields);
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
    const [logo, setLogo] = useState<ImageState>({ url: PLACEHOLDER_LOGO_URL, object: null });
    const [photo, setPhoto] = useState<ImageState>({ url: PLACEHOLDER_PHOTO_URL, object: null });
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStatus, setGenerationStatus] = useState<'success' | 'error' | 'loading' | null>(null);
    const [step, setStep] = useState(1);
    const [isJsPdfLoaded, setIsJsPdfLoaded] = useState(false);

    // NEW STATE: Stores the calculated pagination map (moved from useMemo)
    const [pageContentMap, setPageContentMap] = useState<PageInfo[]>([]);
    // State to control which page is shown in the preview
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // --- Pagination Calculation (Client-side only) ---
    useEffect(() => {
        const pages = calculatePagination(fields, selectedTemplate);
        setPageContentMap(pages);

        // Set the view to the LATEST (last) page, as requested
        if (pages.length > 0) {
            setCurrentPageIndex(pages.length - 1);
        } else {
            setCurrentPageIndex(0);
        }
    }, [fields, selectedTemplate]);


    const totalPages = pageContentMap.length;
    const currentPageData = pageContentMap[currentPageIndex] || { fields: [] };


    // Dynamic script loading for jsPDF
    useEffect(() => {
        if (typeof window.jsPDF !== 'undefined') {
            setIsJsPdfLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.async = true;

        script.onload = () => {
            console.log("jsPDF loaded successfully.");
            setIsJsPdfLoaded(true);
        };

        script.onerror = () => {
            console.error("Failed to load jsPDF script. Check CDN link.");
            setIsJsPdfLoaded(true);
            setGenerationStatus('error');
        };

        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

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

    // Field handlers (omitted for brevity, assume they are the same as previous response)
    const handleFieldChange = (id: string, value: string) => {
        setFields(prevFields =>
            prevFields.map(field =>
                field.id === id ? { ...field, value } : field
            )
        );
    };

    const handleFieldMove = (id: string, direction: 'up' | 'down') => {
        setFields(prevFields => {
            const index = prevFields.findIndex(f => f.id === id);
            if (index === -1) return prevFields;

            const newIndex = index + (direction === 'up' ? -1 : 1);

            if (newIndex < 0 || newIndex >= prevFields.length) return prevFields;

            const newFields = [...prevFields];
            [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];

            return newFields;
        });
    };

    const addCustomField = () => {
        const newId = `custom-${Date.now()}`;
        const newField: BiodataField = {
            id: newId,
            label: 'New Custom Detail',
            value: 'Enter details here...',
            type: 'custom',
        };
        setFields(prevFields => [...prevFields, newField]);
    };

    const removeCustomField = (id: string) => {
        setFields(prevFields => prevFields.filter(field => field.id !== id));
    };

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

        if (typeof window.jsPDF === 'undefined') {
            setGenerationStatus('error');
            console.error("PDF generation failed: jsPDF library not found.");
            setIsGenerating(false);
            return;
        }

        try {
            const pdf = new window.jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = CANVAS_HEIGHT * pdfWidth / CANVAS_WIDTH; // ~297 mm

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

                const imgData = tempCanvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }

            // Save the PDF
            pdf.save(`WeddingBiodata_${fields[0].value.replace(/\s/g, '_')}.pdf`);

            setGenerationStatus('success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            setGenerationStatus('error');
        } finally {
            setTimeout(() => setGenerationStatus(null), 3000);
            setIsGenerating(false);
        }
    }, [fields, isJsPdfLoaded, selectedTemplate, logo, photo, pageContentMap]);

    // --- FieldInput Component (Defined inside main component to access handlers) ---
    const FieldInput: React.FC<{ field: BiodataField, index: number, isLast: boolean }> = ({ field, index, isLast }) => (
        <div className="flex items-start space-x-2 p-2 border-b border-gray-100 hover:bg-gray-50 rounded-md transition duration-150">
            <div className="flex flex-col space-y-1 mt-1">
                <button
                    type="button"
                    onClick={() => handleFieldMove(field.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-violet-600 disabled:opacity-30 rounded transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" /></svg>
                </button>
                <button
                    type="button"
                    onClick={() => handleFieldMove(field.id, 'down')}
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
                    onChange={(e) => {
                        const newLabel = e.target.value;
                        setFields(prevFields =>
                            prevFields.map(f => f.id === field.id ? { ...f, label: newLabel } : f)
                        );
                    }}
                    className="w-full text-sm font-semibold p-1 mb-1 border rounded-md"
                    placeholder="Field Label"
                />
                <textarea
                    value={field.value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    rows={field.value.length > 50 ? 3 : 1}
                    className="w-full text-sm p-1 border rounded-md resize-y"
                    placeholder="Field Value / Details"
                />
            </div>
            {field.type === 'custom' && (
                <button
                    type="button"
                    onClick={() => removeCustomField(field.id)}
                    className="p-1 mt-1 text-red-500 hover:text-red-700 rounded transition duration-150"
                    title="Remove Custom Field"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" /></svg>
                </button>
            )}
        </div>
    );

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
                        <p className="text-gray-600 mb-6">Select a pre-designed template. This determines the overall look, color palette, and font of your biodata.</p>
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
                                    <p className="text-sm text-gray-500">Font: {template.font}</p>
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
                            Customize the content. Use the **arrows** to reorder sections. Edit the **Label** (bold) and the **Value** (details) for each field.
                        </p>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {fields.map((field, index) => (
                                <FieldInput
                                    key={field.id}
                                    field={field}
                                    index={index}
                                    isLast={index === fields.length - 1}
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
                                disabled={isGenerating || !isJsPdfLoaded}
                                className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-xl text-white transition-all duration-200 ${(!isJsPdfLoaded || isGenerating)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-500 focus:ring-offset-2'
                                    }`}
                            >
                                {!isJsPdfLoaded ? (
                                    <>
                                        <span className="animate-pulse mr-2">⏳</span>
                                        Loading PDF Library...
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
                                    An error occurred during PDF generation.
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
                                Live Preview (A4 Sim.)
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
