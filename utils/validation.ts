// utils/validation.ts

/**
 * Validates an email address.
 * @param email The email string to validate.
 * @returns An error message string if invalid, otherwise null.
 */
export const validateEmail = (email: string): string | null => {
    if (!email) return null; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return "صيغة البريد الإلكتروني غير صحيحة.";
    }
    return null;
};

/**
 * Validates an Egyptian phone number.
 * Must be 11 digits and start with 010, 011, 012, or 015.
 * @param phone The phone number string to validate.
 * @returns An error message string if invalid, otherwise null.
 */
export const validatePhone = (phone: string): string | null => {
    if (!phone) return null; // Optional field
    const phoneRegex = /^01[0125]\d{8}$/;
    if (!phoneRegex.test(phone)) {
        return "يجب أن يكون رقم الهاتف مصريًا صالحًا (11 رقمًا).";
    }
    return null;
};

/**
 * Validates an Egyptian National ID.
 * Must be 14 digits.
 * @param id The National ID string to validate.
 * @returns An error message string if invalid, otherwise null.
 */
export const validateNationalId = (id: string): string | null => {
    if (!id) return "الرقم القومي مطلوب.";
    const nationalIdRegex = /^\d{14}$/;
    if (!nationalIdRegex.test(id)) {
        return "يجب أن يتكون الرقم القومي من 14 رقمًا.";
    }
    return null;
};

/**
 * Validates an Egyptian Tax ID number.
 * Must be in the format XXX-XXX-XXX.
 * @param id The Tax ID string to validate.
 * @returns An error message string if invalid, otherwise null.
 */
export const validateTaxId = (id: string): string | null => {
    if (!id) return null; // Optional field
    const taxIdRegex = /^\d{3}-\d{3}-\d{3}$/;
    if (!taxIdRegex.test(id)) {
        return "يجب أن تكون صيغة الرقم الضريبي XXX-XXX-XXX.";
    }
    return null;
};
