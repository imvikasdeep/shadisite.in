'use client';

import React, { useRef, useEffect, useCallback, Suspense, lazy, useState } from 'react';

// Import hooks
import { useBiodataState } from './hooks/useBiodataState';
import { usePagination } from './hooks/usePagination';
import { useFieldHandlers } from './hooks/useFieldHandlers';
import { useExternalScript } from './hooks/useExternalScript';
import { useImageLoader } from './hooks/useImageLoader';

// Import constants
import { CANVAS_HEIGHT, TOTAL_STEPS, STEP_LABELS } from './data/constants';

// Import types
import { BiodataField, Template, CustomizationSettings, ImageState } from './types';

// Import data
import { templates } from './data/templates';

// Lazy load step components
const Step1Template = lazy(() => import('./components/wizard/Step1Template'));
const Step2PersonalInfo = lazy(() => import('./components/wizard/Step2PersonalInfo'));
const Step3FamilyInfo = lazy(() => import('./components/wizard/Step3FamilyInfo'));
const Step4Contact = lazy(() => import('./components/wizard/Step4Contact'));
const Step5Customization = lazy(() => import('./components/wizard/Step5Customization'));

// Import UI components directly (not lazy)
import BiodataPreview from './components/BiodataPreview';
import StepIndicator from './components/ui/StepIndicator';
import NavigationButtons from './components/ui/NavigationButtons';
import PageNavigation from './components/ui/PageNavigation';

// Import utilities
import { generatePdf } from './utils/pdfGenerator';

const BiodataGenerator: React.FC = () => {
    // Custom hooks
    const {
        templatePage,
        setTemplatePage,
        fields,
        setFields,
        selectedTemplate,
        setSelectedTemplate,
        selectedLogo,
        setLogo,
        dietyText,
        templateHeading,
        photo,
        setPhoto,
        isGenerating,
        setIsGenerating,
        generationStatus,
        setGenerationStatus,
        step,
        setStep,
        highestStepVisited,
        customization,
        handleCustomizationChange,
        handleTemplateMetaChange
    } = useBiodataState();

    const {
        pageContentMap,
        currentPageIndex,
        setCurrentPageIndex,
        totalPages,
        currentPageData
    } = usePagination(fields);

    const {
        getCurrentStepFieldIds,
        handleFieldChange,
        handleLabelChange,
        handleFieldMove,
        removeCustomField
    } = useFieldHandlers(fields, setFields, step);

    const { loadImage } = useImageLoader();

    // External script loading
    const isJsPdfLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        'jspdf'
    );
    const isHtml2CanvasLoaded = useExternalScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        'html2canvas'
    );
    const isLibrariesLoaded = isJsPdfLoaded && isHtml2CanvasLoaded;

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);

    // Extract the page data and the previous group ID for drawing logic
    const prevGroup = currentPageData.prevPageEndGroup;

    // Load initial placeholder images on mount
    useEffect(() => {
        loadImage('', setPhoto);
        templates.forEach(t => {
            if (t.bgImageUrl) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                new (window as any).Image().src = t.bgImageUrl;
            }
        });
    }, [loadImage, setPhoto]);

    // Effect to scroll the field list when a new custom field is added
    useEffect(() => {
        if (lastAddedFieldId && scrollRef.current) {
            const scrollToBottom = () => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    setLastAddedFieldId(null);
                }
            };

            setTimeout(scrollToBottom, 0);
        }
    }, [lastAddedFieldId]);

    // Navigation handlers
    const handleNext = () => setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

    const handleStepClick = (s: number) => {
        if (s <= highestStepVisited) {
            setStep(s);
        }
    };

    // Helper: Add custom field below a specific field
    const addCustomFieldBelow = useCallback(
        (
            groupType: 'personal' | 'family' | 'custom',
            afterFieldId: string
        ) => {
            setFields(prevFields => {
                const index = prevFields.findIndex(f => f.id === afterFieldId);
                if (index === -1) return prevFields;

                const afterField = prevFields[index];

                const newField: BiodataField = {
                    id: `custom-${Date.now()}`,
                    label: 'New Custom Field',
                    value: '',
                    type: 'custom',
                    groupId: groupType === 'custom' ? 'custom' : afterField.groupId,
                    inputType: 'text',
                    options: [],
                };

                const updatedFields = [...prevFields];
                updatedFields.splice(index + 1, 0, newField);
                setLastAddedFieldId(newField.id);
                return updatedFields;
            });
        },
        [setFields]
    );

    // Handle image upload
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const tempUrl = URL.createObjectURL(file);

            const currentUrl = photo.url;
            if (currentUrl && currentUrl.startsWith('blob:')) {
                URL.revokeObjectURL(currentUrl);
            }

            loadImage(tempUrl, setPhoto);
        }
    };

    // Generate PDF handler
    const handleGeneratePdf = useCallback(async () => {
        setGenerationStatus('loading');
        setIsGenerating(true);

        const result = await generatePdf(
            fields,
            selectedTemplate,
            selectedLogo,
            dietyText,
            templateHeading,
            photo,
            pageContentMap,
            customization
        );

        if (result.success) {
            setGenerationStatus('success');
        } else {
            setGenerationStatus('error');
        }

        setTimeout(() => setGenerationStatus(null), 3000);
        setIsGenerating(false);
    }, [
        fields,
        selectedTemplate,
        selectedLogo,
        dietyText,
        templateHeading,
        photo,
        pageContentMap,
        customization,
        setIsGenerating,
        setGenerationStatus
    ]);

    // Show data in console handler
    const handleShowData = useCallback((): void => {
        interface BiodataForm {
            fields: {
                label: string;
                value: string;
                type: 'mandatory' | 'custom';
                groupId: string;
            }[];
            photo: {
                url: string;
                border_radius: string;
            };
            selectedTemplate: {
                id: string;
                bgImageUrl: string;
                primaryColor: string;
            };
            selectedLogo: string;
            dietyText: string;
            templateHeading: string;
            timestamp: string;
            CustomizationSettings: CustomizationSettings;
        }

        const biodataForm: BiodataForm = {
            fields: fields.map(f => ({
                label: f.label,
                value: f.value,
                type: f.type,
                groupId: f.groupId,
            })),
            photo: {
                url: photo?.url || '',
                border_radius: photo?.border_radius?.toString() || '0',
            },
            selectedTemplate: {
                id: selectedTemplate.id,
                bgImageUrl: selectedTemplate.bgImageUrl,
                primaryColor: selectedTemplate.primaryColor,
            },
            selectedLogo: selectedLogo || '',
            dietyText: dietyText || '',
            templateHeading: templateHeading || '',
            timestamp: new Date().toISOString(),
            CustomizationSettings: {
                bodyFontFamily: customization.bodyFontFamily,
                bodyTextColor: customization.bodyTextColor,
                bodyFontSize: customization.bodyFontSize,
                bodyFontWeight: customization.bodyFontWeight,
                headingFontFamily: customization.headingFontFamily,
                headingTextColor: customization.headingTextColor,
                headingFontSize: customization.headingFontSize,
                headingFontWeight: customization.headingFontWeight,
            },
        };

        console.log('🧾 Biodata Form:', biodataForm);
    }, [fields, photo, selectedTemplate, selectedLogo, dietyText, templateHeading, customization]);

    // Render step content
    const renderStepContent = () => {
        const groupIds = getCurrentStepFieldIds(step);
        const filteredFields = fields.filter(f => groupIds.includes(f.id));

        switch (step) {
            case 1:
                return (
                    <Suspense fallback={<div className="text-center py-8">Loading template step...</div>}>
                        <Step1Template
                            selectedTemplate={selectedTemplate}
                            selectedLogo={selectedLogo}
                            dietyText={dietyText}
                            templateHeading={templateHeading}
                            templatePage={templatePage}
                            onTemplateSelect={setSelectedTemplate}
                            onLogoSelect={setLogo}
                            onDietyTextChange={(text) => handleTemplateMetaChange('dietyText', text)}
                            onTemplateHeadingChange={(heading) => handleTemplateMetaChange('templateHeading', heading)}
                            onTemplatePageChange={setTemplatePage}
                        />
                    </Suspense>
                );
            case 2:
                return (
                    <Suspense fallback={<div className="text-center py-8">Loading personal info step...</div>}>
                        <Step2PersonalInfo
                            fields={filteredFields}
                            photo={photo}
                            scrollRef={scrollRef}
                            onFieldChange={handleFieldChange}
                            onLabelChange={handleLabelChange}
                            onFieldMove={handleFieldMove}
                            onRemoveCustomField={removeCustomField}
                            onAddCustomFieldBelow={addCustomFieldBelow}
                            onImageUpload={handleImageUpload}
                            onPhotoBorderRadiusChange={(value) =>
                                setPhoto((prev) => ({
                                    ...prev,
                                    border_radius: value,
                                }))
                            }
                            fieldGroupIds={groupIds}
                        />
                    </Suspense>
                );
            case 3:
                return (
                    <Suspense fallback={<div className="text-center py-8">Loading family info step...</div>}>
                        <Step3FamilyInfo
                            fields={filteredFields}
                            photo={photo}
                            scrollRef={scrollRef}
                            onFieldChange={handleFieldChange}
                            onLabelChange={handleLabelChange}
                            onFieldMove={handleFieldMove}
                            onRemoveCustomField={removeCustomField}
                            onImageUpload={(e) => handleImageUpload(e)}
                            onPhotoBorderRadiusChange={(value) => setPhoto(prev => ({ ...prev, border_radius: value }))}
                            onAddCustomFieldBelow={addCustomFieldBelow}
                            fieldGroupIds={groupIds}
                        />
                    </Suspense>
                );
            case 4:
                return (
                    <Suspense fallback={<div className="text-center py-8">Loading contact step...</div>}>
                        <Step4Contact
                            fields={filteredFields}
                            scrollRef={scrollRef}
                            isGenerating={isGenerating}
                            isLibrariesLoaded={isLibrariesLoaded}
                            generationStatus={generationStatus}
                            onFieldChange={handleFieldChange}
                            onLabelChange={handleLabelChange}
                            onFieldMove={handleFieldMove}
                            onRemoveCustomField={removeCustomField}
                            onAddCustomFieldBelow={addCustomFieldBelow}
                            onGeneratePdf={handleGeneratePdf}
                            onShowData={handleShowData}
                            fieldGroupIds={groupIds}
                        />
                    </Suspense>
                );
            case 5:
                return (
                    <Suspense fallback={<div className="text-center py-8">Loading customization step...</div>}>
                        <Step5Customization
                            customization={customization}
                            onCustomizationChange={handleCustomizationChange}
                        />
                    </Suspense>
                );
            default:
                return <p className="text-gray-500">Select a step to begin.</p>;
        }
    };

    // Main Render
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-inter">
            <div className="max-w-8xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-7 bg-white rounded-xl">

                {/* Left Column: Wizard Controls and Steps (60%) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl h-fit order-2 lg:order-1">
                    <StepIndicator
                        currentStep={step}
                        highestStepVisited={highestStepVisited}
                        onStepClick={handleStepClick}
                    />

                    {/* Step Content */}
                    <div className="min-h-[400px]">
                        {renderStepContent()}
                    </div>

                    {/* Navigation Buttons */}
                    <NavigationButtons
                        currentStep={step}
                        onPrev={handlePrev}
                        onNext={handleNext}
                    />
                </div>

                {/* Right Column: Sticky Canvas Live Preview (40%) */}
                <div className="lg:col-span-2 flex justify-center lg:justify-start items-start order-1 lg:order-2">
                    <div
                        className="lg:sticky lg:top-8 w-full flex justify-center"
                        style={{ height: `${CANVAS_HEIGHT + 100}px` }}
                    >
                        <div className="bg-white py-4 rounded-2xl">
                            <h3 className="text-xl font-semibold text-gray-800 text-center mb-3">
                                Live Preview
                            </h3>

                            {/* Page Counter and Navigation */}
                            {totalPages > 1 && (
                                <PageNavigation
                                    currentPageIndex={currentPageIndex}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPageIndex}
                                />
                            )}

                            <BiodataPreview
                                ref={currentPageIndex === 0 ? canvasRef : undefined}
                                pageContent={currentPageData}
                                template={selectedTemplate}
                                logo={selectedLogo}
                                dietyText={dietyText}
                                templateHeading={templateHeading}
                                photo={photo}
                                pageNumber={currentPageIndex + 1}
                                prevPageEndGroup={prevGroup}
                                customization={customization}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiodataGenerator;
