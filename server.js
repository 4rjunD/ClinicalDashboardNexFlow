const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const FlowBase = require('./flowbase');
const FlowBaseAgent = require('./flowbase-agent');
const { generateSeedData } = require('./seed-data');
const { authenticate, authorize, authorizePatientAccess, authenticateUser, generateToken, hasAccessToPatient } = require('./auth');
const { encryptPatientId, decryptPatientId } = require('./encryption');
const { auditMiddleware, auditAuth, auditModification } = require('./audit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

// HTTPS enforcement (allow HTTP on localhost for development)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    // Add HSTS header in production
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Audit logging middleware
app.use(auditMiddleware);

// Sanitize error responses
function sanitizeError(error, patientId = null) {
  let message = error.message || 'An error occurred';
  // Remove patient identifiers
  if (patientId) {
    message = message.replace(new RegExp(patientId, 'g'), '[REDACTED]');
  }
  // Remove file paths
  message = message.replace(/\/[^\s]+/g, '[PATH]');
  
  if (process.env.NODE_ENV === 'production') {
    return { error: 'An error occurred. Please contact support.' };
  }
  return { error: message };
}

// Initialize FlowBase
const flowbase = new FlowBase('./data');
const flowbaseAgent = new FlowBaseAgent(process.env.OPENAI_API_KEY);

// Seed data on first run (check for correct patient IDs)
// Use actual patient IDs from dashboard: '1', '2', '3', '4', '5', '6'
const patientIds = ['1', '2', '3', '4', '5', '6'];
const existingPatientIds = flowbase.getAllPatientIds();
const needsSeeding = existingPatientIds.length === 0 || 
                     !patientIds.every(id => existingPatientIds.includes(id));

if (needsSeeding) {
  console.log('Initializing FlowBase with seed data...');
  generateSeedData(flowbase, patientIds);
  console.log('✓ FlowBase seeded successfully');
} else {
  console.log(`FlowBase already has data for ${existingPatientIds.length} patients`);
}

// ============================================================================
// Authentication Endpoints
// ============================================================================

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = authenticateUser(email, password);
    if (!user) {
      auditAuth('LOGIN_FAILED', email, false, {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    
    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    auditAuth('LOGIN_SUCCESS', user.id, true, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    res.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json(sanitizeError(error));
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  if (req.user) {
    auditAuth('LOGOUT', req.user.userId, true, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }
  res.json({ success: true });
});

// Verify token endpoint
app.get('/api/auth/verify', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Route for root - serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Route for clinical dashboard (requires authentication)
app.get('/clinical-dashboard', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, 'clinical-dashboard.html'));
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// FlowBase API Endpoints
// ============================================================================

// Helper to add no-cache headers
function addNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// Get patient list (summary only - minimum necessary)
app.get('/api/flowbase/patients', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    const patientIds = flowbase.getAllPatientIds();
    
    // Return only summary data (minimum necessary)
    const summaries = patientIds.map(id => {
      const data = flowbase.getPatientData(id);
      return {
        encryptedId: encryptPatientId(id),
        healthConditions: data.healthConditions || [],
        lastUpdated: data.updatedAt ? new Date(data.updatedAt).toISOString() : null,
        recordCount: data.metadata?.totalRecords || 0
      };
    });
    
    res.json({ patients: summaries, count: summaries.length });
  } catch (error) {
    res.status(500).json(sanitizeError(error));
  }
});

// Get all patient data (full detail - requires patient access authorization)
app.get('/api/flowbase/patient/:encryptedPatientId', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    // Decrypt patient ID
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const data = flowbase.getAllPatientData(patientId);
    res.json(data);
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Add clinician note
app.post('/api/flowbase/patient/:encryptedPatientId/note', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    // Decrypt patient ID
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const note = flowbase.addClinicianNote(patientId, req.body);
    
    auditModification('NOTE_ADDED', req.user.userId, patientId, 'ADD_CLINICIAN_NOTE', {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Add wearable data
app.post('/api/flowbase/patient/:encryptedPatientId/wearable', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const entry = flowbase.addWearableData(patientId, req.body);
    
    auditModification('WEARABLE_ADDED', req.user.userId, patientId, 'ADD_WEARABLE_DATA', {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Add EMR data
app.post('/api/flowbase/patient/:encryptedPatientId/emr', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const entry = flowbase.addEMRData(patientId, req.body);
    
    auditModification('EMR_ADDED', req.user.userId, patientId, 'ADD_EMR_DATA', {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Add EHR data
app.post('/api/flowbase/patient/:encryptedPatientId/ehr', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const entry = flowbase.addEHRData(patientId, req.body);
    
    auditModification('EHR_ADDED', req.user.userId, patientId, 'ADD_EHR_DATA', {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
    
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Demo endpoint for CSV export (no auth required for localhost demo)
// ⚠️ DISABLED IN PRODUCTION - Only available on localhost for development
app.get('/api/flowbase/demo/patient/:patientId/export/csv', (req, res) => {
  // Disable demo endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Demo endpoints disabled in production' });
  }
  
  // Only allow on localhost
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.hostname === '::1';
  if (!isLocalhost) {
    return res.status(403).json({ error: 'Demo endpoints only available on localhost' });
  }
  
  (async () => {
    try {
      addNoCacheHeaders(res);
      
      // For demo mode, accept plain patient IDs
      const patientId = req.params.patientId;
      
      // Validate patient ID is numeric (demo mode uses '1', '2', etc.)
      if (!/^\d+$/.test(patientId)) {
        return res.status(400).json({ error: 'Invalid patient identifier' });
      }
      
      const patientData = flowbase.getAllPatientData(patientId);
      
      // Check if patient has data
      const totalRecords = patientData.metadata?.totalRecords || 0;
      if (totalRecords === 0) {
        // Return empty CSV with headers
        const emptyCsv = 'Date/Time,Data Source,Data Type,Value,Unit,Category,Notes,Provider/Device\n';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="patient-export-${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(emptyCsv);
      }
      
      // Use AI agent to format data
      const csvContent = await flowbaseAgent.formatDataForCSV(patientData);
      
      // Verify CSV has content
      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error('CSV content is empty');
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patient-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      res.status(500).json(sanitizeError(error, req.params.patientId));
    }
  })();
});

// Export patient data as CSV (using AI agent)
app.get('/api/flowbase/patient/:encryptedPatientId/export/csv', authenticate, authorize('clinician', 'admin'), async (req, res) => {
  try {
    addNoCacheHeaders(res);
    
    // Decrypt patient ID
    let patientId;
    try {
      patientId = decryptPatientId(req.params.encryptedPatientId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid patient identifier' });
    }
    
    // Check authorization
    if (!hasAccessToPatient(req.user, patientId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const patientData = flowbase.getAllPatientData(patientId);
    
    // Check if patient has data
    const totalRecords = patientData.metadata?.totalRecords || 0;
    if (totalRecords === 0) {
      // Return empty CSV with headers
      const emptyCsv = 'Date/Time,Data Source,Data Type,Value,Unit,Category,Notes,Provider/Device\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="patient-export-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(emptyCsv);
    }
    
    // Use AI agent to format data
    const csvContent = await flowbaseAgent.formatDataForCSV(patientData);
    
    // Verify CSV has content
    if (!csvContent || csvContent.trim().length === 0) {
      throw new Error('CSV content is empty');
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="patient-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json(sanitizeError(error, req.params.encryptedPatientId));
  }
});

// Get FlowBase stats (summary only)
app.get('/api/flowbase/stats', authenticate, authorize('clinician', 'admin'), (req, res) => {
  try {
    addNoCacheHeaders(res);
    const patientIds = flowbase.getAllPatientIds();
    const stats = {
      totalPatients: patientIds.length,
      totalRecords: 0,
      patients: patientIds.map(id => {
        const data = flowbase.getPatientData(id);
        return {
          encryptedId: encryptPatientId(id),
          recordCount: data.metadata?.totalRecords || 0,
          lastUpdated: data.updatedAt ? new Date(data.updatedAt).toISOString() : null
        };
      })
    };
    stats.totalRecords = stats.patients.reduce((sum, p) => sum + p.recordCount, 0);
    res.json(stats);
  } catch (error) {
    res.status(500).json(sanitizeError(error));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Clinical Dashboard server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}`);
  console.log(`FlowBase API available at http://localhost:${PORT}/api/flowbase`);
  console.log(`\n⚠️  HIPAA Compliance Mode Active`);
  console.log(`   - Authentication required for all PHI endpoints`);
  console.log(`   - Patient data encrypted at rest`);
  console.log(`   - All OpenAI calls use de-identified data`);
  console.log(`   - Audit logging enabled`);
});

