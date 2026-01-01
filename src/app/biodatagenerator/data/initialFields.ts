import { ComplexField } from '../types';
import { flattenFields } from '../utils/fieldTransform';

const INITIAL_COMPLEX_FIELDS: ComplexField[] = [
    // ---------------- PERSONAL ----------------
    { id: 'name', label: 'Full Name', value: '', type: 'text', group: 'personal' },
    { id: 'dob', label: 'Date of Birth', value: '', type: 'date', group: 'personal' },
    { id: 'tob', label: 'Time of Birth', value: '', type: 'time', group: 'personal' },
    { id: 'pob', label: 'Place of Birth', value: '', type: 'text', group: 'personal' },
    { id: 'gender', label: 'Gender', value: '', type: 'radio', group: 'personal', options: ['Male', 'Female', 'Transgender', 'Other'] },
    { id: 'marital_status', label: 'Marital Status', value: '', type: 'select', group: 'personal', options: ['Unmarried (Single)', 'Divorsed', 'Widowed', 'Divorse Awaiting', 'Seperated', 'Annulled'] },
    { id: 'religion', label: 'Religion', value: '', type: 'select', group: 'personal', options: ['Hindu', 'Muslim', 'Christian', 'Jewish', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Inter-Religion', 'Spiritual - No Religious', 'No Religion'] },
    { id: 'caste', label: 'Caste', value: '', type: 'text', group: 'personal' },
    { id: 'sub_caste', label: 'Sub Caste', value: '', type: 'text', group: 'personal' },
    { id: 'manglik', label: 'Manglik', value: '', type: 'radio', group: 'personal', options: ['Yes', 'No', 'Partial (Anshik)', "Don't Believe"] },
    { id: 'rashi', label: 'Rashi', value: '', type: 'select', group: 'personal', options: ['Mesh (Aries)', 'Vrishabha (Taurus)', 'Mithuna (Gemini)', 'Karka (Cancer)', 'Simha (Leo)', 'Kanya (Virgo)', 'Tula (Libra)', 'Vrischika (Scorpio)', 'Dhanur (Sagittarious)', 'Makara (Capricorn)', 'Kumbha (Aquarius)', 'Meena (Pisces)'] },
    { id: 'nakshatra', label: 'Nakshatra', value: '', type: 'select', group: 'personal', options: ['Aswini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Poorva Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Poorvashada', 'Uthrashada', 'Shravana', 'Dhanishtha', 'Shathabhisha', 'Poorva Bhadrapada', 'Uttara Bhadrapada', 'Revati'] },
    { id: 'gotra', label: 'Gotra', value: '', type: 'text', group: 'personal' },
    { id: 'complex', label: 'Complex', value: '', type: 'select', group: 'personal', options: ['Very Fair', 'Fair', 'Medium', 'Wheatish', 'Brown', 'Dark'] },
    { id: 'body_type', label: 'Body Type', value: '', type: 'select', group: 'personal', options: ['Slim', 'Average', 'Fit', 'Athletic', 'Heavy'] },
    { id: 'height', label: 'Height', value: '', type: 'text', group: 'personal' },
    { id: 'weight', label: 'Weight', value: '', type: 'text', group: 'personal' },
    { id: 'blood_group', label: 'Blood Group', value: '', type: 'select', group: 'personal', options: ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve'] },
    { id: 'mother_tongue', label: 'Mother Tongue', value: '', type: 'select', group: 'personal', options: ['Hindi', 'Punjabi', 'Haryanvi', 'Himachali', 'Kashmiri', 'Sindhi', 'Urdu', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Oriya', 'Sikkim', 'Nepali', 'English'] },
    { id: 'community', label: 'Community', value: '', type: 'select', group: 'personal', options: ['Hindi', 'Punjabi', 'Sindhi', 'Jain', 'Rajasthani', 'Gujarati', 'Bengali', 'Kannada', 'Telegu', 'Brij', 'Nepali', 'English', 'Haryanvi', 'Pahari', 'Marathi'] },
    { id: 'education', label: 'Education', value: '', type: 'text', group: 'personal' },
    { id: 'institution', label: 'Institution Name', value: '', type: 'text', group: 'personal' },
    { id: 'occupation', label: 'Job/Occupation', value: '', type: 'text', group: 'personal' },
    { id: 'job_place', label: 'Job Place', value: '', type: 'text', group: 'personal' },
    { id: 'job_experience', label: 'Job Experience', value: '', type: 'text', group: 'personal' },
    { id: 'annual_income', label: 'Annual Income', value: '', type: 'text', group: 'personal' },
    { id: 'diet', label: 'Diet', value: '', type: 'radio', group: 'personal', options: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'] },
    { id: 'hobbies', label: 'Hobbies', value: '', type: 'text', group: 'personal' },
    { id: 'interests', label: 'Interests', value: '', type: 'text', group: 'personal' },
    { id: 'language_known', label: 'Language Known', value: '', type: 'text', group: 'personal' },
    { id: 'about_myself', label: 'About Myself', value: '', type: 'textarea', group: 'personal' },
    { id: 'expectation', label: 'Expectation', value: '', type: 'textarea', group: 'personal' },

    // ---------------- FAMILY ----------------
    { id: 'grand_father_name', label: 'Grand Father Name', value: '', type: 'text', group: 'family' },
    { id: 'grand_father_occupation', label: 'Grand Father Occupation', value: '', type: 'text', group: 'family' },
    { id: 'grand_mother_name', label: 'Grand Mother Name', value: '', type: 'text', group: 'family' },
    { id: 'grand_mother_occupation', label: 'Grand Mother Occupation', value: '', type: 'text', group: 'family' },
    { id: 'father_name', label: 'Father Name', value: '', type: 'text', group: 'family' },
    { id: 'father_occupation', label: 'Father Occupation', value: '', type: 'text', group: 'family' },
    { id: 'mother_name', label: 'Mother Name', value: '', type: 'text', group: 'family' },
    { id: 'mother_occupation', label: 'Mother Occupation', value: '', type: 'text', group: 'family' },
    { id: 'brothers', label: 'Brothers', value: '', type: 'text', group: 'family' },
    { id: 'sisters', label: 'Sisters', value: '', type: 'text', group: 'family' },
    { id: 'kids', label: 'Kids', value: '', type: 'text', group: 'family' },
    { id: 'relatives', label: 'Relatives', value: '', type: 'text', group: 'family' },
    { id: 'family_language', label: 'Family Language', value: '', type: 'text', group: 'family' },
    { id: 'family_status', label: 'Family Status', value: '', type: 'select', group: 'family', options: ['Affluent', 'Upper Middle Class', 'Middle Class', 'Lower Middle Class', 'Average', 'Lower Class'] },
    { id: 'family_type', label: 'Family Type', value: '', type: 'select', group: 'family', options: ['Joint Family', 'Nuclear Family', 'Seperated', 'Other'] },
    { id: 'family_values', label: 'Family Values', value: '', type: 'select', group: 'family', options: ['Orthodox', 'Conservative', 'Moderate', 'Liberal'] },
    { id: 'family_income', label: 'Family Income', value: '', type: 'text', group: 'family' },
    { id: 'family_assets', label: 'Family Assets', value: '', type: 'text', group: 'family' },
    { id: 'about_family', label: 'About Family', value: '', type: 'textarea', group: 'family' },

    // ---------------- CONTACT ----------------
    { id: 'personal_contact', label: 'Personal Contact', value: '', type: 'text', group: 'contact' },
    { id: 'contact_persons', label: 'Contact Persons', value: '', type: 'select', group: 'contact', options: ['Father', 'Mother', 'Brother', 'Sister', 'Relative'] },
    { id: 'email', label: 'E-mail', value: '', type: 'text', group: 'contact' },
    { id: 'phone_number', label: 'Phone Number', value: '', type: 'text', group: 'contact' },
    { id: 'mobile_number', label: 'Mobile No.', value: '', type: 'text', group: 'contact' },
    { id: 'home_town', label: 'Home Town', value: '', type: 'text', group: 'contact' },
    { id: 'permanent_address', label: 'Permanent Address', value: '', type: 'text', group: 'contact' },
    { id: 'present_address', label: 'Present Address', value: '', type: 'text', group: 'contact' },
    { id: 'preferred_contact_time', label: 'Preferred Contact Time', value: '', type: 'text', group: 'contact' },
    { id: 'picture_profile', label: 'Picture Profile', value: '', type: 'text', group: 'contact' },
    { id: 'notes', label: 'Notes', value: '', type: 'textarea', group: 'contact' }
];

// Generate the initial flat list of fields
export const initialFields = flattenFields(INITIAL_COMPLEX_FIELDS);

// Also export the complex fields for reference
export { INITIAL_COMPLEX_FIELDS };
