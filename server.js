const express = require('express');
const path = require('path');
const FlowBase = require('./flowbase');
const FlowBaseAgent = require('./flowbase-agent');
const { generateSeedData } = require('./seed-data');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Initialize FlowBase
const flowbase = new FlowBase('./data');
const flowbaseAgent = new FlowBaseAgent(process.env.OPENAI_API_KEY);

// Seed data on first run (only if data directory is empty)
const patientIds = ['P001', 'P002', 'P003', 'P004', 'P005'];
if (flowbase.getAllPatientIds().length === 0) {
  console.log('Initializing FlowBase with seed data...');
  generateSeedData(flowbase, patientIds);
  console.log('✓ FlowBase seeded successfully');
}

// Route for root - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for clinical dashboard
app.get('/clinical-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'clinical-dashboard.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// FlowBase API Endpoints
// ============================================================================

// Get all patient data
app.get('/api/flowbase/patient/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    const data = flowbase.getAllPatientData(patientId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add clinician note
app.post('/api/flowbase/patient/:patientId/note', (req, res) => {
  try {
    const { patientId } = req.params;
    const note = flowbase.addClinicianNote(patientId, req.body);
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add wearable data
app.post('/api/flowbase/patient/:patientId/wearable', (req, res) => {
  try {
    const { patientId } = req.params;
    const entry = flowbase.addWearableData(patientId, req.body);
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add EMR data
app.post('/api/flowbase/patient/:patientId/emr', (req, res) => {
  try {
    const { patientId } = req.params;
    const entry = flowbase.addEMRData(patientId, req.body);
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add EHR data
app.post('/api/flowbase/patient/:patientId/ehr', (req, res) => {
  try {
    const { patientId } = req.params;
    const entry = flowbase.addEHRData(patientId, req.body);
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export patient data as CSV (using AI agent)
app.get('/api/flowbase/patient/:patientId/export/csv', async (req, res) => {
  try {
    const { patientId } = req.params;
    const patientData = flowbase.getAllPatientData(patientId);
    
    // Use AI agent to format data
    const csvContent = await flowbaseAgent.formatDataForCSV(patientData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="patient-${patientId}-flowbase-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all patient IDs
app.get('/api/flowbase/patients', (req, res) => {
  try {
    const patientIds = flowbase.getAllPatientIds();
    res.json({ patientIds, count: patientIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get FlowBase stats
app.get('/api/flowbase/stats', (req, res) => {
  try {
    const patientIds = flowbase.getAllPatientIds();
    const stats = {
      totalPatients: patientIds.length,
      totalRecords: 0,
      patients: patientIds.map(id => {
        const data = flowbase.getPatientData(id);
        return {
          patientId: id,
          recordCount: data.metadata.totalRecords,
          lastUpdated: data.updatedAt
        };
      })
    };
    stats.totalRecords = stats.patients.reduce((sum, p) => sum + p.recordCount, 0);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Clinical Dashboard server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}`);
  console.log(`FlowBase API available at http://localhost:${PORT}/api/flowbase`);
});

