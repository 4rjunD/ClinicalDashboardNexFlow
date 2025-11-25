// Encryption utilities for HIPAA compliance
// AES-256-GCM encryption for patient data and IDs

const crypto = require('crypto');

// Get encryption key from environment variable
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY_BASE64;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // If key is base64 encoded, decode it
    if (key.length > 32) {
        try {
            return Buffer.from(key, 'base64');
        } catch (e) {
            // If not base64, use as-is (should be 32 bytes for AES-256)
            return Buffer.from(key, 'utf8').slice(0, 32);
        }
    }
    
    // Pad or truncate to 32 bytes
    const keyBuffer = Buffer.alloc(32);
    Buffer.from(key, 'utf8').copy(keyBuffer);
    return keyBuffer;
}

// Encrypt data using AES-256-GCM
function encryptData(data) {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(16); // 16 bytes for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        let encrypted = cipher.update(dataString, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Return IV + authTag + encrypted data (all hex encoded)
        return {
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            data: encrypted
        };
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

// Decrypt data using AES-256-GCM
function decryptData(encryptedObj) {
    try {
        const key = getEncryptionKey();
        const iv = Buffer.from(encryptedObj.iv, 'hex');
        const authTag = Buffer.from(encryptedObj.authTag, 'hex');
        const encrypted = encryptedObj.data;
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        // Try to parse as JSON, return as string if not
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

// Encrypt patient ID deterministically (same ID always produces same encrypted value)
function encryptPatientId(patientId) {
    const key = getEncryptionKey();
    const iv = crypto.createHash('sha256').update(String(patientId)).digest().slice(0, 16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = cipher.update(String(patientId), 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // Return base64 encoded for URL safety
    const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return Buffer.from(combined).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Decrypt patient ID
function decryptPatientId(encryptedId) {
    try {
        const key = getEncryptionKey();
        // Decode from URL-safe base64
        const combined = Buffer.from(encryptedId.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
        
        const ivHex = combined.substring(0, 32);
        const authTagHex = combined.substring(33, 65);
        const encrypted = combined.substring(66);
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
        return decrypted;
    } catch (error) {
        throw new Error(`Patient ID decryption failed: ${error.message}`);
    }
}

// Encrypt file content (for data at rest)
function encryptFileContent(data) {
    const encrypted = encryptData(data);
    // Store as JSON string for easy file writing
    return JSON.stringify(encrypted);
}

// Decrypt file content (for data at rest)
function decryptFileContent(encryptedString) {
    try {
        const encryptedObj = JSON.parse(encryptedString);
        return decryptData(encryptedObj);
    } catch (error) {
        // If parsing fails, might be old unencrypted format - return as-is for migration
        try {
            return JSON.parse(encryptedString);
        } catch {
            throw new Error(`File decryption failed: ${error.message}`);
        }
    }
}

module.exports = {
    encryptData,
    decryptData,
    encryptPatientId,
    decryptPatientId,
    encryptFileContent,
    decryptFileContent
};

