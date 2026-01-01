'use client';
import React from 'react';
import { CustomizationSettings } from '../../types';

interface BodyTextControlsProps {
    customization: CustomizationSettings;
    onChange: (key: keyof CustomizationSettings, value: string | number) => void;
}

const BodyTextControls: React.FC<BodyTextControlsProps> = ({ customization, onChange }) => {
    return (
        <div className="p-6 bg-white border border-fuchsia-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black tracking-tight">
                    Body Text
                </h3>
                <span className="text-sm text-gray-400 italic">Customize your text style</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Font Family */}
                <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Font Family
                    </label>
                    <select
                        value={customization.bodyFontFamily}
                        onChange={e => onChange('bodyFontFamily', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 focus:outline-none bg-gray-50 hover:bg-white transition"
                    >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                    </select>
                </div>

                {/* Text Color */}
                <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Text Color
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={customization.bodyTextColor}
                            onChange={e => onChange('bodyTextColor', e.target.value)}
                            className="h-10 w-16 border border-gray-200 rounded-lg cursor-pointer bg-white"
                        />
                        <span className="text-sm text-gray-500">{customization.bodyTextColor}</span>
                    </div>
                </div>

                {/* Font Size */}
                <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Font Size <span className="text-gray-400">(px)</span>
                    </label>
                    <input
                        type="number"
                        min={8}
                        max={72}
                        value={customization.bodyFontSize}
                        onChange={e => onChange('bodyFontSize', parseInt(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 focus:outline-none bg-gray-50 hover:bg-white transition"
                    />
                </div>

                {/* Font Weight */}
                <div className="flex flex-col">
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                        Font Weight
                    </label>
                    <select
                        value={customization.bodyFontWeight}
                        onChange={e => onChange('bodyFontWeight', parseInt(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-fuchsia-400 focus:border-fuchsia-400 focus:outline-none bg-gray-50 hover:bg-white transition"
                    >
                        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
                            <option key={w} value={w}>
                                {w}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default BodyTextControls;
