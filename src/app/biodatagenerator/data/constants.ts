// Canvas Dimensions & Configuration (A4 Proportions: 500x707 px)
export const CANVAS_WIDTH = 500;
// A4 aspect ratio is 1:1.414. 500 * 1.414 = 707 (approx)
export const CANVAS_HEIGHT = 707;
export const DPI_SCALE = 2; // High DPI for crisp canvas rendering
export const TOTAL_STEPS = 5;

// A4 Proportion-Matched Metrics: ADJUSTED FOR HIGH DENSITY VISUAL FIT
export const PADDING = 60;
export const FIELD_GAP = 8;
export const LINE_HEIGHT = 14;
export const FONT_SIZE = 10;

// Drawing configuration for headings
export const HEADING_FONT_SIZE = 14;
export const HEADING_LINE_GAP = 10; // Space above and below line

// Derived constants
// CONTENT_START_Y needs to accommodate space for the first heading on page 1
export const CONTENT_START_Y = PADDING + 175;
export const MAX_CONTENT_Y = CANVAS_HEIGHT - PADDING - 25;

// Drawing configuration for side-by-side layout
export const VALUE_COL_OFFSET = PADDING + 160;
export const VALUE_COL_WIDTH = CANVAS_WIDTH - VALUE_COL_OFFSET - PADDING;

// Theme constants
export const PRIMARY_TEXT_CLASS = "text-fuchsia-600";
export const PRIMARY_BG_CLASS = "bg-fuchsia-600";
export const PRIMARY_BG_HOVER_CLASS = "hover:bg-fuchsia-700";
export const PRIMARY_RING_CLASS = "ring-fuchsia-200";
export const PRIMARY_BORDER_CLASS = "border-fuchsia-600";

// Step labels
export const STEP_LABELS = ['Template', 'Personal Info', 'Family Info', 'Contact', 'Customisation'];
