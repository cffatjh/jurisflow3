import crypto from 'crypto';

// Use APP_SECRET or fallback for dev (In prod, APP_SECRET is required)
const ENCRYPTION_KEY = process.env.APP_SECRET || 'dev-secret-key-must-be-32-bytes!!'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

export const encrypt = (text: string): string => {
    if (!text) return text;

    // Ensure key is 32 bytes
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
    if (!text) return text;

    try {
        const textParts = text.split(':');
        if (textParts.length < 2) return text; // Not encrypted or invalid format

        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        console.error('Decryption failed:', error);
        return text; // Return original on failure (fallback)
    }
};
