'use client';
import React from 'react';
import { BiodataField, Template, CustomizationSettings } from '../../types';
import FieldInput from './FieldInput';

interface Step4ContactProps {
    fields: BiodataField[];
    scrollRef: React.RefObject<HTMLDivElement | null>;
    isGenerating: boolean;
    isLibrariesLoaded: boolean;
    generationStatus: 'loading' | 'success' | 'error' | null;
    onFieldChange: (id: string, value: string) => void;
    onLabelChange: (id: string, newLabel: string) => void;
    onFieldMove: (id: string, direction: 'up' | 'down') => void;
    onRemoveCustomField: (id: string) => void;
    onAddCustomFieldBelow: (group: 'personal' | 'family' | 'custom', afterFieldId: string) => void;
    onGeneratePdf: () => void;
    onShowData: () => void;
    fieldGroupIds: string[];
}

const Step4Contact: React.FC<Step4ContactProps> = ({
    fields,
    scrollRef,
    isGenerating,
    isLibrariesLoaded,
    generationStatus,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    onRemoveCustomField,
    onAddCustomFieldBelow,
    onGeneratePdf,
    onShowData,
    fieldGroupIds,
}) => {
    return (
        <>
            <h2 className="text-2xl font-bold mb-4 text-black">
                Step 4: Contact & Download
            </h2>
            <p className="text-gray-600 mb-6">
                Enter contact details and click + beside a field to add
                a new one below. Use the button below to download your
                biodata PDF.
            </p>

            <div
                ref={scrollRef}
                className="space-y-2 max-h-[350px] overflow-y-auto pr-2"
            >
                {fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="relative group flex items-center gap-2"
                    >
                        {/* Field input */}
                        <div className="flex-1">
                            <FieldInput
                                field={field}
                                index={index}
                                isLast={index === fields.length - 1}
                                onFieldChange={onFieldChange}
                                onLabelChange={onLabelChange}
                                onFieldMove={onFieldMove}
                                onRemoveCustomField={onRemoveCustomField}
                                fieldGroupIds={fieldGroupIds}
                            />
                        </div>

                        {/* Right-side buttons */}
                        <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {/* Add Button */}
                            <button
                                type="button"
                                onClick={() => onAddCustomFieldBelow('custom', field.id)}
                                className="text-fuchsia-600 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                title="Add custom field below"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>

                            {/* Delete Button - only for custom fields */}
                            {field.id.startsWith('custom-') && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveCustomField(field.id)}
                                    className="text-red-500 hover:bg-red-500 hover:text-white border border-red-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                                    title="Delete custom field"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Download Section */}
            <div className="mt-8 pt-4 border-t border-gray-200">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Download</h3>
                <button
                    type="button"
                    onClick={onShowData}
                    className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition duration-200"
                >
                    Show Data in Console
                </button>
                <button
                    onClick={onGeneratePdf}
                    disabled={isGenerating || !isLibrariesLoaded}
                    className={`w-full flex items-center justify-center px-10 py-4 border border-transparent text-base font-medium rounded-xl shadow-xl text-white transition-all duration-200 cursor-pointer ${!isLibrariesLoaded || isGenerating
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-fuchsia-600 hover:bg-fuchsia-700 focus:ring-4 focus:ring-fuchsia-500 focus:ring-offset-2'
                        }`}
                >
                    {!isLibrariesLoaded ? (
                        <>
                            <span className="animate-pulse mr-2">⏳</span>
                            Loading PDF Libraries...
                        </>
                    ) : isGenerating && generationStatus === 'loading' ? (
                        <>
                            <span className="animate-spin mr-2">⟳</span>
                            Generating Multi-Page PDF...
                        </>
                    ) : generationStatus === 'success' ? (
                        <>
                            <span className="mr-2">✓</span>
                            Download Complete!
                        </>
                    ) : (
                        'Download Final Biodata PDF (A4)'
                    )}
                </button>

                {generationStatus === 'error' && (
                    <p className="mt-2 text-sm text-red-600 text-center">
                        An error occurred during PDF generation. Please ensure your network is stable.
                    </p>
                )}
            </div>
        </>
    );
};

export default Step4Contact;
