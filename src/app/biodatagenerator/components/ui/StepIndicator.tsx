'use client';
import React from 'react';
import { TOTAL_STEPS, STEP_LABELS, PRIMARY_TEXT_CLASS, PRIMARY_BG_CLASS } from '../../data/constants';

interface StepIndicatorProps {
    currentStep: number;
    highestStepVisited: number;
    onStepClick: (step: number) => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
    currentStep,
    highestStepVisited,
    onStepClick,
}) => {
    const primaryTextClass = PRIMARY_TEXT_CLASS;
    const primaryBgClass = PRIMARY_BG_CLASS;

    return (
        <div className="flex justify-between items-center mb-8 space-x-2">
            {[1, 2, 3, 4, 5].map((s) => {
                const isCompleted = s < currentStep;
                const isCurrent = s === currentStep;
                const isVisited = s <= highestStepVisited;

                return (
                    <React.Fragment key={s}>
                        <div className={`flex-1 flex flex-col items-center relative z-10 ${isCurrent ? primaryTextClass : 'text-gray-400'}`}>
                            <button
                                onClick={() => onStepClick(s)}
                                disabled={!isVisited || isCurrent}
                                className={`w-10 h-10 flex items-center justify-center rounded-full font-bold border-2 transition-all duration-300 ${isVisited ? `${primaryBgClass} border-fuchsia-600 text-white cursor-pointer` : 'bg-white border-gray-300'} ${isCurrent ? 'ring-4 ring-fuchsia-200' : 'hover:border-fuchsia-400 disabled:opacity-100 disabled:ring-0'}`}
                            >
                                {s}
                            </button>
                            <span className={`mt-2 text-sm font-semibold text-center ${isVisited ? 'text-fuchsia-700' : 'text-gray-500'}`}>
                                {STEP_LABELS[s - 1]}
                            </span>
                        </div>
                        {s < TOTAL_STEPS && (
                            <div className={`flex-auto border-t-4 h-0 transition-all duration-300 ${isCompleted ? 'border-fuchsia-400' : 'border-gray-200'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default StepIndicator;
