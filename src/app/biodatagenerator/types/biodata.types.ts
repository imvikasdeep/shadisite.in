// Field and Form Types
export type FieldType = 'mandatory' | 'custom';

export type CanonicalGroupId = 'personal' | 'family' | 'contact' | 'other';

// Updated groupId to include specific groups for custom fields
export type FieldGroupId = 'personal' | 'family' | 'contact' | 'custom-personal' | 'custom-family' | 'custom';

export type InputFieldType = 'text' | 'textarea' | 'date' | 'time' | 'select' | 'radio';

export interface BiodataField {
    id: string;
    label: string;
    value: string;
    type: FieldType; // 'mandatory' | 'custom'
    groupId: FieldGroupId;
    inputType: InputFieldType; // 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'time'
    options?: string[]; // only for select/radio
}

export interface ComplexField {
    id: string;
    label: string;
    value: string;
    type: InputFieldType;
    group: 'personal' | 'family' | 'contact';
    options?: string[]; // Optional, for select/radio fields
}
