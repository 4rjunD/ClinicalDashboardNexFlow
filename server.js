const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

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

// Start server
app.listen(PORT, () => {
  console.log(`Clinical Dashboard server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}`);
});

