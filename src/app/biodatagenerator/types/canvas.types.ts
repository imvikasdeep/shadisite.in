import { BiodataField, CanonicalGroupId } from './biodata.types';

export interface ImageState {
    url: string;
    border_radius: string;
    object: HTMLImageElement | null;
}

export interface PageInfo {
    fields: BiodataField[]; // Fields to be drawn on this specific page
    // Tracks the group ID of the last item on the *previous* page to prevent repeating headings
    prevPageEndGroup: CanonicalGroupId | null;
}
