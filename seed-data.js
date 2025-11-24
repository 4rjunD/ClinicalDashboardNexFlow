// Seed FlowBase with random patient data
const FlowBase = require('./flowbase');

function generateRandomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateSeedData(flowbase, patientIds) {
  const deviceTypes = ['Apple Watch', 'Fitbit', 'Garmin', 'Samsung Health', 'Oura Ring', 'Whoop', 'Polar', 'Withings', 'Xiaomi Mi Band', 'Amazfit', 'Coros', 'Suunto'];
  const dataTypes = [
    'steps', 'heart_rate', 'blood_pressure', 'sleep', 'calories', 'spo2', 'glucose', 
    'temperature', 'respiratory_rate', 'activity_minutes', 'distance', 'elevation_gain',
    'active_calories', 'resting_heart_rate', 'max_heart_rate', 'heart_rate_variability',
    'vo2_max', 'stress_level', 'body_battery', 'recovery_score', 'hydration', 'menstrual_cycle',
    'workout_duration', 'running_pace', 'cycling_power', 'swimming_strokes', 'gym_reps',
    'weight', 'body_fat', 'muscle_mass', 'bone_density', 'bmi', 'waist_circumference'
  ];
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

    // Generate TONS of diverse wearable data (150-250 entries per patient - multiple readings per day)
    const numWearable = Math.floor(Math.random() * 101) + 150;
    for (let i = 0; i < numWearable; i++) {
      const dataDate = generateRandomDate('2023-06-01', new Date());
      const dataType = dataTypes[Math.floor(Math.random() * dataTypes.length)];
      const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
      
      let value, unit, metadata = {};
      switch (dataType) {
        case 'steps':
          value = Math.floor(Math.random() * 15000) + 3000;
          unit = 'steps';
          metadata = { goal: 10000, achievement: (value / 10000 * 100).toFixed(1) + '%' };
          break;
        case 'heart_rate':
          value = Math.floor(Math.random() * 50) + 55;
          unit = 'bpm';
          metadata = { zone: value < 100 ? 'resting' : value < 140 ? 'fat_burn' : value < 170 ? 'cardio' : 'peak' };
          break;
        case 'blood_pressure':
          value = `${Math.floor(Math.random() * 30) + 110}/${Math.floor(Math.random() * 20) + 70}`;
          unit = 'mmHg';
          metadata = { position: ['sitting', 'standing', 'lying'][Math.floor(Math.random() * 3)] };
          break;
        case 'sleep':
          value = (Math.random() * 3 + 6).toFixed(1);
          unit = 'hours';
          metadata = { quality_score: Math.floor(Math.random() * 40) + 60, rem_minutes: Math.floor(Math.random() * 120) + 60 };
          break;
        case 'calories':
          value = Math.floor(Math.random() * 1200) + 1400;
          unit = 'kcal';
          metadata = { bmr: Math.floor(Math.random() * 300) + 1400, active: value - 1400 };
          break;
        case 'spo2':
          value = Math.floor(Math.random() * 5) + 94;
          unit = '%';
          metadata = { altitude: Math.floor(Math.random() * 2000), reading_quality: 'good' };
          break;
        case 'glucose':
          value = Math.floor(Math.random() * 60) + 80;
          unit = 'mg/dL';
          metadata = { meal_context: ['fasting', 'post_meal', 'pre_meal'][Math.floor(Math.random() * 3)], time_since_meal: Math.floor(Math.random() * 300) };
          break;
        case 'temperature':
          value = (Math.random() * 1.5 + 97.5).toFixed(1);
          unit = '°F';
          metadata = { measurement_site: ['wrist', 'forehead', 'ear'][Math.floor(Math.random() * 3)] };
          break;
        case 'respiratory_rate':
          value = Math.floor(Math.random() * 8) + 12;
          unit = 'breaths/min';
          metadata = { activity_level: ['resting', 'light', 'moderate'][Math.floor(Math.random() * 3)] };
          break;
        case 'activity_minutes':
          value = Math.floor(Math.random() * 120) + 30;
          unit = 'minutes';
          metadata = { intensity: ['low', 'moderate', 'high'][Math.floor(Math.random() * 3)] };
          break;
        case 'distance':
          value = (Math.random() * 10 + 2).toFixed(2);
          unit = 'miles';
          metadata = { activity_type: ['walking', 'running', 'cycling'][Math.floor(Math.random() * 3)] };
          break;
        case 'elevation_gain':
          value = Math.floor(Math.random() * 2000);
          unit = 'feet';
          metadata = { route_type: ['trail', 'road', 'treadmill'][Math.floor(Math.random() * 3)] };
          break;
        case 'active_calories':
          value = Math.floor(Math.random() * 600) + 200;
          unit = 'kcal';
          metadata = { workout_type: ['cardio', 'strength', 'mixed'][Math.floor(Math.random() * 3)] };
          break;
        case 'resting_heart_rate':
          value = Math.floor(Math.random() * 20) + 50;
          unit = 'bpm';
          metadata = { trend: ['stable', 'improving', 'fluctuating'][Math.floor(Math.random() * 3)] };
          break;
        case 'max_heart_rate':
          value = Math.floor(Math.random() * 30) + 170;
          unit = 'bpm';
          metadata = { age_predicted_max: 220 - Math.floor(Math.random() * 30) + 30 };
          break;
        case 'heart_rate_variability':
          value = (Math.random() * 40 + 20).toFixed(1);
          unit = 'ms';
          metadata = { recovery_status: ['good', 'fair', 'poor'][Math.floor(Math.random() * 3)] };
          break;
        case 'vo2_max':
          value = (Math.random() * 20 + 30).toFixed(1);
          unit = 'ml/kg/min';
          metadata = { fitness_level: ['excellent', 'good', 'average'][Math.floor(Math.random() * 3)] };
          break;
        case 'stress_level':
          value = Math.floor(Math.random() * 50) + 25;
          unit = 'score';
          metadata = { stress_type: ['physical', 'mental', 'emotional'][Math.floor(Math.random() * 3)] };
          break;
        case 'body_battery':
          value = Math.floor(Math.random() * 60) + 40;
          unit = 'score';
          metadata = { energy_level: value > 70 ? 'high' : value > 40 ? 'medium' : 'low' };
          break;
        case 'recovery_score':
          value = Math.floor(Math.random() * 40) + 60;
          unit = 'score';
          metadata = { recovery_status: value > 80 ? 'optimal' : value > 60 ? 'good' : 'needs_rest' };
          break;
        case 'hydration':
          value = Math.floor(Math.random() * 40) + 60;
          unit = '%';
          metadata = { water_intake_ml: Math.floor(Math.random() * 2000) + 1000 };
          break;
        case 'menstrual_cycle':
          value = Math.floor(Math.random() * 28) + 1;
          unit = 'day';
          metadata = { phase: ['follicular', 'ovulation', 'luteal', 'menstrual'][Math.floor(Math.random() * 4)] };
          break;
        case 'workout_duration':
          value = Math.floor(Math.random() * 90) + 20;
          unit = 'minutes';
          metadata = { workout_name: ['Morning Run', 'Evening Walk', 'Gym Session', 'Yoga Class'][Math.floor(Math.random() * 4)] };
          break;
        case 'running_pace':
          value = (Math.random() * 3 + 7).toFixed(1);
          unit = 'min/mile';
          metadata = { terrain: ['flat', 'hilly', 'trail'][Math.floor(Math.random() * 3)] };
          break;
        case 'cycling_power':
          value = Math.floor(Math.random() * 200) + 100;
          unit = 'watts';
          metadata = { cadence: Math.floor(Math.random() * 40) + 70 };
          break;
        case 'swimming_strokes':
          value = Math.floor(Math.random() * 1000) + 500;
          unit = 'strokes';
          metadata = { stroke_type: ['freestyle', 'backstroke', 'breaststroke', 'butterfly'][Math.floor(Math.random() * 4)] };
          break;
        case 'gym_reps':
          value = Math.floor(Math.random() * 15) + 5;
          unit = 'reps';
          metadata = { exercise: ['bench_press', 'squats', 'deadlift', 'pull_ups'][Math.floor(Math.random() * 4)], weight_lbs: Math.floor(Math.random() * 100) + 50 };
          break;
        case 'weight':
          value = (Math.random() * 30 + 140).toFixed(1);
          unit = 'lbs';
          metadata = { body_fat_percent: (Math.random() * 15 + 15).toFixed(1) };
          break;
        case 'body_fat':
          value = (Math.random() * 15 + 15).toFixed(1);
          unit = '%';
          metadata = { measurement_method: ['bioimpedance', 'caliper', 'dexa'][Math.floor(Math.random() * 3)] };
          break;
        case 'muscle_mass':
          value = (Math.random() * 30 + 100).toFixed(1);
          unit = 'lbs';
          metadata = { lean_body_mass: (value * 0.85).toFixed(1) };
          break;
        case 'bone_density':
          value = (Math.random() * 0.3 + 1.0).toFixed(2);
          unit = 'g/cm²';
          metadata = { t_score: (Math.random() * 1.5 - 0.5).toFixed(1) };
          break;
        case 'bmi':
          value = (Math.random() * 10 + 22).toFixed(1);
          unit = 'kg/m²';
          metadata = { category: value < 18.5 ? 'underweight' : value < 25 ? 'normal' : value < 30 ? 'overweight' : 'obese' };
          break;
        case 'waist_circumference':
          value = (Math.random() * 10 + 32).toFixed(1);
          unit = 'inches';
          metadata = { health_risk: value > 40 ? 'high' : value > 35 ? 'moderate' : 'low' };
          break;
        default:
          value = Math.floor(Math.random() * 100);
          unit = 'units';
          metadata = { note: 'custom_measurement' };
      }

      flowbase.addWearableData(patientId, {
        deviceType: deviceType,
        deviceId: `device-${Math.floor(Math.random() * 1000)}`,
        dataType: dataType,
        value: value,
        unit: unit,
        timestamp: dataDate.toISOString(),
        metadata: {
          syncMethod: ['automatic', 'manual', 'scheduled'][Math.floor(Math.random() * 3)],
          quality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)],
          battery_level: Math.floor(Math.random() * 40) + 60,
          firmware_version: `v${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
          ...metadata
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

    // Add TONS of diverse activities (80-120 per patient with varied data)
    const activities = ['Walking', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Strength Training', 'Elliptical', 'Rowing', 'Dancing', 'Hiking', 'Tennis', 'Basketball', 'Pilates', 'CrossFit', 'Rock Climbing', 'Martial Arts', 'Golf', 'Skiing'];
    for (let i = 0; i < Math.floor(Math.random() * 41) + 80; i++) {
      const activityType = activities[Math.floor(Math.random() * activities.length)];
      const activityDate = generateRandomDate('2023-06-01', new Date());
      
      // Create varied activity entries
      const baseActivity = {
        id: `activity-${Date.now()}-${i}`,
        type: activityType,
        duration: Math.floor(Math.random() * 90) + 15,
        calories: Math.floor(Math.random() * 400) + 100,
        date: activityDate.toISOString(),
        intensity: ['Low', 'Moderate', 'High', 'Very High'][Math.floor(Math.random() * 4)],
        heart_rate_avg: Math.floor(Math.random() * 50) + 120,
        heart_rate_max: Math.floor(Math.random() * 30) + 150
      };
      
      // Add activity-specific data
      if (['Running', 'Walking', 'Cycling', 'Hiking'].includes(activityType)) {
        baseActivity.distance = (Math.random() * 10 + 1).toFixed(2);
        baseActivity.pace = (Math.random() * 3 + 7).toFixed(1) + ' min/mile';
        baseActivity.elevation_gain = Math.floor(Math.random() * 500);
      }
      
      if (['Swimming'].includes(activityType)) {
        baseActivity.laps = Math.floor(Math.random() * 40) + 10;
        baseActivity.strokes = Math.floor(Math.random() * 2000) + 1000;
        baseActivity.pool_length = ['25m', '50m'][Math.floor(Math.random() * 2)];
      }
      
      if (['Strength Training', 'CrossFit'].includes(activityType)) {
        baseActivity.exercises = [
          { name: 'Bench Press', sets: 3, reps: 10, weight: 135 },
          { name: 'Squats', sets: 3, reps: 12, weight: 185 },
          { name: 'Deadlift', sets: 3, reps: 8, weight: 225 }
        ];
        baseActivity.total_volume = Math.floor(Math.random() * 5000) + 2000;
      }
      
      if (['Yoga', 'Pilates'].includes(activityType)) {
        baseActivity.poses = ['Downward Dog', 'Warrior', 'Tree Pose', 'Child\'s Pose'];
        baseActivity.flexibility_score = Math.floor(Math.random() * 30) + 70;
      }
      
      data.activities.push(baseActivity);
    }

    // Add TONS of diverse sleep data (120-180 entries - daily for months with varied metrics)
    for (let i = 0; i < Math.floor(Math.random() * 61) + 120; i++) {
      const sleepDate = generateRandomDate('2023-06-01', new Date());
      const duration = parseFloat((Math.random() * 3 + 6).toFixed(1));
      
      data.sleepData.push({
        id: `sleep-${Date.now()}-${i}`,
        duration: duration,
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
        deepSleep: (Math.random() * 2 + 1).toFixed(1),
        remSleep: (Math.random() * 2 + 1).toFixed(1),
        lightSleep: (Math.random() * 3 + 2).toFixed(1),
        awakenings: Math.floor(Math.random() * 5),
        date: sleepDate.toISOString(),
        device: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        sleep_score: Math.floor(Math.random() * 40) + 60,
        time_to_sleep: Math.floor(Math.random() * 30) + 10,
        sleep_efficiency: ((duration / (duration + Math.random() * 1)) * 100).toFixed(1),
        bedtime: `${Math.floor(Math.random() * 3) + 21}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        wake_time: `${Math.floor(Math.random() * 3) + 6}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        sleep_stages: {
          awake: (Math.random() * 30 + 10).toFixed(0),
          light: (duration * 0.5).toFixed(1),
          deep: (duration * 0.2).toFixed(1),
          rem: (duration * 0.25).toFixed(1)
        },
        environmental: {
          room_temp: (Math.random() * 5 + 65).toFixed(1),
          noise_level: ['quiet', 'moderate', 'loud'][Math.floor(Math.random() * 3)],
          light_level: ['dark', 'dim', 'bright'][Math.floor(Math.random() * 3)]
        },
        notes: Math.random() > 0.7 ? ['Felt rested', 'Tossed and turned', 'Woke up early', 'Slept through night'][Math.floor(Math.random() * 4)] : null
      });
    }

    // Add TONS of diverse nutrition data (100-150 entries with varied formats)
    for (let i = 0; i < Math.floor(Math.random() * 51) + 100; i++) {
      const mealType = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'][Math.floor(Math.random() * 6)];
      const mealDate = generateRandomDate('2023-06-01', new Date());
      
      // Sometimes add detailed meal breakdown, sometimes just summary
      if (Math.random() > 0.5) {
        // Detailed meal entry
        data.nutritionData.push({
          id: `nutrition-${Date.now()}-${i}`,
          calories: Math.floor(Math.random() * 1000) + 1200,
          carbs: Math.floor(Math.random() * 120) + 50,
          protein: Math.floor(Math.random() * 100) + 40,
          fat: Math.floor(Math.random() * 80) + 20,
          fiber: Math.floor(Math.random() * 30) + 10,
          sodium: Math.floor(Math.random() * 2000) + 1500,
          sugar: Math.floor(Math.random() * 80) + 20,
          date: mealDate.toISOString(),
          mealType: mealType,
          foods: [
            { name: ['Chicken Breast', 'Salmon', 'Tofu', 'Eggs'][Math.floor(Math.random() * 4)], amount: '200g', calories: Math.floor(Math.random() * 300) + 200 },
            { name: ['Brown Rice', 'Quinoa', 'Sweet Potato', 'Pasta'][Math.floor(Math.random() * 4)], amount: '150g', calories: Math.floor(Math.random() * 200) + 150 },
            { name: ['Broccoli', 'Spinach', 'Carrots', 'Bell Peppers'][Math.floor(Math.random() * 4)], amount: '100g', calories: Math.floor(Math.random() * 50) + 25 }
          ],
          logged_via: ['app', 'manual', 'barcode_scan'][Math.floor(Math.random() * 3)],
          meal_rating: Math.floor(Math.random() * 5) + 1
        });
      } else {
        // Simple summary entry
        data.nutritionData.push({
          id: `nutrition-${Date.now()}-${i}`,
          calories: Math.floor(Math.random() * 1000) + 1200,
          carbs: Math.floor(Math.random() * 120) + 50,
          protein: Math.floor(Math.random() * 100) + 40,
          fat: Math.floor(Math.random() * 80) + 20,
          date: mealDate.toISOString(),
          mealType: mealType,
          note: ['Home cooked', 'Restaurant', 'Fast food', 'Meal prep'][Math.floor(Math.random() * 4)]
        });
      }
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

