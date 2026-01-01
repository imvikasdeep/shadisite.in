'use client';
import React from 'react';
import { BiodataField, ImageState } from '../../types';
import ImageUpload from './ImageUpload';
import FieldInput from './FieldInput';

interface Step3FamilyInfoProps {
    fields: BiodataField[];
    photo: ImageState;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    onFieldChange: (id: string, value: string) => void;
    onLabelChange: (id: string, newLabel: string) => void;
    onFieldMove: (id: string, direction: 'up' | 'down') => void;
    onRemoveCustomField: (id: string) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'photo') => void;
    onPhotoBorderRadiusChange: (value: string) => void;
    onAddCustomFieldBelow: (group: 'personal' | 'family' | 'custom', afterFieldId: string) => void;
    fieldGroupIds: string[];
}

const Step3FamilyInfo: React.FC<Step3FamilyInfoProps> = ({
    fields,
    photo,
    scrollRef,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    onRemoveCustomField,
    onImageUpload,
    onPhotoBorderRadiusChange,
    onAddCustomFieldBelow,
    fieldGroupIds,
}) => {
    return (
        <>
            <h2 className="text-2xl font-bold mb-4 text-black">
                Step 3: Edit Family Info
            </h2>
            <p className="text-gray-600 mb-6">
                Enter family details and click + beside a field to add a new one below.
            </p>

            <div className="flex flex-col md:flex-row items-start gap-6 p-4 border-b-2 border-fuchsia-50 hover:bg-fuchsia-50 rounded-xl transition duration-200">
                {/* Upload Photo */}
                <div className="w-full md:w-2/5 mb-2 md:mb-0">
                    <label className="block font-medium text-gray-700 mb-2">
                        Upload Photo
                    </label>
                    <div className="w-full">
                        <ImageUpload
                            label=""
                            imageType="photo"
                            onUpload={onImageUpload}
                            currentUrl={photo.url}
                        />
                    </div>
                </div>

                {/* Border Radius Input */}
                <div className="w-full md:w-3/5">
                    <label className="block font-medium text-gray-700 mb-2">
                        Photo Curve
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="50"
                        value={photo.border_radius || 0}
                        onChange={(e) => onPhotoBorderRadiusChange(e.target.value)}
                        placeholder="e.g. 10 for rounded corners"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Enter a value between 0–50 (0 = square, 50 = circle).
                    </p>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="space-y-2 max-h-[500px] overflow-y-auto pr-2"
            >
                {fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="relative group flex items-center gap-2"
                    >
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

                        {/* Right-side action buttons */}
                        <div className="flex flex-col items-center gap-2">
                            {/* Add Field Button */}
                            <button
                                type="button"
                                onClick={() => onAddCustomFieldBelow('family', field.id)}
                                className="cursor-pointer transition-all duration-150 text-fuchsia-600 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
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

                            {/* Delete button - only for custom fields */}
                            {field.id.startsWith('custom-') && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveCustomField(field.id)}
                                    className="cursor-pointer transition-all duration-150 text-red-500 hover:bg-red-500 hover:text-white border border-red-300 w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
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
        </>
    );
};

export default Step3FamilyInfo;
