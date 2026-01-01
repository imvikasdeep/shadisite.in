import { ComplexField, BiodataField } from '../types';

/**
 * Flattens the complex field structure into a list of single-line BiodataField objects.
 * Splits labels and values by the '/' character to create multiple fields.
 */
export const flattenFields = (complexFields: ComplexField[]): BiodataField[] => {
    const flatFields: BiodataField[] = [];

    complexFields.forEach(cf => {
        // Split labels and values by the '/' character
        const labels = cf.label.split('/').map(s => s.trim());
        const values = cf.value.split('/').map(s => s.trim());

        const finalCount = Math.max(labels.length, values.length, 1);

        for (let i = 0; i < finalCount; i++) {
            const label = (labels[i] || '').replace(':', '').trim();
            const value = (values[i] || '').trim();

            if (label || value) {
                flatFields.push({
                    id: `${cf.id}-${i}`,
                    label,
                    value,
                    type: 'mandatory',        // logic type
                    groupId: cf.group,        // 'personal' | 'family' | 'contact'
                    inputType: cf.type,       // actual HTML input type
                    options: cf.options,      // select/radio options
                });
            }
        }
    });

    return flatFields;
};
