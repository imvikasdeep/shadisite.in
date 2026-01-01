import { useCallback } from 'react';
import { BiodataField } from '../types';

/**
 * Hook to manage field CRUD operations
 */
export const useFieldHandlers = (
    fields: BiodataField[],
    setFields: React.Dispatch<React.SetStateAction<BiodataField[]>>,
    step: number
) => {
    const getCurrentStepFieldIds = useCallback((currentStep: number): string[] => {
        switch (currentStep) {
            case 2:
                return fields
                    .filter(f => f.groupId === 'personal' || f.groupId === 'custom-personal')
                    .map(f => f.id);
            case 3:
                return fields
                    .filter(f => f.groupId === 'family' || f.groupId === 'custom-family')
                    .map(f => f.id);
            case 4:
                return fields
                    .filter(f => f.groupId === 'contact' || f.groupId === 'custom')
                    .map(f => f.id);
            default:
                return [];
        }
    }, [fields]);

    const handleFieldChange = useCallback((id: string, value: string) => {
        setFields(prevFields =>
            prevFields.map(field =>
                field.id === id ? { ...field, value } : field
            )
        );
    }, [setFields]);

    const handleLabelChange = useCallback((id: string, newLabel: string) => {
        setFields(prevFields =>
            prevFields.map(field =>
                field.id === id ? { ...field, label: newLabel } : field
            )
        );
    }, [setFields]);

    const handleFieldMove = useCallback((id: string, direction: 'up' | 'down') => {
        setFields(prevFields => {
            const currentGroupIds = getCurrentStepFieldIds(step);
            const groupIndex = currentGroupIds.findIndex(groupId => groupId === id);

            if (groupIndex === -1) return prevFields;

            const newGroupIndex = groupIndex + (direction === 'up' ? -1 : 1);

            if (newGroupIndex < 0 || newGroupIndex >= currentGroupIds.length) return prevFields;

            const targetId = currentGroupIds[newGroupIndex];
            const sourceAbsIndex = prevFields.findIndex(f => f.id === id);
            const targetAbsIndex = prevFields.findIndex(f => f.id === targetId);

            if (sourceAbsIndex === -1 || targetAbsIndex === -1) return prevFields;

            const newFields = [...prevFields];
            [newFields[sourceAbsIndex], newFields[targetAbsIndex]] = [newFields[targetAbsIndex], newFields[sourceAbsIndex]];

            return newFields;
        });
    }, [step, getCurrentStepFieldIds, setFields]);

    const removeCustomField = useCallback((id: string) => {
        setFields(prevFields => prevFields.filter(field => field.id !== id));
    }, [setFields]);

    return {
        getCurrentStepFieldIds,
        handleFieldChange,
        handleLabelChange,
        handleFieldMove,
        removeCustomField
    };
};
