'use client';
import React from 'react';
import { CustomizationSettings } from '../../types';
import BodyTextControls from '../customization/BodyTextControls';
import HeadingControls from '../customization/HeadingControls';

interface Step5CustomizationProps {
    customization: CustomizationSettings;
    onCustomizationChange: (key: keyof CustomizationSettings, value: string | number) => void;
}

const Step5Customization: React.FC<Step5CustomizationProps> = ({
    customization,
    onCustomizationChange,
}) => {
    return (
        <div className="space-y-6 p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Customization</h2>

            {/* Body Text Customization */}
            <BodyTextControls
                customization={customization}
                onChange={onCustomizationChange}
            />

            {/* Heading Customization */}
            <HeadingControls
                customization={customization}
                onChange={onCustomizationChange}
            />
        </div>
    );
};

export default Step5Customization;
