import { BiodataField, Template, ImageState, CustomizationSettings, CanonicalGroupId } from '../types';
import { wrapTextAndGetLastY } from './canvasLayout';
import { getCanonicalGroupId, GROUP_TITLES } from './groupMapping';
import {
    CANVAS_WIDTH,
    PADDING,
    FIELD_GAP,
    LINE_HEIGHT,
    VALUE_COL_OFFSET,
    VALUE_COL_WIDTH
} from '../data/constants';

/**
 * Draws the content of a single page using only the fields provided.
 */
export const drawContentForPage = (
    ctx: CanvasRenderingContext2D,
    pageFields: BiodataField[],
    template: Template,
    logo: string,
    dietyText: string,
    templateHeading: string,
    photo: ImageState,
    pageNumber: number = 1,
    prevPageEndGroup: CanonicalGroupId | null = null,
    customization: CustomizationSettings
) => {
    const width = CANVAS_WIDTH;
    let currentY: number;

    // --- Load Logo ---
    let logoImg: HTMLImageElement | null = null;
    if (logo) {
        logoImg = new Image();
        logoImg.src = logo;
    }

    if (pageNumber === 1) {
        const logoWidth = 80;
        const logoHeight = 80;
        const photoWidth = 110;
        const photoHeight = 140;
        const spacingFromTop = PADDING;
        const spacingBetweenHeaderItems = 10;

        const logoX = PADDING;
        const logoY = spacingFromTop;

        if (logoImg && logoImg.complete) {
            ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        } else if (logoImg) {
            logoImg.onload = () => ctx.drawImage(logoImg!, logoX, logoY, logoWidth, logoHeight);
        }

        // --- Draw Photo ---
        const photoX = width - PADDING - photoWidth;
        const photoY = spacingFromTop;

        if (photo.object) {
            const radius = Math.min(
                Math.max(parseInt(photo.border_radius || '0', 10), 0),
                Math.min(photoWidth, photoHeight) / 2
            );

            const drawRoundedRectPath = (
                ctx: CanvasRenderingContext2D,
                x: number,
                y: number,
                w: number,
                h: number,
                r: number
            ) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
            };

            ctx.save();
            drawRoundedRectPath(ctx, photoX, photoY, photoWidth, photoHeight, radius);
            ctx.clip();
            ctx.drawImage(photo.object, photoX, photoY, photoWidth, photoHeight);
            ctx.restore();
        }

        // --- Diety Text (Body Customization) ---
        ctx.font = `bold ${customization.bodyFontSize}px ${customization.bodyFontFamily}`;
        ctx.fillStyle = customization.bodyTextColor || template.primaryColor;
        const dietyTextY = logoY + logoHeight + spacingBetweenHeaderItems + 6;
        ctx.fillText(dietyText, logoX, dietyTextY);

        // --- Template Heading (Heading Customization) ---
        ctx.font = `bold 25px`;
        ctx.fillStyle = customization.headingTextColor || '#1f2937';
        const headingY = dietyTextY + customization.bodyFontSize + 20;
        ctx.fillText(templateHeading, logoX, headingY);

        currentY = headingY + customization.headingFontSize + 24;
    } else {
        currentY = PADDING + FIELD_GAP;
    }

    // === Draw Fields ===
    ctx.textAlign = 'left';
    const labelX = PADDING;
    const valueX = VALUE_COL_OFFSET;
    const valueWidth = VALUE_COL_WIDTH;

    let lastCanonicalGroupId: CanonicalGroupId | null =
        pageNumber === 1 ? ('none' as CanonicalGroupId) : prevPageEndGroup || ('none' as CanonicalGroupId);

    pageFields.forEach((field) => {
        const currentCanonicalGroupId = getCanonicalGroupId(field.groupId);

        if (!field.value || field.value.trim() === '') return;

        // === Section Heading ===
        if (currentCanonicalGroupId !== lastCanonicalGroupId && currentCanonicalGroupId !== 'other') {
            const headingText = GROUP_TITLES[currentCanonicalGroupId];
            if (headingText) {
                currentY += 20;
                ctx.font = `bold ${customization.headingFontSize}px ${customization.headingFontFamily}`;
                ctx.fillStyle = customization.headingTextColor || template.primaryColor;
                ctx.fillText(headingText, PADDING + 0.3, currentY + 0.3);
                ctx.fillText(headingText, PADDING, currentY);

                currentY += customization.headingFontSize + 16;
            }
            lastCanonicalGroupId = currentCanonicalGroupId;
        }

        // === Label ===
        ctx.font = `bold ${customization.bodyFontSize}px ${customization.bodyFontFamily}`;
        ctx.fillStyle = template.primaryColor;
        const labelMaxWidth = VALUE_COL_OFFSET - PADDING - 10;
        wrapTextAndGetLastY(ctx, field.label, labelX, currentY, labelMaxWidth, LINE_HEIGHT);

        // === Value ===
        ctx.font = `${customization.bodyFontSize}px ${customization.bodyFontFamily}`;
        ctx.fillStyle = customization.bodyTextColor || '#1f2937';
        const bottomY = wrapTextAndGetLastY(ctx, ': ' + field.value, valueX, currentY, valueWidth, LINE_HEIGHT);

        currentY = bottomY + FIELD_GAP;
    });
};
