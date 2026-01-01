'use client';
import React from 'react';
import { BiodataField, ComplexField } from '../../types';

interface FieldInputProps {
    field: BiodataField;
    index: number;
    isLast: boolean;
    onFieldChange: (id: string, value: string) => void;
    onLabelChange: (id: string, newLabel: string) => void;
    onFieldMove: (id: string, direction: 'up' | 'down') => void;
    onRemoveCustomField: (id: string) => void;
    fieldGroupIds: string[];
    inputMeta?: ComplexField;
}

const FieldInput: React.FC<FieldInputProps> = React.memo(({
    field,
    onFieldChange,
    onLabelChange,
    onFieldMove,
    fieldGroupIds
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        onFieldChange(field.id, e.target.value);
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onLabelChange(field.id, e.target.value);
    };

    const isCustomField = field.id.startsWith('custom-');
    const currentGroupIndex = fieldGroupIds.findIndex(id => id === field.id);
    const isFirstInGroup = currentGroupIndex === 0;
    const isLastInGroup = currentGroupIndex === fieldGroupIds.length - 1;

    return (
        <div className="flex items-start space-x-3 p-3 border-b-2 border-fuchsia-50 hover:bg-fuchsia-50 rounded-lg transition duration-200">
            {/* Move Buttons */}
            <div className="flex flex-col space-y-1 mt-1 flex-shrink-0">
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'up')}
                    disabled={isFirstInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Up"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => onFieldMove(field.id, 'down')}
                    disabled={isLastInGroup}
                    className="p-1 text-pink-500 hover:text-pink-600 disabled:opacity-30 rounded-full transition duration-150"
                    title="Move Down"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z" />
                    </svg>
                </button>
            </div>

            {/* Field Inputs */}
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:space-x-4">
                {/* Label */}
                <div className="w-full md:w-2/5 mb-2 md:mb-0">
                    <input
                        type="text"
                        value={field.label}
                        onChange={handleLabelChange}
                        className={`w-full text-sm font-semibold p-2 border rounded-lg shadow-sm transition duration-150 ${isCustomField
                            ? 'border-gray-300 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500'
                            : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                        placeholder="Field Label"
                        readOnly={!isCustomField}
                        disabled={!isCustomField}
                    />
                </div>

                {/* Value */}
                <div className="w-full md:w-3/5">

                    {field.inputType === 'textarea' && (
                        <textarea
                            value={field.value}
                            onChange={handleChange}
                            rows={field.value.length > 50 ? 3 : 1}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg resize-y focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                            placeholder={`Enter ${field.label}...`}
                        />
                    )}

                    {['text', 'date', 'time'].includes(field.inputType) && (
                        <input
                            type={field.inputType}
                            value={field.value}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                            placeholder={`Enter ${field.label}...`}
                        />
                    )}

                    {field.inputType === 'select' && field.options && (
                        <select
                            value={field.value}
                            onChange={handleChange}
                            className="w-full text-sm p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition duration-150 shadow-sm"
                        >
                            <option value="">Select {field.label}</option>
                            {field.options.map((opt, idx) => (
                                <option key={idx} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}

                    {field.inputType === 'radio' && field.options && (
                        <div className="flex flex-wrap gap-4">
                            {field.options.map((opt, idx) => (
                                <label key={idx} className="flex items-center gap-1 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name={field.id}
                                        value={opt}
                                        checked={field.value === opt}
                                        onChange={handleChange}
                                        className="accent-fuchsia-500"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
});

FieldInput.displayName = 'FieldInput';

export default FieldInput;
