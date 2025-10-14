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
    id: string;
    label: string;
    value: string;
    type: FieldType; // 'mandatory' | 'custom'
    groupId: FieldGroupId;
    inputType: InputFieldType; // 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'time'
    options?: string[]; // only for select/radio
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
export type InputFieldType = 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio';

interface ComplexField {
    id: string;
    label: string;
    value: string;
    type: InputFieldType;
    group: 'personal' | 'family' | 'contact';
    options?: string[]; // Optional, for select/radio fields
}

const INITIAL_COMPLEX_FIELDS: ComplexField[] = [
    // ---------------- PERSONAL ----------------
    { id: 'name', label: 'Full Name', value: '', type: 'text', group: 'personal' },
    { id: 'dob', label: 'Date of Birth', value: '', type: 'date', group: 'personal' },
    { id: 'tob', label: 'Time of Birth', value: '', type: 'time', group: 'personal' },
    { id: 'pob', label: 'Place of Birth', value: '', type: 'text', group: 'personal' },
    { id: 'gender', label: 'Gender', value: '', type: 'radio', group: 'personal', options: ['Male', 'Female', 'Transgender', 'Other'] },
    { id: 'marital_status', label: 'Marital Status', value: '', type: 'select', group: 'personal', options: ['Unmarried (Single)', 'Divorsed', 'Widowed', 'Divorse Awaiting', 'Seperated', 'Annulled'] },
    { id: 'religion', label: 'Religion', value: '', type: 'select', group: 'personal', options: ['Hindu', 'Muslim', 'Christian', 'Jewish', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Inter-Religion', 'Spiritual - No Religious', 'No Religion'] },
    { id: 'caste', label: 'Caste', value: '', type: 'text', group: 'personal' },
    { id: 'sub_caste', label: 'Sub Caste', value: '', type: 'text', group: 'personal' },
    { id: 'manglik', label: 'Manglik', value: '', type: 'radio', group: 'personal', options: ['Yes', 'No', 'Partial (Anshik)', "Don't Believe"] },
    { id: 'rashi', label: 'Rashi', value: '', type: 'select', group: 'personal', options: ['Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)', 'Dhanur (Sagittarious)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'] },
    { id: 'nakshatra', label: 'Nakshatra', value: '', type: 'select', group: 'personal', options: ['Aswini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Poorva Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Poorvashada', 'Uthrashada', 'Shravana', 'Dhanishtha', 'Shathabhisha', 'Poorva Bhadrapada', 'Uttara Bhadrapada', 'Revati'] },
    { id: 'gotra', label: 'Gotra', value: '', type: 'text', group: 'personal' },
    { id: 'complex', label: 'Complex', value: '', type: 'select', group: 'personal', options: ['Very Fair', 'Fair', 'Medium', 'Wheatish', 'Brown', 'Dark'] },
    { id: 'body_type', label: 'Body Type', value: '', type: 'select', group: 'personal', options: ['Slim', 'Average', 'Fit', 'Athletic', 'Heavy'] },
    { id: 'height', label: 'Height', value: '', type: 'text', group: 'personal' },
    { id: 'weight', label: 'Weight', value: '', type: 'text', group: 'personal' },
    { id: 'blood_group', label: 'Blood Group', value: '', type: 'select', group: 'personal', options: ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve'] },
    { id: 'mother_tongue', label: 'Mother Tongue', value: '', type: 'select', group: 'personal', options: ['Hindi', 'Punjabi', 'Haryanvi', 'Himachali', 'Kashmiri', 'Sindhi', 'Urdu', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Oriya', 'Sikkim', 'Nepali', 'English'] },
    { id: 'community', label: 'Community', value: '', type: 'select', group: 'personal', options: ['Hindi', 'Punjabi', 'Sindhi', 'Jain', 'Rajasthani', 'Gujarati', 'Bengali', 'Kannada', 'Telegu', 'Brij', 'Nepali', 'English', 'Haryanvi', 'Pahari', 'Marathi'] },
    { id: 'education', label: 'Education', value: '', type: 'text', group: 'personal' },
    { id: 'institution', label: 'Institution Name', value: '', type: 'text', group: 'personal' },
    { id: 'occupation', label: 'Job/Occupation', value: '', type: 'text', group: 'personal' },
    { id: 'job_place', label: 'Job Place', value: '', type: 'text', group: 'personal' },
    { id: 'job_experience', label: 'Job Experience', value: '', type: 'text', group: 'personal' },
    { id: 'annual_income', label: 'Annual Income', value: '', type: 'text', group: 'personal' },
    { id: 'diet', label: 'Diet', value: '', type: 'radio', group: 'personal', options: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'] },
    { id: 'hobbies', label: 'Hobbies', value: '', type: 'text', group: 'personal' },
    { id: 'interests', label: 'Interests', value: '', type: 'text', group: 'personal' },
    { id: 'language_known', label: 'Language Known', value: '', type: 'text', group: 'personal' },
    { id: 'about_myself', label: 'About Myself', value: '', type: 'textarea', group: 'personal' },
    { id: 'expectation', label: 'Expectation', value: '', type: 'textarea', group: 'personal' },

    // ---------------- FAMILY ----------------
    { id: 'grand_father_name', label: 'Grand Father Name', value: '', type: 'text', group: 'family' },
    { id: 'grand_father_occupation', label: 'Grand Father Occupation', value: '', type: 'text', group: 'family' },
    { id: 'grand_mother_name', label: 'Grand Mother Name', value: '', type: 'text', group: 'family' },
    { id: 'grand_mother_occupation', label: 'Grand Mother Occupation', value: '', type: 'text', group: 'family' },
    { id: 'father_name', label: 'Father Name', value: '', type: 'text', group: 'family' },
    { id: 'father_occupation', label: 'Father Occupation', value: '', type: 'text', group: 'family' },
    { id: 'mother_name', label: 'Mother Name', value: '', type: 'text', group: 'family' },
    { id: 'mother_occupation', label: 'Mother Occupation', value: '', type: 'text', group: 'family' },
    { id: 'brothers', label: 'Brothers', value: '', type: 'text', group: 'family' },
    { id: 'sisters', label: 'Sisters', value: '', type: 'text', group: 'family' },
    { id: 'kids', label: 'Kids', value: '', type: 'text', group: 'family' },
    { id: 'relatives', label: 'Relatives', value: '', type: 'text', group: 'family' },
    { id: 'family_language', label: 'Family Language', value: '', type: 'text', group: 'family' },
    { id: 'family_status', label: 'Family Status', value: '', type: 'select', group: 'family', options: ['Affluent', 'Upper Middle Class', 'Middle Class', 'Lower Middle Class', 'Average', 'Lower Class'] },
    { id: 'family_type', label: 'Family Type', value: '', type: 'select', group: 'family', options: ['Joint Family', 'Nuclear Family', 'Seperated', 'Other'] },
    { id: 'family_values', label: 'Family Values', value: '', type: 'select', group: 'family', options: ['Orthodox', 'Conservative', 'Moderate', 'Liberal'] },
    { id: 'family_income', label: 'Family Income', value: '', type: 'text', group: 'family' },
    { id: 'family_assets', label: 'Family Assets', value: '', type: 'text', group: 'family' },
    { id: 'about_family', label: 'About Family', value: '', type: 'textarea', group: 'family' },

    // ---------------- CONTACT ----------------
    { id: 'personal_contact', label: 'Personal Contact', value: '', type: 'text', group: 'contact' },
    { id: 'contact_persons', label: 'Contact Persons', value: '', type: 'select', group: 'contact', options: ['Father', 'Mother', 'Brother', 'Sister', 'Relative'] },
    { id: 'email', label: 'E-mail', value: '', type: 'text', group: 'contact' },
    { id: 'phone_number', label: 'Phone Number', value: '', type: 'text', group: 'contact' },
    { id: 'mobile_number', label: 'Mobile No.', value: '', type: 'text', group: 'contact' },
    { id: 'home_town', label: 'Home Town', value: '', type: 'text', group: 'contact' },
    { id: 'permanent_address', label: 'Permanent Address', value: '', type: 'text', group: 'contact' },
    { id: 'present_address', label: 'Present Address', value: '', type: 'text', group: 'contact' },
    { id: 'preferred_contact_time', label: 'Preferred Contact Time', value: '', type: 'text', group: 'contact' },
    { id: 'picture_profile', label: 'Picture Profile', value: '', type: 'text', group: 'contact' },
    { id: 'notes', label: 'Notes', value: '', type: 'textarea', group: 'contact' }
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
            const label = (labels[i] || '').replace(':', '').trim();
            const value = (values[i] || '').trim();

            if (label || value) {
                flatFields.push({
                    id: `${cf.id}-${i}`,
                    label,
                    value,
                    type: 'mandatory',        // logic type
                    groupId: cf.group,        // 'personal' | 'family' | 'contact'
                    inputType: cf.type,       // actual HTML input type
                    options: cf.options,      // select/radio options
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
    }
];



// --- Detiy Logos ---
const deityLogos: string[] = [
    '/images/dieties/Shadisite-01.png',
    '/images/dieties/Shadisite-02.png',
    '/images/dieties/Shadisite-03.png',
    '/images/dieties/Shadisite-04.png',
    '/images/dieties/Shadisite-05.png',
    '/images/dieties/Shadisite-06.png',
    '/images/dieties/Shadisite-07.png',
    '/images/dieties/Shadisite-08.png',
    '/images/dieties/Shadisite-09.png',
    '/images/dieties/Shadisite-10.png',
]



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
    logo: string, // static image URL or base64
    dietyText: string,
    templateHeading: string,
    photo: ImageState,
    pageNumber: number = 1,
    prevPageEndGroup: CanonicalGroupId | null = null
) => {
    const width = CANVAS_WIDTH;
    let currentY: number;

    // === Create and draw logo (static URL) ===
    let logoImg: HTMLImageElement | null = null;
    if (logo) {
        logoImg = new Image();
        logoImg.src = logo;
    }

    if (pageNumber === 1) {
        // --- Header Elements ---
        const logoWidth = 80;
        const logoHeight = 80;

        const photoWidth = 110;
        const photoHeight = 140;

        const spacingFromTop = PADDING;
        const spacingBetweenHeaderItems = 10;

        // --- Logo (Top Left) ---
        const logoX = PADDING;
        const logoY = spacingFromTop;

        if (logoImg && logoImg.complete) {
            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        } else if (logoImg) {
            logoImg.onload = () => {
                ctx.drawImage(logoImg!, logoX, logoY, logoWidth, logoHeight);
            };
        }

        // --- Photo (Top Right) ---
        const photoX = width - PADDING - photoWidth;
        const photoY = spacingFromTop;

        ctx.fillStyle = template.primaryColor;
        ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(photoX + 2, photoY + 2, photoWidth - 4, photoHeight - 4);

        if (photo.object) {
            ctx.drawImage(photo.object, photoX + 2, photoY + 2, photoWidth - 4, photoHeight - 4);
        }

        // --- Diety Text (Below Logo) ---
        ctx.font = `bold ${FONT_SIZE + 4}px Pacifico, cursive`;
        ctx.fillStyle = template.primaryColor;

        // Added a bit more space below logo (was logoHeight + spacingBetweenHeaderItems)
        const dietyTextY = logoY + logoHeight + spacingBetweenHeaderItems + 6;
        ctx.fillText(dietyText, logoX, dietyTextY);

        // --- Template Heading (Below Diety Text) ---
        // Added extra space below dietyText and increased font size
        const headingFontSize = FONT_SIZE + 15; // was +6 before
        ctx.font = `bold ${headingFontSize}px Inter, sans-serif`;
        ctx.fillStyle = '#1f2937';
        const headingY = dietyTextY + FONT_SIZE + 20; // increased spacing below diety text
        ctx.fillText(templateHeading, logoX, headingY);

        // --- Start content area below heading ---
        currentY = headingY + headingFontSize + 24; // slightly more space before fields
    } else {
        // For next pages, start near top
        currentY = PADDING + FIELD_GAP;
    }

    // === Draw Fields ===
    ctx.textAlign = 'left';
    const labelX = PADDING;
    const valueX = VALUE_COL_OFFSET;
    const valueWidth = VALUE_COL_WIDTH;

    let lastCanonicalGroupId: CanonicalGroupId | null =
        pageNumber === 1
            ? ('none' as CanonicalGroupId)
            : prevPageEndGroup || ('none' as CanonicalGroupId);

    pageFields.forEach((field) => {
        const currentCanonicalGroupId = getCanonicalGroupId(field.groupId);

        // ✅ Skip if value is empty
        if (!field.value || field.value.trim() === '') return;

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
        const bottomY = wrapTextAndGetLastY(ctx, ': ' + field.value, valueX, currentY, valueWidth, LINE_HEIGHT);

        currentY = bottomY + FIELD_GAP;
    });
};

// --- Sub-Component: The Biodata Preview (The Canvas) ---

interface BiodataPreviewProps {
    pageContent: PageInfo;
    template: Template;
    logo: string;
    dietyText: string;
    templateHeading: string;
    photo: ImageState;
    pageNumber: number;
    // NEW: Passed down to control heading drawing
    prevPageEndGroup: CanonicalGroupId | null;
}

const BiodataPreview = React.forwardRef<HTMLCanvasElement, BiodataPreviewProps>(({ pageContent, template, logo, dietyText, templateHeading, photo, pageNumber, prevPageEndGroup }, ref) => {
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

                drawContentForPage(ctx, pageContent.fields, template, logo, dietyText, templateHeading, photo, pageNumber, prevPageEndGroup);
            }

            if (bgImg.complete) {
                drawPage(bgImg);
            } else {
                bgImg.onload = () => drawPage(bgImg);
                bgImg.onerror = () => drawPage(null);
            }
        };

        drawBackgroundAndContent();

    }, [pageContent, template, photo.object, pageNumber, prevPageEndGroup, logo, photo, dietyText, templateHeading]);


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
    // Pass ComplexField metadata for input rendering
    inputMeta?: ComplexField;
}

const FieldInput: React.FC<FieldInputProps> = React.memo(({
    field,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    fieldGroupIds
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onFieldChange(field.id, e.target.value);
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onLabelChange(field.id, e.target.value);
    };

    const isCustomField = field.id.startsWith('custom-');
    const currentGroupIndex = fieldGroupIds.findIndex(id => id === field.id);
    const isFirstInGroup = currentGroupIndex === 0;
    const isLastInGroup = currentGroupIndex === fieldGroupIds.length - 1;

    return (
        <div className="flex items-start space-x-3 p-3 border-b-2 border-fuchsia-50 hover:bg-fuchsia-50 rounded-lg transition duration-200">
            {/* Move Buttons */}
            <div className="flex flex-col space-y-1 mt-1 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'up')}
                    disabled={isFirstInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'down')}
                    disabled={isLastInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" />
                    </svg>
                </button>
            </div>

            {/* Field Inputs */}
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:space-x-4">
                {/* Label */}
                <div className="w-full md:w-2/5 mb-2 md:mb-0">
                    <input
                        type="text"
                        value={field.label}
                        onChange={handleLabelChange}
                        className={`w-full text-sm font-semibold p-2 border rounded-lg shadow-sm transition duration-150 ${isCustomField
                            ? 'border-gray-300 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500'
                            : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                        placeholder="Field Label"
                        readOnly={!isCustomField}
                        disabled={!isCustomField}
                    />
                </div>

                {/* Value */}
                <div className="w-full md:w-3/5">

                    {field.inputType === 'textarea' && (
                        <textarea
                            value={field.value}
                            onChange={handleChange}
                            rows={field.value.length > 50 ? 3 : 1}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                            placeholder={`Enter ${field.label}...`}
                        />
                    )}

                    {['text', 'date', 'time'].includes(field.inputType) && (
                        <input
                            type={field.inputType}
                            value={field.value}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                            placeholder={`Enter ${field.label}...`}
                        />
                    )}

                    {field.inputType === 'select' && field.options && (
                        <select
                            value={field.value}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                        >
                            <option value="">Select {field.label}</option>
                            {field.options.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}

                    {field.inputType === 'radio' && field.options && (
                        <div className="flex flex-wrap gap-4">
                            {field.options.map((opt, idx) => (
                                <label key={idx} className="flex items-center gap-1 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name={field.id}
                                        value={opt}
                                        checked={field.value === opt}
                                        onChange={handleChange}
                                        className="accent-fuchsia-500"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
});

FieldInput.displayName = 'FieldInput';


// --- Main Application Component ---

const BiodataGenerator: React.FC = () => {
    const [templatePage, setTemplatePage] = useState(0);
    const [fields, setFields] = useState<BiodataField[]>(initialFields);
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
    const [selectedLogo, setLogo] = useState<string>(deityLogos[0]);
    const [dietyText, setDietyText] = useState<string>('');
    const [templateHeading, setTemplateHeading] = useState<string>('');
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
        // loadImage(PLACEHOLDER_LOGO_URL, setLogo);
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

    const handleTemplateMetaChange = useCallback(
        (field: 'dietyText' | 'templateHeading', value: string) => {
            if (field === 'dietyText') {
                setDietyText(value);
            } else if (field === 'templateHeading') {
                setTemplateHeading(value);
            }
        },
        []
    );

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

    const removeCustomField = useCallback((id: string) => {
        setFields(prevFields => prevFields.filter(field => field.id !== id));
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            const setter = setPhoto;

            const currentUrl = photo.url;
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
                    selectedLogo,
                    dietyText,
                    templateHeading,
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
    }, [fields, selectedTemplate, selectedLogo, dietyText, templateHeading, photo, pageContentMap]);


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
        // --- Template Pagination Logic ---
        const TEMPLATES_PER_PAGE = 10;
        const totalTemplatePages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);
        const paginatedTemplates = templates.slice(
            templatePage * TEMPLATES_PER_PAGE,
            (templatePage + 1) * TEMPLATES_PER_PAGE
        );

        // --- Helper: Add custom field below a specific field ---
        const addCustomFieldBelow = (
            groupType: 'personal' | 'family' | 'custom',
            afterFieldId: string
        ) => {
            setFields(prevFields => {
                const index = prevFields.findIndex(f => f.id === afterFieldId);
                if (index === -1) return prevFields;

                const afterField = prevFields[index];

                const newField: BiodataField = {
                    id: `custom-${Date.now()}`,
                    label: 'New Custom Field',
                    value: '',
                    type: 'custom', // custom field type
                    groupId: groupType === 'custom' ? 'custom' : afterField.groupId,
                    inputType: 'text', // default input type for custom fields
                    options: [],       // empty by default
                };

                const updatedFields = [...prevFields];
                updatedFields.splice(index + 1, 0, newField);
                return updatedFields;
            });
        };

        // --- Filter fields for current step ---
        const groupIds = getCurrentStepFieldIds(step);
        const filteredFields = fields.filter(f => groupIds.includes(f.id));

        switch (step) {
            case 1:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">
                            Step 1: Template & Photo Setup
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Select a visual theme and provide your photos.
                        </p>

                        {/* Template Grid */}
                        <div className="space-y-4 mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                                Select Template
                            </h3>

                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                                {paginatedTemplates.map((template, index) => (
                                    <div
                                        key={`${template.id}-${index}`}
                                        onClick={() => setSelectedTemplate(template)}
                                        className={`p-1 border-2 rounded-lg cursor-pointer transition duration-200 shadow-md ${selectedTemplate.id === template.id
                                            ? `${primaryBorderClass} ring-4 ${primaryRingClass}`
                                            : 'border-gray-200 hover:border-fuchsia-400'
                                            }`}
                                    >
                                        <img
                                            src={template.bgImageUrl}
                                            alt={template.name}
                                            className="w-full h-auto rounded-sm object-cover"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalTemplatePages > 1 && (
                                <div className="flex items-center justify-end gap-4 mt-3">
                                    {/* Prev */}
                                    <button
                                        onClick={() =>
                                            setTemplatePage(p => Math.max(0, p - 1))
                                        }
                                        disabled={templatePage === 0}
                                        className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 cursor-pointer ${templatePage === 0
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'hover:bg-gray-100 active:scale-95'
                                            }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                            className="w-5 h-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M15 19l-7-7 7-7"
                                            />
                                        </svg>
                                    </button>

                                    {/* Indicator */}
                                    <span className="font-medium text-gray-600 select-none text-sm">
                                        Page {templatePage + 1} / {totalTemplatePages}
                                    </span>

                                    {/* Next */}
                                    <button
                                        onClick={() =>
                                            setTemplatePage(p =>
                                                Math.min(totalTemplatePages - 1, p + 1)
                                            )
                                        }
                                        disabled={
                                            templatePage === totalTemplatePages - 1
                                        }
                                        className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 cursor-pointer ${templatePage === totalTemplatePages - 1
                                            ? 'opacity-40 cursor-not-allowed'
                                            : 'hover:bg-gray-100 active:scale-95'
                                            }`}
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth="2"
                                            stroke="currentColor"
                                            className="w-5 h-5"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                                Select Diety Logo
                            </h3>

                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                {deityLogos.map((logo, index) => (
                                    <div
                                        key={`${logo}-${index}`}
                                        onClick={() => setLogo(logo)}
                                        className={`p-1 w-[80px] h-[80px] border-2 rounded-lg cursor-pointer transition duration-200 shadow-md ${selectedLogo === logo
                                            ? `${primaryBorderClass} ${primaryBgClass} ring-4 ${primaryRingClass}`
                                            : 'border-gray-200 hover:border-fuchsia-400'
                                            }`}
                                    >
                                        <img
                                            src={logo}
                                            alt="logo"
                                            className="h-[100%] w-100 object-contain"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Diety Text and Template Heading Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-3">
                                        Diety Text
                                    </label>
                                    <input
                                        type="text"
                                        value={dietyText}
                                        onChange={(e) => handleTemplateMetaChange('dietyText', e.target.value)}
                                        placeholder="Enter diety name or text"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block font-medium text-gray-700 mb-3">
                                        Template Heading
                                    </label>
                                    <input
                                        type="text"
                                        value={templateHeading}
                                        onChange={(e) => handleTemplateMetaChange('templateHeading', e.target.value)}
                                        placeholder="Enter heading for the template"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none"
                                    />
                                </div>

                            </div>
                        </div>
                    </>
                );

            case 2:
            case 3:
                const stepTitle = step === 2 ? 'Personal Info' : 'Family Info';
                const stepSubtitle =
                    step === 2
                        ? 'Customize your personal details. Click + beside a field to add a new one below.'
                        : 'Enter family details and click + beside a field to add a new one below.';
                const addGroup = step === 2 ? 'personal' : 'family';

                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">
                            Step {step}: Edit {stepTitle}
                        </h2>
                        <p className="text-gray-600 mb-6">{stepSubtitle}</p>

                        <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0 mb-6">
                            <ImageUpload
                                label=""
                                imageType="photo"
                                onUpload={handleImageUpload}
                                currentUrl={photo.url}
                            />
                        </div>

                        <div
                            ref={scrollRef}
                            className="space-y-2 max-h-[500px] overflow-y-auto pr-2"
                        >
                            {filteredFields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="relative group flex items-center gap-2"
                                >
                                    <div className="flex-1">
                                        <FieldInput
                                            field={field}
                                            index={index}
                                            isLast={index === filteredFields.length - 1}
                                            onFieldChange={handleFieldChange}
                                            onLabelChange={handleLabelChange}
                                            onFieldMove={handleFieldMove}
                                            onRemoveCustomField={removeCustomField}
                                            fieldGroupIds={groupIds}
                                        />
                                    </div>

                                    {/* Right-side action buttons */}
                                    <div className="flex flex-col items-center gap-2">
                                        {/* ➕ Add Field Button */}
                                        <button
                                            type="button"
                                            onClick={() => addCustomFieldBelow(addGroup as 'personal' | 'family' | 'custom', field.id)}
                                            className="cursor-pointer transition-all duration-150 text-fuchsia-600 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                            title="Add custom field below"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="2"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>

                                        {/* 🗑️ Delete button — only for custom fields */}
                                        {field.id.startsWith('custom-') && (
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(field.id)}
                                                className="cursor-pointer transition-all duration-150 text-red-500 hover:bg-red-500 hover:text-white border border-red-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                                title="Delete custom field"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                            ))}
                        </div>
                    </>
                );

            case 4:
                return (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">
                            Step 4: Contact & Download
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Enter contact details and click + beside a field to add
                            a new one below. Use the button below to download your
                            biodata PDF.
                        </p>

                        <div
                            ref={scrollRef}
                            className="space-y-2 max-h-[350px] overflow-y-auto pr-2"
                        >
                            {filteredFields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="relative group flex items-center gap-2"
                                >
                                    {/* Field input */}
                                    <div className="flex-1">
                                        <FieldInput
                                            field={field}
                                            index={index}
                                            isLast={index === filteredFields.length - 1}
                                            onFieldChange={handleFieldChange}
                                            onLabelChange={handleLabelChange}
                                            onFieldMove={handleFieldMove}
                                            onRemoveCustomField={removeCustomField}
                                            fieldGroupIds={groupIds}
                                        />
                                    </div>

                                    {/* Right-side buttons */}
                                    <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        {/* ➕ Add Button */}
                                        <button
                                            type="button"
                                            onClick={() => addCustomFieldBelow('custom', field.id)}
                                            className="text-fuchsia-600 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                            title="Add custom field below"
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="2"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>

                                        {/* 🗑️ Delete Button — only for custom fields */}
                                        {field.id.startsWith('custom-') && (
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(field.id)}
                                                className="text-red-500 hover:bg-red-500 hover:text-white border border-red-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                                title="Delete custom field"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" /><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Download Section */}
                        <div className="mt-8 pt-4 border-t border-gray-200">
                            <h3 className="text-xl font-semibold mb-4 text-gray-700">Download</h3>
                            <button
                                onClick={generatePdf}
                                disabled={isGenerating || !isLibrariesLoaded}
                                className={`w-full flex items-center justify-center px-10 py-4 border border-transparent text-base font-medium rounded-xl shadow-xl text-white transition-all duration-200 cursor-pointer ${!isLibrariesLoaded || isGenerating
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
                                logo={selectedLogo}
                                dietyText={dietyText}
                                templateHeading={templateHeading}
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
