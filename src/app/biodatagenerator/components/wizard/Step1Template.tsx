'use client';
import React from 'react';
import { Template } from '../../types';
import { templates } from '../../data/templates';
import { deityLogos } from '../../data/deityLogos';
import { PRIMARY_BG_CLASS, PRIMARY_BORDER_CLASS, PRIMARY_RING_CLASS } from '../../data/constants';

interface Step1TemplateProps {
    selectedTemplate: Template;
    selectedLogo: string;
    dietyText: string;
    templateHeading: string;
    templatePage: number;
    onTemplateSelect: (template: Template) => void;
    onLogoSelect: (logo: string) => void;
    onDietyTextChange: (text: string) => void;
    onTemplateHeadingChange: (heading: string) => void;
    onTemplatePageChange: (page: number) => void;
}

const Step1Template: React.FC<Step1TemplateProps> = ({
    selectedTemplate,
    selectedLogo,
    dietyText,
    templateHeading,
    templatePage,
    onTemplateSelect,
    onLogoSelect,
    onDietyTextChange,
    onTemplateHeadingChange,
    onTemplatePageChange,
}) => {
    const TEMPLATES_PER_PAGE = 10;
    const totalTemplatePages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);
    const paginatedTemplates = templates.slice(
        templatePage * TEMPLATES_PER_PAGE,
        (templatePage + 1) * TEMPLATES_PER_PAGE
    );

    const primaryBorderClass = PRIMARY_BORDER_CLASS;
    const primaryBgClass = PRIMARY_BG_CLASS;
    const primaryRingClass = PRIMARY_RING_CLASS;

    return (
        <>
            <h2 className="text-2xl font-bold mb-4 text-black">
                Step 1: Template & Photo Setup
            </h2>
            <p className="text-gray-600 mb-6">
                Select a visual theme and provide your photos.
            </p>

            {/* Template Grid */}
            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                    Select Template
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {paginatedTemplates.map((template, index) => (
                        <div
                            key={`${template.id}-${index}`}
                            onClick={() => onTemplateSelect(template)}
                            className={`p-1 border-2 rounded-lg cursor-pointer transition duration-200 shadow-md ${selectedTemplate.id === template.id
                                ? `${primaryBorderClass} ring-4 ${primaryRingClass}`
                                : 'border-gray-200 hover:border-fuchsia-400'
                                }`}
                        >
                            <img
                                src={template.bgImageUrl}
                                alt={template.name}
                                className="w-full h-auto rounded-sm object-cover"
                            />
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalTemplatePages > 1 && (
                    <div className="flex items-center justify-end gap-4 mt-3">
                        {/* Prev */}
                        <button
                            onClick={() =>
                                onTemplatePageChange(Math.max(0, templatePage - 1))
                            }
                            disabled={templatePage === 0}
                            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 cursor-pointer ${templatePage === 0
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-gray-100 active:scale-95'
                                }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        {/* Indicator */}
                        <span className="font-medium text-gray-600 select-none text-sm">
                            Page {templatePage + 1} / {totalTemplatePages}
                        </span>

                        {/* Next */}
                        <button
                            onClick={() =>
                                onTemplatePageChange(
                                    Math.min(totalTemplatePages - 1, templatePage + 1)
                                )
                            }
                            disabled={
                                templatePage === totalTemplatePages - 1
                            }
                            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 cursor-pointer ${templatePage === totalTemplatePages - 1
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-gray-100 active:scale-95'
                                }`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                    Select Diety Logo <span className='text-xs'>(Click to select/deslect)</span>
                </h3>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-9 gap-4">
                    {deityLogos.map((logo, index) => (
                        <div
                            key={`${logo}-${index}`}
                            onClick={() =>
                                onLogoSelect(selectedLogo === logo ? '' : logo)
                            }
                            className={`p-1 w-[80px] h-[80px] border-2 rounded-lg cursor-pointer transition duration-200 shadow-md ${selectedLogo === logo
                                ? `${primaryBorderClass} ${primaryBgClass} ring-4 ${primaryRingClass}`
                                : 'border-gray-200 hover:border-fuchsia-400'
                                }`}
                        >
                            <img
                                src={logo}
                                alt="logo"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    ))}
                </div>

                {/* Diety Text and Template Heading Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12">
                    <div>
                        <label className="block font-medium text-gray-700 mb-3">
                            Diety Text
                        </label>
                        <input
                            type="text"
                            value={dietyText}
                            onChange={(e) => onDietyTextChange(e.target.value)}
                            placeholder="Enter diety name or text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-3">
                            Template Heading
                        </label>
                        <input
                            type="text"
                            value={templateHeading}
                            onChange={(e) => onTemplateHeadingChange(e.target.value)}
                            placeholder="Enter heading for the template"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Step1Template;
