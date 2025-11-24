// Seed FlowBase with random patient data
const FlowBase = require('./flowbase');

function generateRandomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSeedData(flowbase, patientIds) {
  const deviceTypes = ['Apple Watch', 'Fitbit', 'Garmin', 'Samsung Health', 'Oura Ring', 'Whoop', 'Polar', 'Withings'];
  const dataTypes = ['steps', 'heart_rate', 'blood_pressure', 'sleep', 'calories', 'spo2', 'glucose', 'temperature', 'respiratory_rate', 'activity_minutes'];
  const clinicians = ['Dr. Smith', 'Dr. Johnson', 'Dr. Williams', 'Dr. Brown', 'Dr. Davis', 'Dr. Miller', 'Dr. Wilson', 'Dr. Moore', 'Dr. Taylor', 'Dr. Anderson'];
  const categories = ['general', 'medication', 'symptom', 'follow-up', 'urgent', 'diagnosis', 'treatment', 'lab_review', 'medication_adjustment', 'patient_concern'];
  const priorities = ['low', 'normal', 'high', 'urgent'];
  const noteTemplates = [
    'Patient reported {symptom} during follow-up. Discussed treatment options and lifestyle modifications.',
    'Reviewed recent lab results. {value} levels are {status}. Recommended {action}.',
    'Patient expressed concerns about {concern}. Provided education and reassurance.',
    'Medication review completed. {medication} dosage adjusted based on current symptoms.',
    'Follow-up appointment scheduled. Patient showing {progress} in condition management.',
    'Discussed {topic} with patient. Provided written materials and resources.',
    'Patient compliance with {treatment} is {status}. Reinforced importance of adherence.',
    'Reviewed wearable device data. Noted {observation}. Discussed implications.',
    'Patient education session on {topic}. Questions answered, plan reviewed.',
    'Telehealth consultation completed. Patient stable, no acute concerns.'
  ];

  patientIds.forEach(patientId => {
    const data = flowbase.getPatientData(patientId);
    
    // Generate TONS of clinician notes (30-50 per patient)
    const numNotes = Math.floor(Math.random() * 21) + 30;
    for (let i = 0; i < numNotes; i++) {
      const noteDate = generateRandomDate('2023-06-01', new Date());
      const template = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
      const symptom = ['fatigue', 'headache', 'dizziness', 'shortness of breath', 'chest pain', 'nausea', 'joint pain'][Math.floor(Math.random() * 7)];
      const value = ['HbA1c', 'LDL', 'blood pressure', 'glucose', 'cholesterol'][Math.floor(Math.random() * 5)];
      const status = ['elevated', 'within normal limits', 'improving', 'concerning'][Math.floor(Math.random() * 4)];
      const action = ['dietary changes', 'medication adjustment', 'increased monitoring', 'lifestyle modifications'][Math.floor(Math.random() * 4)];
      const concern = ['medication side effects', 'symptom progression', 'treatment effectiveness', 'lifestyle changes'][Math.floor(Math.random() * 4)];
      const medication = ['Metformin', 'Lisinopril', 'Atorvastatin', 'Aspirin'][Math.floor(Math.random() * 4)];
      const progress = ['improvement', 'stability', 'gradual improvement', 'maintained stability'][Math.floor(Math.random() * 4)];
      const topic = ['diabetes management', 'hypertension control', 'medication adherence', 'diet and exercise'][Math.floor(Math.random() * 4)];
      const treatment = ['medication regimen', 'dietary plan', 'exercise program', 'monitoring schedule'][Math.floor(Math.random() * 4)];
      const observation = ['elevated heart rate variability', 'improved sleep patterns', 'consistent activity levels', 'stable vital signs'][Math.floor(Math.random() * 4)];
      
      let content = template
        .replace('{symptom}', symptom)
        .replace('{value}', value)
        .replace('{status}', status)
        .replace('{action}', action)
        .replace('{concern}', concern)
        .replace('{medication}', medication)
        .replace('{progress}', progress)
        .replace('{topic}', topic)
        .replace('{treatment}', treatment)
        .replace('{observation}', observation);
      
      flowbase.addClinicianNote(patientId, {
        clinician: clinicians[Math.floor(Math.random() * clinicians.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        content: content,
        tags: ['follow-up', 'treatment', 'monitoring', 'education'][Math.floor(Math.random() * 4)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        timestamp: noteDate.toISOString()
      });
    }

    // Generate TONS of wearable data (100-200 entries per patient - multiple readings per day)
    const numWearable = Math.floor(Math.random() * 101) + 100;
    for (let i = 0; i < numWearable; i++) {
      const dataDate = generateRandomDate('2023-06-01', new Date());
      const dataType = dataTypes[Math.floor(Math.random() * dataTypes.length)];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      
      let value, unit;
      switch (dataType) {
        case 'steps':
          value = Math.floor(Math.random() * 15000) + 3000;
          unit = 'steps';
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 50) + 55;
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
          value = Math.floor(Math.random() * 1200) + 1400;
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
        case 'temperature':
          value = (Math.random() * 1.5 + 97.5).toFixed(1);
          unit = '°F';
          break;
        case 'respiratory_rate':
          value = Math.floor(Math.random() * 8) + 12;
          unit = 'breaths/min';
          break;
        case 'activity_minutes':
          value = Math.floor(Math.random() * 120) + 30;
          unit = 'minutes';
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

    // Generate TONS of EMR data (50-80 entries)
    const numEMR = Math.floor(Math.random() * 31) + 50;
    const emrSources = ['Epic EMR', 'Cerner EMR', 'Allscripts', 'eClinicalWorks', 'NextGen'];
    const emrDataTypes = ['lab_result', 'diagnosis', 'prescription', 'vital_sign', 'procedure', 'imaging', 'pathology', 'allergy', 'immunization'];
    const departments = ['Cardiology', 'Endocrinology', 'Primary Care', 'Pulmonology', 'Rheumatology', 'Neurology', 'Oncology'];
    
    for (let i = 0; i < numEMR; i++) {
      const emrDate = generateRandomDate('2023-06-01', new Date());
      const dataType = emrDataTypes[Math.floor(Math.random() * emrDataTypes.length)];
      let value, unit;
      
      if (dataType === 'lab_result') {
        const labTests = ['HbA1c', 'LDL', 'HDL', 'Triglycerides', 'Glucose', 'Creatinine', 'BUN', 'ALT', 'AST'];
        const test = labTests[Math.floor(Math.random() * labTests.length)];
        value = test === 'HbA1c' ? (Math.random() * 3 + 5).toFixed(1) : Math.floor(Math.random() * 100) + 50;
        unit = test === 'HbA1c' ? '%' : 'mg/dL';
      } else {
        value = Math.floor(Math.random() * 200) + 50;
        unit = 'units';
      }
      
      flowbase.addEMRData(patientId, {
        source: emrSources[Math.floor(Math.random() * emrSources.length)],
        dataType: dataType,
        value: value,
        unit: unit,
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        timestamp: emrDate.toISOString(),
        metadata: {
          encounterId: `enc-${Math.floor(Math.random() * 100000)}`,
          department: departments[Math.floor(Math.random() * departments.length)],
          visitType: ['Office Visit', 'Telehealth', 'Hospital', 'Urgent Care'][Math.floor(Math.random() * 4)]
        }
      });
    }

    // Generate TONS of EHR data (50-80 entries)
    const numEHR = Math.floor(Math.random() * 31) + 50;
    const ehrSources = ['Cerner EHR', 'Epic MyChart', 'Allscripts FollowMyHealth', 'athenahealth', 'eClinicalWorks'];
    const ehrDataTypes = ['observation', 'condition', 'medication', 'procedure', 'diagnostic_report', 'immunization', 'allergy_intolerance', 'care_plan'];
    
    for (let i = 0; i < numEHR; i++) {
      const ehrDate = generateRandomDate('2023-06-01', new Date());
      const dataType = ehrDataTypes[Math.floor(Math.random() * ehrDataTypes.length)];
      let value, unit;
      
      if (dataType === 'observation') {
        const obsTypes = ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'height', 'bmi'];
        const obsType = obsTypes[Math.floor(Math.random() * obsTypes.length)];
        if (obsType === 'blood_pressure') {
          value = `${Math.floor(Math.random() * 30) + 110}/${Math.floor(Math.random() * 20) + 70}`;
          unit = 'mmHg';
        } else if (obsType === 'heart_rate') {
          value = Math.floor(Math.random() * 40) + 60;
          unit = 'bpm';
        } else if (obsType === 'temperature') {
          value = (Math.random() * 1.5 + 97.5).toFixed(1);
          unit = '°F';
        } else if (obsType === 'weight') {
          value = (Math.random() * 50 + 120).toFixed(1);
          unit = 'lbs';
        } else if (obsType === 'height') {
          value = (Math.random() * 12 + 60).toFixed(0);
          unit = 'inches';
        } else {
          value = (Math.random() * 10 + 22).toFixed(1);
          unit = 'kg/m²';
        }
      } else {
        value = Math.floor(Math.random() * 150) + 30;
        unit = 'units';
      }
      
      flowbase.addEHRData(patientId, {
        source: ehrSources[Math.floor(Math.random() * ehrSources.length)],
        dataType: dataType,
        value: value,
        unit: unit,
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        timestamp: ehrDate.toISOString(),
        metadata: {
          fhirResource: dataType === 'observation' ? 'Observation' : 'Condition',
          system: 'http://loinc.org',
          code: `LOINC-${Math.floor(Math.random() * 10000)}`
        }
      });
    }

    // Add TONS of medications (8-12 per patient)
    const allMedications = [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', category: 'Diabetes' },
      { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', category: 'Hypertension' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', category: 'Cholesterol' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', category: 'Cardiac' },
      { name: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', category: 'Hypertension' },
      { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily', category: 'GI' },
      { name: 'Levothyroxine', dosage: '75mcg', frequency: 'Once daily', category: 'Thyroid' },
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', category: 'Hypertension' },
      { name: 'Losartan', dosage: '50mg', frequency: 'Once daily', category: 'Hypertension' },
      { name: 'Gabapentin', dosage: '300mg', frequency: 'Three times daily', category: 'Pain' },
      { name: 'Sertraline', dosage: '50mg', frequency: 'Once daily', category: 'Mental Health' },
      { name: 'Albuterol', dosage: '90mcg', frequency: 'As needed', category: 'Respiratory' }
    ];
    const numMeds = Math.floor(Math.random() * 5) + 8;
    const selectedMeds = allMedications.sort(() => 0.5 - Math.random()).slice(0, numMeds);
    selectedMeds.forEach((med, idx) => {
      data.medications.push({
        id: `med-${Date.now()}-${idx}`,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        category: med.category,
        startDate: generateRandomDate('2023-06-01', new Date()).toISOString(),
        prescriber: clinicians[Math.floor(Math.random() * clinicians.length)],
        pharmacy: ['CVS', 'Walgreens', 'Rite Aid', 'Walmart Pharmacy'][Math.floor(Math.random() * 4)],
        refillsRemaining: Math.floor(Math.random() * 5),
        lastFilled: generateRandomDate('2024-01-01', new Date()).toISOString()
      });
    });

    // Add TONS of lab results (20-30 per patient)
    const labTypes = ['HbA1c', 'LDL', 'HDL', 'Triglycerides', 'Glucose', 'Creatinine', 'BUN', 'ALT', 'AST', 'TSH', 'T4', 'CBC', 'CMP', 'Lipid Panel', 'Hemoglobin', 'Hematocrit', 'Platelets', 'WBC', 'RBC', 'Sodium', 'Potassium', 'Chloride', 'CO2', 'Calcium', 'Phosphorus'];
    const numLabs = Math.floor(Math.random() * 11) + 20;
    const selectedLabs = labTypes.sort(() => 0.5 - Math.random()).slice(0, numLabs);
    selectedLabs.forEach((labType, idx) => {
      let value, unit, referenceRange;
      if (labType === 'HbA1c') {
        value = (Math.random() * 3 + 5).toFixed(1);
        unit = '%';
        referenceRange = '4.0-5.6%';
      } else if (labType === 'Glucose') {
        value = Math.floor(Math.random() * 60) + 80;
        unit = 'mg/dL';
        referenceRange = '70-100 mg/dL';
      } else if (labType.includes('Cholesterol') || labType === 'LDL' || labType === 'HDL' || labType === 'Triglycerides') {
        value = Math.floor(Math.random() * 150) + 50;
        unit = 'mg/dL';
        referenceRange = 'Varies';
      } else {
        value = (Math.random() * 50 + 20).toFixed(1);
        unit = labType.includes('Count') ? 'K/uL' : 'mg/dL';
        referenceRange = 'Normal';
      }
      
      data.labResults.push({
        id: `lab-${Date.now()}-${idx}`,
        testName: labType,
        value: value,
        unit: unit,
        referenceRange: referenceRange,
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        lab: ['LabCorp', 'Quest Diagnostics', 'Mayo Clinic Labs', 'ARUP Labs'][Math.floor(Math.random() * 4)],
        status: ['Normal', 'Abnormal', 'Critical'][Math.floor(Math.random() * 3)]
      });
    });

    // Add TONS of vital signs (60-100 per patient - multiple readings)
    for (let i = 0; i < Math.floor(Math.random() * 41) + 60; i++) {
      const vitalType = ['blood_pressure', 'heart_rate', 'temperature', 'weight', 'height', 'bmi', 'respiratory_rate', 'oxygen_saturation'][Math.floor(Math.random() * 8)];
      let value, unit;
      
      switch (vitalType) {
        case 'blood_pressure':
          value = `${Math.floor(Math.random() * 30) + 110}/${Math.floor(Math.random() * 20) + 70}`;
          unit = 'mmHg';
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 50) + 55;
          unit = 'bpm';
          break;
        case 'temperature':
          value = (Math.random() * 1.5 + 97.5).toFixed(1);
          unit = '°F';
          break;
        case 'weight':
          value = (Math.random() * 50 + 120).toFixed(1);
          unit = 'lbs';
          break;
        case 'height':
          value = (Math.random() * 12 + 60).toFixed(0);
          unit = 'inches';
          break;
        case 'bmi':
          value = (Math.random() * 10 + 22).toFixed(1);
          unit = 'kg/m²';
          break;
        case 'respiratory_rate':
          value = Math.floor(Math.random() * 8) + 12;
          unit = 'breaths/min';
          break;
        case 'oxygen_saturation':
          value = Math.floor(Math.random() * 5) + 94;
          unit = '%';
          break;
        default:
          value = Math.random() * 50 + 70;
          unit = 'units';
      }
      
      data.vitalSigns.push({
        id: `vital-${Date.now()}-${i}`,
        type: vitalType,
        value: value,
        unit: unit,
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        location: ['Office', 'Home', 'Hospital', 'Telehealth'][Math.floor(Math.random() * 4)],
        measuredBy: ['Nurse', 'Patient', 'Device', 'Clinician'][Math.floor(Math.random() * 4)]
      });
    }

    // Add TONS of activities (50-80 per patient)
    const activities = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength Training', 'Elliptical', 'Rowing', 'Dancing', 'Hiking', 'Tennis', 'Basketball'];
    for (let i = 0; i < Math.floor(Math.random() * 31) + 50; i++) {
      data.activities.push({
        id: `activity-${Date.now()}-${i}`,
        type: activities[Math.floor(Math.random() * activities.length)],
        duration: Math.floor(Math.random() * 90) + 15,
        calories: Math.floor(Math.random() * 400) + 100,
        distance: (Math.random() * 5 + 1).toFixed(1),
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        intensity: ['Low', 'Moderate', 'High', 'Very High'][Math.floor(Math.random() * 4)]
      });
    }

    // Add TONS of sleep data (90-120 entries - daily for months)
    for (let i = 0; i < Math.floor(Math.random() * 31) + 90; i++) {
      data.sleepData.push({
        id: `sleep-${Date.now()}-${i}`,
        duration: (Math.random() * 3 + 6).toFixed(1),
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
        deepSleep: (Math.random() * 2 + 1).toFixed(1),
        remSleep: (Math.random() * 2 + 1).toFixed(1),
        lightSleep: (Math.random() * 3 + 2).toFixed(1),
        awakenings: Math.floor(Math.random() * 5),
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        device: deviceTypes[Math.floor(Math.random() * deviceTypes.length)]
      });
    }

    // Add TONS of nutrition data (80-120 entries)
    for (let i = 0; i < Math.floor(Math.random() * 41) + 80; i++) {
      data.nutritionData.push({
        id: `nutrition-${Date.now()}-${i}`,
        calories: Math.floor(Math.random() * 1000) + 1200,
        carbs: Math.floor(Math.random() * 120) + 50,
        protein: Math.floor(Math.random() * 100) + 40,
        fat: Math.floor(Math.random() * 80) + 20,
        fiber: Math.floor(Math.random() * 30) + 10,
        sodium: Math.floor(Math.random() * 2000) + 1500,
        sugar: Math.floor(Math.random() * 80) + 20,
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        mealType: ['Breakfast', 'Lunch', 'Dinner', 'Snack'][Math.floor(Math.random() * 4)]
      });
    }

    // Add TONS of symptoms (30-50 entries)
    const symptoms = ['Fatigue', 'Headache', 'Dizziness', 'Nausea', 'Shortness of breath', 'Chest pain', 'Joint pain', 'Muscle aches', 'Fever', 'Cough', 'Sore throat', 'Abdominal pain', 'Back pain', 'Insomnia', 'Anxiety'];
    for (let i = 0; i < Math.floor(Math.random() * 21) + 30; i++) {
      data.symptoms.push({
        id: `symptom-${Date.now()}-${i}`,
        description: symptoms[Math.floor(Math.random() * symptoms.length)],
        severity: Math.floor(Math.random() * 5) + 1,
        duration: ['Acute', 'Chronic', 'Intermittent'][Math.floor(Math.random() * 3)],
        date: generateRandomDate('2023-06-01', new Date()).toISOString(),
        triggers: ['Stress', 'Activity', 'Food', 'Weather', 'None'][Math.floor(Math.random() * 5)],
        impact: ['Mild', 'Moderate', 'Severe'][Math.floor(Math.random() * 3)]
      });
    }

    // Add TONS of appointments (15-25 per patient)
    for (let i = 0; i < Math.floor(Math.random() * 11) + 15; i++) {
      data.appointments.push({
        id: `appt-${Date.now()}-${i}`,
        date: generateRandomDate('2023-06-01', '2024-12-31').toISOString(),
        provider: clinicians[Math.floor(Math.random() * clinicians.length)],
        type: ['Follow-up', 'Consultation', 'Procedure', 'Lab Work', 'Imaging', 'Specialist Visit'][Math.floor(Math.random() * 6)],
        status: ['scheduled', 'completed', 'cancelled', 'no-show'][Math.floor(Math.random() * 4)],
        location: ['Main Clinic', 'Satellite Office', 'Hospital', 'Telehealth'][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 30) + 15,
        reason: ['Routine follow-up', 'Symptom evaluation', 'Medication review', 'Lab results review'][Math.floor(Math.random() * 4)]
      });
    }

    // Save all data
    flowbase.savePatientData(patientId, data);
    console.log(`✓ Seeded data for patient ${patientId}`);
  });
}

module.exports = { generateSeedData };

