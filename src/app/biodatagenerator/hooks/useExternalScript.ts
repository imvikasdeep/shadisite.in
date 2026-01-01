import { useState, useEffect } from 'react';

/**
 * Hook to load external JavaScript libraries dynamically
 * Polls for the global variable to ensure it's loaded
 */
export const useExternalScript = (url: string, globalVariableName: string) => {
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
