import { useState, useCallback, useEffect } from 'react';
import { BiodataField, Template, ImageState, CustomizationSettings } from '../types';
import { initialFields } from '../data/initialFields';
import { templates } from '../data/templates';
import { deityLogos } from '../data/deityLogos';

/**
 * Centralized state management hook for the biodata generator
 */
export const useBiodataState = () => {
    const [templatePage, setTemplatePage] = useState(0);
    const [fields, setFields] = useState<BiodataField[]>(initialFields);
    const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
    const [selectedLogo, setLogo] = useState<string>(deityLogos[0]);
    const [dietyText, setDietyText] = useState<string>('');
    const [templateHeading, setTemplateHeading] = useState<string>('');
    const [photo, setPhoto] = useState<ImageState>({ url: '', border_radius: '', object: null });
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [generationStatus, setGenerationStatus] = useState<'success' | 'error' | 'loading' | null>(null);
    const [step, setStep] = useState(1);
    const [highestStepVisited, setHighestStepVisited] = useState(1);
    const [customization, setCustomization] = useState<CustomizationSettings>({
        bodyFontFamily: 'Arial',
        bodyTextColor: '#000000',
        bodyFontSize: 14,
        bodyFontWeight: 400,

        headingFontFamily: 'Arial',
        headingTextColor: '#000000',
        headingFontSize: 18,
        headingFontWeight: 700,
    });

    const handleCustomizationChange = useCallback(
        (field: keyof typeof customization, value: string | number) => {
            setCustomization(prev => ({
                ...prev,
                [field]: value,
            }));
        },
        []
    );

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

    // Update highest visited step whenever 'step' changes
    useEffect(() => {
        setHighestStepVisited(prev => Math.max(prev, step));
    }, [step]);

    return {
        templatePage,
        setTemplatePage,
        fields,
        setFields,
        selectedTemplate,
        setSelectedTemplate,
        selectedLogo,
        setLogo,
        dietyText,
        setDietyText,
        templateHeading,
        setTemplateHeading,
        photo,
        setPhoto,
        isGenerating,
        setIsGenerating,
        generationStatus,
        setGenerationStatus,
        step,
        setStep,
        highestStepVisited,
        setHighestStepVisited,
        customization,
        setCustomization,
        handleCustomizationChange,
        handleTemplateMetaChange
    };
};
