const fs = require('fs');
const path = require('path');

// FlowBase - Centralized Patient Data Center
class FlowBase {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getPatientFilePath(patientId) {
    return path.join(this.dataDir, `patient-${patientId}.json`);
  }

  // Initialize or get patient data
  getPatientData(patientId) {
    const filePath = this.getPatientFilePath(patientId);
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error reading patient data for ${patientId}:`, error);
        return this.createEmptyPatientData(patientId);
      }
    }
    return this.createEmptyPatientData(patientId);
  }

  createEmptyPatientData(patientId) {
    return {
      patientId: patientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clinicianNotes: [],
      wearableData: [],
      emrData: [],
      ehrData: [],
      medications: [],
      labResults: [],
      vitalSigns: [],
      activities: [],
      sleepData: [],
      nutritionData: [],
      symptoms: [],
      appointments: [],
      metadata: {
        lastSync: null,
        dataSources: [],
        totalRecords: 0
      }
    };
  }

  savePatientData(patientId, data) {
    const filePath = this.getPatientFilePath(patientId);
    data.updatedAt = new Date().toISOString();
    data.metadata.totalRecords = this.countTotalRecords(data);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error saving patient data for ${patientId}:`, error);
      return false;
    }
  }

  countTotalRecords(data) {
    return (
      (data.clinicianNotes?.length || 0) +
      (data.wearableData?.length || 0) +
      (data.emrData?.length || 0) +
      (data.ehrData?.length || 0) +
      (data.medications?.length || 0) +
      (data.labResults?.length || 0) +
      (data.vitalSigns?.length || 0) +
      (data.activities?.length || 0) +
      (data.sleepData?.length || 0) +
      (data.nutritionData?.length || 0) +
      (data.symptoms?.length || 0) +
      (data.appointments?.length || 0)
    );
  }

  // Add clinician note
  addClinicianNote(patientId, note) {
    const data = this.getPatientData(patientId);
    const noteEntry = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      clinician: note.clinician || 'Unknown',
      category: note.category || 'general',
      content: note.content,
      tags: note.tags || [],
      priority: note.priority || 'normal'
    };
    data.clinicianNotes.push(noteEntry);
    this.savePatientData(patientId, data);
    return noteEntry;
  }

  // Add wearable data
  addWearableData(patientId, wearableEntry) {
    const data = this.getPatientData(patientId);
    const entry = {
      id: `wearable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      deviceType: wearableEntry.deviceType || 'unknown',
      deviceId: wearableEntry.deviceId,
      dataType: wearableEntry.dataType,
      value: wearableEntry.value,
      unit: wearableEntry.unit,
      metadata: wearableEntry.metadata || {}
    };
    data.wearableData.push(entry);
    this.savePatientData(patientId, data);
    return entry;
  }

  // Add EMR data
  addEMRData(patientId, emrEntry) {
    const data = this.getPatientData(patientId);
    const entry = {
      id: `emr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      source: emrEntry.source || 'EMR',
      dataType: emrEntry.dataType,
      value: emrEntry.value,
      unit: emrEntry.unit,
      provider: emrEntry.provider,
      metadata: emrEntry.metadata || {}
    };
    data.emrData.push(entry);
    this.savePatientData(patientId, data);
    return entry;
  }

  // Add EHR data
  addEHRData(patientId, ehrEntry) {
    const data = this.getPatientData(patientId);
    const entry = {
      id: `ehr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      source: ehrEntry.source || 'EHR',
      dataType: ehrEntry.dataType,
      value: ehrEntry.value,
      unit: ehrEntry.unit,
      provider: ehrEntry.provider,
      metadata: ehrEntry.metadata || {}
    };
    data.ehrData.push(entry);
    this.savePatientData(patientId, data);
    return entry;
  }

  // Get all data for a patient
  getAllPatientData(patientId) {
    return this.getPatientData(patientId);
  }

  // Get all patient IDs
  getAllPatientIds() {
    if (!fs.existsSync(this.dataDir)) {
      return [];
    }
    const files = fs.readdirSync(this.dataDir);
    return files
      .filter(file => file.startsWith('patient-') && file.endsWith('.json'))
      .map(file => file.replace('patient-', '').replace('.json', ''));
  }
}

module.exports = FlowBase;

