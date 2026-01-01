'use client';
import React from 'react';
import { TOTAL_STEPS, PRIMARY_BG_CLASS, PRIMARY_BG_HOVER_CLASS } from '../../data/constants';

interface NavigationButtonsProps {
    currentStep: number;
    onPrev: () => void;
    onNext: () => void;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
    currentStep,
    onPrev,
    onNext,
}) => {
    const primaryBgClass = PRIMARY_BG_CLASS;
    const primaryBgHoverClass = PRIMARY_BG_HOVER_CLASS;

    return (
        <div className="sticky bottom-0 bg-white flex justify-between mt-8 py-6 border-t border-gray-200 z-20">
            <button
                onClick={onPrev}
                disabled={currentStep === 1}
                className="px-10 py-3 md:px-12 md:py-4 border border-gray-300 rounded-full text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition duration-150 cursor-pointer shadow-sm"
            >
                Back
            </button>
            {currentStep < TOTAL_STEPS ? (
                <button
                    onClick={onNext}
                    className={`px-10 py-3 md:px-12 md:py-4 border border-transparent rounded-full text-base font-semibold text-white ${primaryBgClass} ${primaryBgHoverClass} transition duration-150 cursor-pointer shadow-lg`}
                >
                    Continue
                </button>
            ) : (
                <div className="text-sm text-gray-500 flex items-center font-semibold">
                    Final Step: Download
                </div>
            )}
        </div>
    );
};

export default NavigationButtons;
