// FlowBase AI Agent - Scrapes and formats patient data for CSV export
class FlowBaseAgent {
  constructor(openaiApiKey) {
    this.apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
  }

  async formatDataForCSV(patientData) {
    if (!this.apiKey) {
      // Fallback to structured formatting without AI
      return this.formatDataStructured(patientData);
    }

    try {
      const prompt = this.buildPrompt(patientData);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: `You are a medical data formatting specialist. Your task is to analyze patient data from FlowBase and format it into a standardized CSV structure. 
              
The CSV should have the following columns:
- Date/Time, Data Source, Data Type, Value, Unit, Category, Notes, Provider/Device

Organize the data chronologically and group related entries logically. Include all relevant information from:
- Clinician notes
- Wearable device data
- EMR data
- EHR data
- Medications
- Lab results
- Vital signs
- Activities
- Sleep data
- Nutrition data
- Symptoms
- Appointments

Return ONLY the CSV content, with proper headers and comma-separated values.`
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const csvContent = data.choices[0].message.content.trim();
      
      // Clean up the response (remove markdown code blocks if present)
      return csvContent.replace(/```csv\n?/g, '').replace(/```\n?/g, '').trim();
    } catch (error) {
      console.error('AI formatting error, using structured fallback:', error);
      return this.formatDataStructured(patientData);
    }
  }

  buildPrompt(patientData) {
    return `Format the following patient data into a standardized CSV:

Patient ID: ${patientData.patientId}
Created: ${patientData.createdAt}
Last Updated: ${patientData.updatedAt}

Clinician Notes (${patientData.clinicianNotes?.length || 0} entries):
${JSON.stringify(patientData.clinicianNotes || [], null, 2)}

Wearable Data (${patientData.wearableData?.length || 0} entries):
${JSON.stringify(patientData.wearableData || [], null, 2)}

EMR Data (${patientData.emrData?.length || 0} entries):
${JSON.stringify(patientData.emrData || [], null, 2)}

EHR Data (${patientData.ehrData?.length || 0} entries):
${JSON.stringify(patientData.ehrData || [], null, 2)}

Medications (${patientData.medications?.length || 0} entries):
${JSON.stringify(patientData.medications || [], null, 2)}

Lab Results (${patientData.labResults?.length || 0} entries):
${JSON.stringify(patientData.labResults || [], null, 2)}

Vital Signs (${patientData.vitalSigns?.length || 0} entries):
${JSON.stringify(patientData.vitalSigns || [], null, 2)}

Activities (${patientData.activities?.length || 0} entries):
${JSON.stringify(patientData.activities || [], null, 2)}

Sleep Data (${patientData.sleepData?.length || 0} entries):
${JSON.stringify(patientData.sleepData || [], null, 2)}

Nutrition Data (${patientData.nutritionData?.length || 0} entries):
${JSON.stringify(patientData.nutritionData || [], null, 2)}

Symptoms (${patientData.symptoms?.length || 0} entries):
${JSON.stringify(patientData.symptoms || [], null, 2)}

Appointments (${patientData.appointments?.length || 0} entries):
${JSON.stringify(patientData.appointments || [], null, 2)}

Format all this data into a comprehensive CSV with proper headers.`;
  }

  formatDataStructured(patientData) {
    const rows = [];
    
    // Header
    rows.push('Date/Time,Data Source,Data Type,Value,Unit,Category,Notes,Provider/Device');
    
    // Helper function to add rows
    const addRows = (items, source, category) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach(item => {
        const date = item.timestamp || item.date || '';
        const dataType = item.dataType || item.type || category;
        const value = item.value !== undefined ? item.value : (item.content || '');
        const unit = item.unit || '';
        const notes = item.content || item.notes || item.description || '';
        const provider = item.provider || item.clinician || item.deviceType || item.deviceId || '';
        
        rows.push(`"${date}","${source}","${dataType}","${value}","${unit}","${category}","${notes}","${provider}"`);
      });
    };
    
    // Add all data types
    addRows(patientData.clinicianNotes, 'Clinician Note', 'Note');
    addRows(patientData.wearableData, 'Wearable Device', 'Wearable');
    addRows(patientData.emrData, 'EMR', 'EMR');
    addRows(patientData.ehrData, 'EHR', 'EHR');
    addRows(patientData.medications, 'Medication', 'Medication');
    addRows(patientData.labResults, 'Lab Result', 'Lab');
    addRows(patientData.vitalSigns, 'Vital Sign', 'Vital');
    addRows(patientData.activities, 'Activity', 'Activity');
    addRows(patientData.sleepData, 'Sleep', 'Sleep');
    addRows(patientData.nutritionData, 'Nutrition', 'Nutrition');
    addRows(patientData.symptoms, 'Symptom', 'Symptom');
    addRows(patientData.appointments, 'Appointment', 'Appointment');
    
    return rows.join('\n');
  }
}

module.exports = FlowBaseAgent;

