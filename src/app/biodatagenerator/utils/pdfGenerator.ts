import { BiodataField, Template, ImageState, CustomizationSettings, PageInfo } from '../types';
import { drawContentForPage } from './canvasDrawing';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DPI_SCALE } from '../data/constants';

export const generatePdf = async (
    fields: BiodataField[],
    selectedTemplate: Template,
    selectedLogo: string,
    dietyText: string,
    templateHeading: string,
    photo: ImageState,
    pageContentMap: PageInfo[],
    customization: CustomizationSettings
): Promise<{ success: boolean; error?: string }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsPDFConstructor = (window as any).jspdf ? (window as any).jspdf.jsPDF : (window as any).jsPDF;

    if (typeof jsPDFConstructor === 'undefined' || typeof window.html2canvas === 'undefined') {
        console.error("PDF generation failed: jsPDF or html2canvas library not found.");
        return { success: false, error: "PDF libraries not loaded" };
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bgImage = new (window as any).Image();
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
                pageInfo.prevPageEndGroup,
                customization
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

        return { success: true };
    } catch (error) {
        console.error('Error generating PDF:', error);
        return { success: false, error: String(error) };
    }
};
