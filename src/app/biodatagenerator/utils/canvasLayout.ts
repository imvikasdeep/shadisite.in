import { FONT_SIZE } from '../data/constants';

/**
 * Counts the number of lines a piece of text will wrap into, given a maxWidth.
 */
export const countWrappedTextLines = (
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): number => {
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
};

/**
 * Utility to wrap text on the canvas and track vertical position,
 * returning the final baseline Y coordinate of the last line drawn.
 */
export const wrapTextAndGetLastY = (
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
