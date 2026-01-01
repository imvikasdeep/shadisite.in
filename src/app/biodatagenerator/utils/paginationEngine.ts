import { BiodataField, PageInfo } from '../types';
import { countWrappedTextLines } from './canvasLayout';
import { getCanonicalGroupId } from './groupMapping';
import {
    DPI_SCALE,
    FONT_SIZE,
    HEADING_FONT_SIZE,
    HEADING_LINE_GAP,
    LINE_HEIGHT,
    FIELD_GAP,
    VALUE_COL_WIDTH,
    CONTENT_START_Y,
    MAX_CONTENT_Y,
    PADDING
} from '../data/constants';

/**
 * Pre-calculates the field distribution across pages by simulating drawing height.
 * This is crucial for determining where page breaks occur and if a heading is needed.
 */
export const calculatePagination = (fields: BiodataField[]): PageInfo[] => {
    if (typeof document === 'undefined') return [];

    const pages: PageInfo[] = [];

    // Filter out fields with empty label OR empty value
    const contentFields = fields.filter(f =>
        f.label.trim() !== '' &&
        f.value &&
        f.value.trim() !== ''
    );

    if (contentFields.length === 0) {
        return []; // Nothing to paginate
    }

    let remainingFields = [...contentFields];

    const dummyCanvas = document.createElement('canvas');
    const ctx = dummyCanvas.getContext('2d');
    if (!ctx) return [];
    ctx.scale(DPI_SCALE, DPI_SCALE);
    ctx.font = `${FONT_SIZE}px Inter, sans-serif`;

    const calculateConsumption = (field: BiodataField, lastGroupId: import('../types').CanonicalGroupId | null): number => {
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

        // Only add a page if it actually has renderable fields
        if (pageFields.length > 0) {
            pages.push({ fields: pageFields, prevPageEndGroup });
            remainingFields = remainingFields.slice(pageFields.length);
        } else {
            break; // stop the loop — nothing more to paginate
        }
    }

    return pages;
};
