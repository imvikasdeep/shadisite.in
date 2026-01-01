import { CanonicalGroupId, FieldGroupId } from '../types';

// Mapping the actual group IDs to a canonical group ID for grouping logic
export const getCanonicalGroupId = (groupId: FieldGroupId): CanonicalGroupId => {
    if (groupId.includes('personal')) return 'personal';
    if (groupId.includes('family')) return 'family';
    if (groupId.includes('contact') || groupId === 'custom') return 'contact';
    return 'other';
};

// Titles for the sections
export const GROUP_TITLES: Record<'personal' | 'family' | 'contact', string> = {
    'personal': 'Personal Details',
    'family': 'Family Details',
    'contact': 'Contact & Other Details',
};
