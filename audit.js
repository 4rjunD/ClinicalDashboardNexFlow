// Audit logging utility for HIPAA compliance
// Logs all PHI access and modifications without logging PHI values

const fs = require('fs');
const path = require('path');

const AUDIT_LOG_FILE = path.join(__dirname, 'audit.log');

// Ensure audit log file exists
function ensureAuditLog() {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
        fs.writeFileSync(AUDIT_LOG_FILE, '');
    }
}

// Sanitize data to remove PHI from log entries
function sanitizeForLog(data) {
    if (typeof data !== 'object' || data === null) {
        return '[REDACTED]';
    }
    
    const sanitized = {};
    const allowedFields = ['action', 'route', 'method', 'status', 'recordCount', 'dataType'];
    
    for (const key of allowedFields) {
        if (data[key] !== undefined) {
            sanitized[key] = data[key];
        }
    }
    
    return sanitized;
}

// Audit log entry structure
function auditLog(event, userId, patientId, action, details = {}) {
    ensureAuditLog();
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        userId: userId || 'unknown',
        patientId: patientId || null,
        action,
        details: sanitizeForLog(details),
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent || 'unknown'
    };
    
    // Append to audit log file (append-only)
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
    
    // Also log to console in development (without PHI)
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[AUDIT] ${event}: ${action} by ${userId}${patientId ? ` for patient ${patientId}` : ''}`);
    }
}

// Express middleware for automatic audit logging
function auditMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    
    // Override res.json to log after response
    res.json = function(data) {
        if (req.user && req.params.patientId) {
            auditLog(
                'PHI_ACCESS',
                req.user.userId,
                req.params.patientId,
                `${req.method} ${req.path}`,
                {
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('user-agent'),
                    status: res.statusCode,
                    recordCount: Array.isArray(data) ? data.length : (data.metadata?.totalRecords || null)
                }
            );
        }
        return originalJson(data);
    };
    
    // Override res.send for CSV exports
    res.send = function(data) {
        if (req.user && req.params.patientId && req.path.includes('export')) {
            auditLog(
                'PHI_EXPORT',
                req.user.userId,
                req.params.patientId,
                `EXPORT ${req.path}`,
                {
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('user-agent'),
                    exportType: req.path.includes('csv') ? 'CSV' : 'PDF'
                }
            );
        }
        return originalSend(data);
    };
    
    next();
}

// Log authentication events
function auditAuth(event, userId, success, details = {}) {
    auditLog(
        'AUTH',
        userId,
        null,
        event,
        {
            success,
            ipAddress: details.ipAddress,
            userAgent: details.userAgent
        }
    );
}

// Log data modification events
function auditModification(event, userId, patientId, action, details = {}) {
    auditLog(
        'PHI_MODIFICATION',
        userId,
        patientId,
        action,
        {
            modificationType: event,
            ipAddress: details.ipAddress,
            userAgent: details.userAgent
        }
    );
}

module.exports = {
    auditLog,
    auditMiddleware,
    auditAuth,
    auditModification
};

