'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// Load jsPDF dynamically or assume it's loaded in the environment for PDF generation.
// For a single file context, we assume the user loads it via a script tag.
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// --- External Library Type Definitions (for PDF download) ---
interface JsPDFInstance {
  addImage: (data: string, format: string, x: number, y: number, w: number, h: number) => void;
  save: (filename: string) => void;
}

declare global {
  interface Window {
    jsPDF: new (orientation: string, unit: string, format: string) => JsPDFInstance;
  }
}

// --- CONSTANTS & CONFIGURATION ---
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 800; // Standard A4-ish ratio for a single page biodata
const DPI_SCALE = 2; // High DPI for crisp canvas rendering
const TOTAL_STEPS = 3;

// Placeholder image URLs (using Placehold.co)
const TEMPLATE_BACKGROUND_IMAGE = "https://placehold.co/500x800/f0e6e6/8c6e6e?text=Floral+Background";
const TEMPLATE_BACKGROUND_IMAGE_2 = "https://placehold.co/500x800/e6f0f0/6e8c8c?text=Geometric+Pattern";
const PLACEHOLDER_PHOTO_URL = "https://placehold.co/150x200/cccccc/333333?text=User+Photo";
const PLACEHOLDER_LOGO_URL = "https://placehold.co/80x80/ffffff/5c4b51?text=Logo";


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
    { id: 'hobbies', label: 'Hobbies / Interests', value: 'Reading, Hiking, Painting, Cooking', type: 'mandatory' },
    { id: 'religion', label: 'Religion / Caste / Gotra', value: 'Hindu / Brahmin / Kashyap', type: 'mandatory' },
    
    // Family Details
    { id: 'father', label: 'Father\'s Name / Occupation', value: 'Mr. John Doe / Business Owner', type: 'mandatory' },
    { id: 'mother', label: 'Mother\'s Name / Status', value: 'Mrs. Lisa Doe / Homemaker', type: 'mandatory' },
    { id: 'siblings', label: 'Siblings', value: '1 Elder Brother (Married), 1 Younger Sister', type: 'mandatory' },
    { id: 'familyType', label: 'Family Type / Values', value: 'Nuclear / Liberal', type: 'mandatory' },
    
    // Partner Preferences
    { id: 'partnerPref', label: 'Partner Preference Summary', value: 'Seeking an ambitious and caring professional, aged 28-32, preferably from a similar background.', type: 'mandatory' },
    
    // Contact
    { id: 'contact', label: 'Contact Details', value: 'jdoe@email.com | +91 98765 43210', type: 'mandatory' },
];

// --- Sub-Component: The Biodata Preview (The Canvas) ---

interface BiodataPreviewProps {
    fields: BiodataField[];
    template: Template;
    logo: ImageState;
    photo: ImageState;
}

const BiodataPreview = React.forwardRef<HTMLCanvasElement, BiodataPreviewProps>(({ fields, template, logo, photo }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Combine the ref from forwardRef with a local ref
  const setRefs = useCallback((node: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = node;

    if (!ref) return;
    if (typeof ref === 'function') {
      ref(node);
    } else {
      (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
    }
  }, [ref]);

    // Utility to wrap text on the canvas
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
        const words = text.split(' ');
        let line = '';
        let lineY = y;

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, lineY);
                line = words[n] + ' ';
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, lineY);
        return lineY + lineHeight;
    }

    // Main drawing function. fields and template are passed as arguments, so they are excluded
    // from the dependency array.
    const drawBiodata = useCallback((ctx: CanvasRenderingContext2D, fields: BiodataField[], template: Template) => {
        
        // --- Setup ---
        const width = CANVAS_WIDTH;
        const height = CANVAS_HEIGHT;
        const padding = 30;
        const contentWidth = width - 2 * padding;
        const lineHeight = 20;
        let currentY = padding + 10; // Start Y position

        // 1. Draw Background Image
        // This function handles the async nature of image loading.
        const drawBackgroundAndContent = (bgImgObject: HTMLImageElement | null) => {
            // Draw Background
            if (bgImgObject) {
                ctx.drawImage(bgImgObject, 0, 0, width, height);
            } else {
                // Fallback to solid color if image fails to load
                ctx.fillStyle = template.primaryColor + '1A';
                ctx.fillRect(0, 0, width, height);
            }

            // --- Draw Content ---
            currentY = padding + 10;
            
            // --- 2. Logo (Top Left) ---
            const logoSize = 80;
            const logoX = padding;
            const logoY = padding;
            // logo.object is used from the outer scope (props) and is a dependency
            if (logo.object) { 
                // Draw logo image, maintaining aspect ratio
                ctx.drawImage(logo.object, logoX, logoY, logoSize, logoSize);
            } else {
                // Placeholder box for logo
                ctx.fillStyle = template.primaryColor + '55';
                ctx.fillRect(logoX, logoY, logoSize, logoSize);
                ctx.font = `10px ${template.font}`;
                ctx.fillStyle = template.primaryColor;
                ctx.textAlign = 'center';
                ctx.fillText('Logo', logoX + logoSize/2, logoY + logoSize/2);
            }

            // --- 3. Photo (Top Right) ---
            const photoWidth = 150;
            const photoHeight = 200;
            const photoX = width - padding - photoWidth;
            const photoY = padding;
            // photo.object is used from the outer scope (props) and is a dependency
            if (photo.object) {
                // Draw photo image, maintaining aspect ratio within the box
                ctx.drawImage(photo.object, photoX, photoY, photoWidth, photoHeight);
            } else {
                // Placeholder box for photo
                ctx.fillStyle = template.primaryColor + '55';
                ctx.fillRect(photoX, photoY, photoWidth, photoHeight);
                ctx.font = `14px ${template.font}`;
                ctx.fillStyle = template.primaryColor;
                ctx.textAlign = 'center';
                ctx.fillText('User Photo', photoX + photoWidth/2, photoY + photoHeight/2);
            }
            
            // Reset Y position to start content below the main image/logo area
            currentY = photoY + photoHeight + padding;
            
            // --- 4. Main Title/Header ---
            ctx.textAlign = 'center';
            ctx.font = `30px bold Inter, ${template.font}`;
            ctx.fillStyle = template.primaryColor;
            ctx.fillText('BIO-DATA FOR MARRIAGE', width / 2, currentY);
            currentY += 40;
            
            ctx.font = `14px italic Inter, ${template.font}`;
            ctx.fillStyle = '#6b7280'; // gray-500
            ctx.fillText(`Date Generated: ${new Date().toLocaleDateString()}`, width / 2, currentY);
            currentY += 40;
            
            // --- 5. Draw Fields (Dynamically positioned) ---
            ctx.textAlign = 'left';
            const labelX = padding;
            const valueX = padding + 150; // Value starts 150px from the left
            const valueWidth = contentWidth - 150;

            fields.forEach((field) => {
                // Draw Label
                ctx.font = `14px bold Inter, ${template.font}`;
                ctx.fillStyle = template.primaryColor;
                ctx.fillText(field.label.toUpperCase(), labelX, currentY);

                // Draw Value (may wrap)
                ctx.font = `14px Inter, ${template.font}`;
                ctx.fillStyle = '#1f2937'; // gray-800
                const nextY = wrapText(ctx, field.value, valueX, currentY, valueWidth, lineHeight);
                
                // Draw a separator line
                ctx.strokeStyle = template.primaryColor + '33';
                ctx.beginPath();
                ctx.moveTo(labelX, nextY - lineHeight/2);
                ctx.lineTo(width - padding, nextY - lineHeight/2);
                ctx.stroke();

                // Move Y cursor for the next field
                currentY = nextY + 10;
            });
        };

        // Load the background image synchronously if possible, or asynchronously
        if (template.bgImageUrl) {
            const bgImg = new Image();
            bgImg.crossOrigin = 'anonymous'; // Important for canvas toDataURL
            bgImg.src = template.bgImageUrl;
            
            if (bgImg.complete) {
                drawBackgroundAndContent(bgImg);
            } else {
                bgImg.onload = () => drawBackgroundAndContent(bgImg);
                bgImg.onerror = () => drawBackgroundAndContent(null);
            }
        } else {
            drawBackgroundAndContent(null);
        }

    }, [logo.object, photo.object]); // Only depends on images from outer scope (props)

    // Effect to handle drawing on data/template/image change
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

        // Scale context down so drawing operations work on logical pixels (500x800)
        ctx.scale(DPI_SCALE, DPI_SCALE);

        // Clear the canvas before redrawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Pass latest fields and template values to the drawing function
        drawBiodata(ctx, fields, template);

    }, [fields, template, logo.object, photo.object, drawBiodata]); // useEffect must still depend on all data sources


    return (
        <div
            id="biodata-preview-container"
            className={`shadow-2xl rounded-2xl transition-all duration-300 border-4 border-gray-200 text-gray-800`}
            style={{ 
              width: `${CANVAS_WIDTH}px`,
              maxWidth: `${CANVAS_WIDTH}px`,
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
    const [step, setStep] = useState(1); // New step state for the wizard

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Navigation handlers
    const handleNext = () => setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

    // Function to pre-load an image from a URL or File object and store its object
    const loadImage = useCallback((src: string, setter: React.Dispatch<React.SetStateAction<ImageState>>) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setter({ url: src, object: img });
        img.onerror = () => setter({ url: src, object: null }); // Fallback on error
        img.src = src;
    }, []);

    // Load initial placeholder images on mount
    useEffect(() => {
        loadImage(PLACEHOLDER_LOGO_URL, setLogo);
        loadImage(PLACEHOLDER_PHOTO_URL, setPhoto);
        // Pre-load template images
        templates.forEach(t => {
            if (t.bgImageUrl) {
                new Image().src = t.bgImageUrl;
            }
        });
    }, [loadImage]);


    // Handle changes to a field value
    const handleFieldChange = (id: string, value: string) => {
        setFields(prevFields => 
            prevFields.map(field => 
                field.id === id ? { ...field, value } : field
            )
        );
    };

    // Handle moving a field up or down in the array (changes canvas position)
    const handleFieldMove = (id: string, direction: 'up' | 'down') => {
        setFields(prevFields => {
            const index = prevFields.findIndex(f => f.id === id);
            if (index === -1) return prevFields;

            const newIndex = index + (direction === 'up' ? -1 : 1);
            
            // Check boundaries
            if (newIndex < 0 || newIndex >= prevFields.length) return prevFields;

            const newFields = [...prevFields];
            // Swap the elements
            [newFields[index], newFields[newIndex]] = [newFields[index], newFields[index]];
            
            return newFields;
        });
    };

    // Handle adding a new custom field
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

    // Handle removing a custom field
    const removeCustomField = (id: string) => {
        setFields(prevFields => prevFields.filter(field => field.id !== id));
    };

    // Handle image upload for Logo or Photo
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'logo' | 'photo') => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);
            const setter = imageType === 'logo' ? setLogo : setPhoto;
            
            // Revoke previous URL if necessary
            const currentUrl = imageType === 'logo' ? logo.url : photo.url;
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }
            
            // Load the new image
            loadImage(tempUrl, setter);
        }
    };

    /**
     * Generates and downloads the biodata as a single-page PDF.
     */
    const generatePdf = useCallback(async () => {
        setIsGenerating(true);
        setGenerationStatus('loading');

        const canvas = canvasRef.current;
        
        // Check for jsPDF library presence
        if (!canvas || typeof window.jsPDF === 'undefined') {
          setGenerationStatus('error');
          console.error("PDF generation failed: Canvas element or jsPDF library (ensure script is loaded) not found.");
          setIsGenerating(false);
          // Show a user-friendly message about missing dependency
          return;
        }
        
        try {
            // Get the data URL from the canvas
            const imgData = canvas.toDataURL('image/png');

            // Initialize jsPDF in portrait, mm units, A4 format
            const pdf = new window.jsPDF('p', 'mm', 'a4'); 
            
            const pdfWidth = 210; // A4 width in mm
            
            // Calculate image height in mm based on canvas ratio (500x800 is 1:1.6)
            const pdfHeight = CANVAS_HEIGHT * pdfWidth / CANVAS_WIDTH;
            
            // Add the image to the PDF
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight); 

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
    }, [fields]);

    // --- Helper Components Definition (Moved inside Main component for state access) ---

    const FieldInput: React.FC<{ field: BiodataField, index: number, isLast: boolean }> = ({ field, index, isLast }) => (
        <div className="flex items-start space-x-2 p-2 border-b border-gray-100 hover:bg-gray-50 rounded-md transition duration-150">
            {/* Reorder Buttons */}
            <div className="flex flex-col space-y-1 mt-1">
                <button
                    type="button"
                    onClick={() => handleFieldMove(field.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-500 hover:text-violet-600 disabled:opacity-30 rounded transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/></svg>
                </button>
                <button
                    type="button"
                    onClick={() => handleFieldMove(field.id, 'down')}
                    disabled={isLast}
                    className="p-1 text-gray-500 hover:text-violet-600 disabled:opacity-30 rounded transition duration-150"
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/></svg>
                </button>
            </div>
            
            {/* Input fields */}
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

            {/* Remove Button for Custom Fields */}
            {field.type === 'custom' && (
                <button
                    type="button"
                    onClick={() => removeCustomField(field.id)}
                    className="p-1 mt-1 text-red-500 hover:text-red-700 rounded transition duration-150"
                    title="Remove Custom Field"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
                </button>
            )}
        </div>
    );

    // --- Image Upload Component ---

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

    // --- Step Rendering Functions ---

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
                                disabled={isGenerating}
                                className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-xl text-white transition-all duration-200 ${
                                isGenerating
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-500 focus:ring-offset-2'
                                }`}
                            >
                                {isGenerating && generationStatus === 'loading' ? (
                                <>
                                    <span className="animate-spin mr-2">⟳</span>
                                    Generating PDF...
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
                                    An error occurred during PDF generation. Ensure **jsPDF** is loaded correctly.
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
            <header className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center">
                    Wedding Biodata Wizard
                </h1>
                <p className="text-gray-500 mt-1">
                    Follow the steps to instantly generate your customizable, print-ready biodata.
                </p>
            </header>

            {/* Adjusted Grid: Now 4 columns, 2 for the wizard, 2 for the canvas preview */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12"> 
                
                {/* Left Column: Wizard Controls and Steps (Takes 50% on large screens) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg h-fit order-2 lg:order-1">
                    
                    {/* Step Indicator */}
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

                    {/* Navigation Buttons */}
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

                {/* Right Column: Sticky Canvas Live Preview (Fixed Aspect Ratio) (Takes 50% on large screens) */}
                <div className="lg:col-span-2 flex justify-center lg:justify-start items-start order-1 lg:order-2">
                    <div 
                        className="lg:sticky lg:top-8 w-full flex justify-center"
                        style={{ height: `${CANVAS_HEIGHT + 100}px` }} // Add height buffer for sticky positioning
                    >
                        <div className="bg-white p-4 rounded-xl shadow-2xl">
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 text-center">Live Preview</h3>
                            <BiodataPreview 
                                ref={canvasRef} 
                                fields={fields} 
                                template={selectedTemplate} 
                                logo={logo}
                                photo={photo}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiodataGenerator;
