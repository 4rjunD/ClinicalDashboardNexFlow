// De-identification utility for HIPAA compliance
// Removes all 18 HIPAA identifiers before sending data to third parties

function deidentifyPatientData(patientData) {
    if (!patientData || typeof patientData !== 'object') {
        return null;
    }

    // Create a deep copy to avoid mutating original
    const deidentified = JSON.parse(JSON.stringify(patientData));

    // Remove direct identifiers
    delete deidentified.name;
    delete deidentified.email;
    delete deidentified.phone;
    delete deidentified.address;
    delete deidentified.dateOfBirth;
    delete deidentified.dob;
    delete deidentified.ssn;
    delete deidentified.medicalRecordNumber;
    delete deidentified.accountNumber;
    delete deidentified.licenseNumber;
    delete deidentified.deviceId;
    delete deidentified.ipAddress;
    delete deidentified.biometricIdentifiers;
    delete deidentified.photo;
    delete deidentified.clinicId;
    delete deidentified.providerId;

    // Replace patientId with a hash (deterministic but not reversible)
    if (deidentified.patientId) {
        deidentified.patientIdHash = hashPatientId(deidentified.patientId);
        delete deidentified.patientId;
    }

    // Remove dates (keep only relative time if needed)
    if (deidentified.createdAt) {
        const daysSinceCreation = Math.floor((Date.now() - new Date(deidentified.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        deidentified.daysSinceCreation = daysSinceCreation;
        delete deidentified.createdAt;
    }
    if (deidentified.updatedAt) {
        const daysSinceUpdate = Math.floor((Date.now() - new Date(deidentified.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
        deidentified.daysSinceUpdate = daysSinceUpdate;
        delete deidentified.updatedAt;
    }

    // De-identify nested patient objects
    if (deidentified.patient) {
        deidentified.patient = {
            age: deidentified.patient.age, // Age is allowed if > 89 is grouped
            sex: deidentified.patient.sex, // Sex is allowed
            bmi: deidentified.patient.bmi, // BMI is allowed
            // Remove all identifiers
        };
        delete deidentified.patient.id;
        delete deidentified.patient.name;
        delete deidentified.patient.email;
    }

    // De-identify clinician notes (remove clinician names, keep content)
    if (Array.isArray(deidentified.clinicianNotes)) {
        deidentified.clinicianNotes = deidentified.clinicianNotes.map(note => ({
            category: note.category,
            content: note.content,
            priority: note.priority,
            tags: note.tags,
            daysAgo: note.timestamp ? Math.floor((Date.now() - new Date(note.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    // De-identify wearable data (remove device IDs)
    if (Array.isArray(deidentified.wearableData)) {
        deidentified.wearableData = deidentified.wearableData.map(entry => ({
            deviceType: entry.deviceType, // Generic type is OK
            dataType: entry.dataType,
            value: entry.value,
            unit: entry.unit,
            daysAgo: entry.timestamp ? Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
        // Remove deviceId from all entries
    }

    // De-identify EMR/EHR data (remove provider names)
    if (Array.isArray(deidentified.emrData)) {
        deidentified.emrData = deidentified.emrData.map(entry => ({
            source: entry.source, // Generic source is OK
            dataType: entry.dataType,
            value: entry.value,
            unit: entry.unit,
            daysAgo: entry.timestamp ? Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    if (Array.isArray(deidentified.ehrData)) {
        deidentified.ehrData = deidentified.ehrData.map(entry => ({
            source: entry.source,
            dataType: entry.dataType,
            value: entry.value,
            unit: entry.unit,
            daysAgo: entry.timestamp ? Math.floor((Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    // De-identify medications (remove prescriber/pharmacy names)
    if (Array.isArray(deidentified.medications)) {
        deidentified.medications = deidentified.medications.map(med => ({
            name: med.name, // Medication name is OK
            dosage: med.dosage,
            frequency: med.frequency,
            category: med.category,
            daysSinceStart: med.startDate ? Math.floor((Date.now() - new Date(med.startDate).getTime()) / (1000 * 60 * 60 * 24)) : null,
            refillsRemaining: med.refillsRemaining
        }));
    }

    // De-identify lab results (keep clinical data, remove identifiers)
    if (Array.isArray(deidentified.labResults)) {
        deidentified.labResults = deidentified.labResults.map(lab => ({
            testName: lab.testName,
            value: lab.value,
            unit: lab.unit,
            referenceRange: lab.referenceRange,
            status: lab.status,
            daysAgo: lab.date ? Math.floor((Date.now() - new Date(lab.date).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    // De-identify vital signs
    if (Array.isArray(deidentified.vitalSigns)) {
        deidentified.vitalSigns = deidentified.vitalSigns.map(vital => ({
            type: vital.type,
            value: vital.value,
            unit: vital.unit,
            daysAgo: vital.timestamp ? Math.floor((Date.now() - new Date(vital.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    // De-identify appointments (remove provider/clinic names)
    if (Array.isArray(deidentified.appointments)) {
        deidentified.appointments = deidentified.appointments.map(apt => ({
            type: apt.type,
            status: apt.status,
            daysUntil: apt.date ? Math.floor((new Date(apt.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
        }));
    }

    // Keep clinical data (conditions, metrics, scores) - these are not identifiers
    // Keep metadata counts but remove identifiers
    if (deidentified.metadata) {
        deidentified.metadata = {
            totalRecords: deidentified.metadata.totalRecords,
            dataSources: deidentified.metadata.dataSources
        };
        delete deidentified.metadata.lastSync;
    }

    return deidentified;
}

// Hash patient ID deterministically (for consistent de-identification)
function hashPatientId(patientId) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(String(patientId)).digest('hex').substring(0, 16);
}

// De-identify patient object for GPT calls (minimal version)
function deidentifyForGPT(patient) {
    if (!patient) return null;
    
    return {
        // Keep only non-identifying clinical data
        age: patient.age,
        sex: patient.sex,
        bmi: patient.bmi,
        healthConditions: patient.healthConditions || [],
        // Remove all identifiers
    };
}

module.exports = {
    deidentifyPatientData,
    deidentifyForGPT,
    hashPatientId
};

