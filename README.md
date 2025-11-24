# Clinical Dashboard NexFlow

A clinical dashboard application with disease-specific GPT wrappers, EMR/EHR integrations, and patient risk scoring.

## Features

- **18 Disease-Specific GPT Wrappers**: Separate functions for diabetes, hypertension, heart disease, asthma, arthritis, and Parkinson's
- **EMR/EHR Integrations**: SMART on FHIR support for connecting to Electronic Medical Records and Electronic Health Records
- **Patient Risk Scoring**: AI-powered risk assessment with 6-week trajectory projections
- **Recommendations Engine**: Condition-specific clinical recommendations
- **Data Export**: CSV and PDF export functionality

## Deployment on Render

### Prerequisites

- GitHub repository connected to Render
- OpenAI API key (for GPT functionality)

### Render Configuration

When deploying on Render, use these settings:

**Service Type:** Web Service

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key (optional, can be set client-side)

**Instance Type:**
- **Free** tier is sufficient for development/testing
- **Starter** ($7/month) recommended for production use

**Region:**
- Choose based on your user base (Oregon is default)

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the dashboard at `http://localhost:3000`

## Project Structure

- `index.html` - Login page
- `clinical-dashboard.html` - Main dashboard interface
- `gpt.js` - GPT wrapper functions (18 disease-specific functions)
- `risk-model.js` - Risk scoring algorithms
- `server.js` - Express server for static file serving

## API Key Configuration

The application uses sessionStorage for API key management. To set the API key:

1. **Client-side (Browser Console):**
```javascript
sessionStorage.setItem('OPENAI_API_KEY', 'your-api-key-here');
```

2. **Environment Variable (Render):**
Set `OPENAI_API_KEY` in Render's environment variables section.

## License

MIT
