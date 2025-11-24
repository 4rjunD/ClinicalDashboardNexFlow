// Seed FlowBase with random patient data
const FlowBase = require('./flowbase');

function generateRandomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSeedData(flowbase, patientIds) {
  const deviceTypes = ['Apple Watch', 'Fitbit', 'Garmin', 'Samsung Health', 'Oura Ring'];
  const dataTypes = ['steps', 'heart_rate', 'blood_pressure', 'sleep', 'calories', 'spo2', 'glucose'];
  const clinicians = ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Davis'];
  const categories = ['general', 'medication', 'symptom', 'follow-up', 'urgent'];
  const priorities = ['low', 'normal', 'high', 'urgent'];

  patientIds.forEach(patientId => {
    const data = flowbase.getPatientData(patientId);
    
    // Generate clinician notes (5-10 per patient)
    const numNotes = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < numNotes; i++) {
      const noteDate = generateRandomDate('2024-01-01', new Date());
      flowbase.addClinicianNote(patientId, {
        clinician: clinicians[Math.floor(Math.random() * clinicians.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        content: `Patient follow-up note ${i + 1}. Discussed treatment plan and progress. Patient reported ${['improvement', 'stability', 'concerns', 'questions'][Math.floor(Math.random() * 4)]} in condition.`,
        tags: ['follow-up', 'treatment'],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        timestamp: noteDate.toISOString()
      });
    }

    // Generate wearable data (20-40 entries per patient)
    const numWearable = Math.floor(Math.random() * 21) + 20;
    for (let i = 0; i < numWearable; i++) {
      const dataDate = generateRandomDate('2024-01-01', new Date());
      const dataType = dataTypes[Math.floor(Math.random() * dataTypes.length)];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      
      let value, unit;
      switch (dataType) {
        case 'steps':
          value = Math.floor(Math.random() * 15000) + 3000;
          unit = 'steps';
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 40) + 60;
          unit = 'bpm';
          break;
        case 'blood_pressure':
          value = `${Math.floor(Math.random() * 30) + 110}/${Math.floor(Math.random() * 20) + 70}`;
          unit = 'mmHg';
          break;
        case 'sleep':
          value = (Math.random() * 3 + 6).toFixed(1);
          unit = 'hours';
          break;
        case 'calories':
          value = Math.floor(Math.random() * 1000) + 1500;
          unit = 'kcal';
          break;
        case 'spo2':
          value = Math.floor(Math.random() * 5) + 94;
          unit = '%';
          break;
        case 'glucose':
          value = Math.floor(Math.random() * 60) + 80;
          unit = 'mg/dL';
          break;
        default:
          value = Math.floor(Math.random() * 100);
          unit = 'units';
      }

      flowbase.addWearableData(patientId, {
        deviceType: deviceType,
        deviceId: `device-${Math.floor(Math.random() * 1000)}`,
        dataType: dataType,
        value: value,
        unit: unit,
        timestamp: dataDate.toISOString(),
        metadata: {
          syncMethod: 'automatic',
          quality: 'good'
        }
      });
    }

    // Generate EMR data (10-20 entries)
    const numEMR = Math.floor(Math.random() * 11) + 10;
    for (let i = 0; i < numEMR; i++) {
      const emrDate = generateRandomDate('2024-01-01', new Date());
      flowbase.addEMRData(patientId, {
        source: 'Epic EMR',
        dataType: ['lab_result', 'diagnosis', 'prescription', 'vital_sign'][Math.floor(Math.random() * 4)],
        value: Math.floor(Math.random() * 200) + 50,
        unit: 'units',
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        timestamp: emrDate.toISOString(),
        metadata: {
          encounterId: `enc-${Math.floor(Math.random() * 10000)}`,
          department: ['Cardiology', 'Endocrinology', 'Primary Care'][Math.floor(Math.random() * 3)]
        }
      });
    }

    // Generate EHR data (10-20 entries)
    const numEHR = Math.floor(Math.random() * 11) + 10;
    for (let i = 0; i < numEHR; i++) {
      const ehrDate = generateRandomDate('2024-01-01', new Date());
      flowbase.addEHRData(patientId, {
        source: 'Cerner EHR',
        dataType: ['observation', 'condition', 'medication', 'procedure'][Math.floor(Math.random() * 4)],
        value: Math.floor(Math.random() * 150) + 30,
        unit: 'units',
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        timestamp: ehrDate.toISOString(),
        metadata: {
          fhirResource: 'Observation',
          system: 'http://loinc.org'
        }
      });
    }

    // Add medications
    const medications = [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily' }
    ];
    medications.forEach((med, idx) => {
      data.medications.push({
        id: `med-${Date.now()}-${idx}`,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: generateRandomDate('2024-01-01', new Date()).toISOString(),
        prescriber: clinicians[Math.floor(Math.random() * clinicians.length)]
      });
    });

    // Add lab results
    const labTypes = ['HbA1c', 'LDL', 'HDL', 'Triglycerides', 'Glucose', 'Creatinine'];
    labTypes.forEach((labType, idx) => {
      data.labResults.push({
        id: `lab-${Date.now()}-${idx}`,
        testName: labType,
        value: Math.random() * 50 + 20,
        unit: labType === 'HbA1c' ? '%' : 'mg/dL',
        date: generateRandomDate('2024-01-01', new Date()).toISOString(),
        lab: 'LabCorp'
      });
    });

    // Add vital signs
    for (let i = 0; i < 15; i++) {
      data.vitalSigns.push({
        id: `vital-${Date.now()}-${i}`,
        type: ['blood_pressure', 'heart_rate', 'temperature', 'weight'][Math.floor(Math.random() * 4)],
        value: Math.random() * 50 + 70,
        unit: 'units',
        date: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    }

    // Add activities
    const activities = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga'];
    for (let i = 0; i < 20; i++) {
      data.activities.push({
        id: `activity-${Date.now()}-${i}`,
        type: activities[Math.floor(Math.random() * activities.length)],
        duration: Math.floor(Math.random() * 60) + 15,
        calories: Math.floor(Math.random() * 300) + 100,
        date: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    }

    // Add sleep data
    for (let i = 0; i < 30; i++) {
      data.sleepData.push({
        id: `sleep-${Date.now()}-${i}`,
        duration: (Math.random() * 3 + 6).toFixed(1),
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
        date: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    }

    // Add nutrition data
    for (let i = 0; i < 25; i++) {
      data.nutritionData.push({
        id: `nutrition-${Date.now()}-${i}`,
        calories: Math.floor(Math.random() * 800) + 1200,
        carbs: Math.floor(Math.random() * 100) + 50,
        protein: Math.floor(Math.random() * 80) + 40,
        fat: Math.floor(Math.random() * 60) + 20,
        date: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    }

    // Add symptoms
    const symptoms = ['Fatigue', 'Headache', 'Dizziness', 'Nausea', 'Shortness of breath'];
    for (let i = 0; i < 10; i++) {
      data.symptoms.push({
        id: `symptom-${Date.now()}-${i}`,
        description: symptoms[Math.floor(Math.random() * symptoms.length)],
        severity: Math.floor(Math.random() * 5) + 1,
        date: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    }

    // Add appointments
    for (let i = 0; i < 5; i++) {
      data.appointments.push({
        id: `appt-${Date.now()}-${i}`,
        date: generateRandomDate(new Date(), '2024-12-31').toISOString(),
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        type: ['Follow-up', 'Consultation', 'Procedure'][Math.floor(Math.random() * 3)],
        status: ['scheduled', 'completed', 'cancelled'][Math.floor(Math.random() * 3)]
      });
    }

    // Save all data
    flowbase.savePatientData(patientId, data);
    console.log(`✓ Seeded data for patient ${patientId}`);
  });
}

module.exports = { generateSeedData };

