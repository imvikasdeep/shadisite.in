'use client';
import React from 'react';
import { CustomizationSettings } from '../../types';
import BodyTextControls from './BodyTextControls';
import HeadingControls from './HeadingControls';

interface CustomizationPanelProps {
    customization: CustomizationSettings;
    onChange: (key: keyof CustomizationSettings, value: string | number) => void;
}

const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
    customization,
    onChange,
}) => {
    return (
        <div className="space-y-6">
            {/* Body Text Customization */}
            <BodyTextControls
                customization={customization}
                onChange={onChange}
            />

            {/* Heading Customization */}
            <HeadingControls
                customization={customization}
                onChange={onChange}
            />
        </div>
    );
};

export default CustomizationPanel;
