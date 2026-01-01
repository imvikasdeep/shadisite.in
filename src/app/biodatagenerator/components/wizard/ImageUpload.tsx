'use client';
import React from 'react';

interface ImageUploadProps {
    label: string;
    imageType: 'logo' | 'photo';
    onUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'photo') => void;
    currentUrl: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ label, imageType, onUpload, currentUrl }) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 h-16 w-16 bg-gray-200 rounded-lg overflow-hidden border">
                {currentUrl && (
                    <img
                        src={currentUrl}
                        alt={label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '';
                        }}
                    />
                )}
            </div>
            <label className="flex-1 cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-lg shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 transition duration-150">
                Choose File
                <input
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={(e) => onUpload(e, imageType)}
                />
            </label>
        </div>
    </div>
);

export default ImageUpload;
