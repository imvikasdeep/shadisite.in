// External Library Type Definitions (for PDF download)
export interface JsPDFInstance {
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

export {};
