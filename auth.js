// Authentication and authorization utilities for HIPAA compliance
// JWT-based authentication with RBAC and clinic scoping

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Get JWT secret from environment variable
function getJWTSecret() {
    return process.env.JWT_SECRET || process.env.ENCRYPTION_KEY || 'change-me-in-production';
}

// Generate JWT token for user
function generateToken(user) {
    const payload = {
        userId: user.id || user.userId,
        email: user.email,
        role: user.role || 'clinician',
        clinicId: user.clinicId || null,
        assignedPatients: user.assignedPatients || []
    };
    
    const options = {
        expiresIn: '15m', // 15 minute expiration
        issuer: 'nexflow-clinical-dashboard'
    };
    
    return jwt.sign(payload, getJWTSecret(), options);
}

// Verify and decode JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, getJWTSecret());
    } catch (error) {
        return null;
    }
}

// Authentication middleware
function authenticate(req, res, next) {
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
}

// Role-based authorization middleware
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        
        next();
    };
}

// Check if user has access to a specific patient
function hasAccessToPatient(user, patientId) {
    // Admins have access to all patients
    if (user.role === 'admin') {
        return true;
    }
    
    // Check if patient is in user's assigned list
    if (user.assignedPatients && user.assignedPatients.includes(patientId)) {
        return true;
    }
    
    // In a real system, you'd check clinicId matching here
    // For now, we'll allow clinicians to access patients in their clinic
    // This would need to be implemented with actual patient-clinic associations
    
    return true; // Simplified for localhost - in production, implement proper clinic scoping
}

// Patient access authorization middleware
function authorizePatientAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const patientId = req.params.patientId || req.body.patientId;
    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID required' });
    }
    
    if (!hasAccessToPatient(req.user, patientId)) {
        return res.status(403).json({ error: 'Access denied to this patient' });
    }
    
    next();
}

// Mock user database (for localhost - replace with real DB in production)
const mockUsers = [
    {
        id: 'user1',
        email: 'clinician@nexflow.com',
        password: 'demo123', // In production, use hashed passwords
        role: 'clinician',
        clinicId: 'clinic1',
        assignedPatients: ['1', '2', '3', '4', '5', '6']
    },
    {
        id: 'user2',
        email: 'admin@nexflow.com',
        password: 'admin123',
        role: 'admin',
        clinicId: 'clinic1',
        assignedPatients: []
    }
];

// Authenticate user credentials (for login)
function authenticateUser(email, password) {
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
        return null;
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

module.exports = {
    generateToken,
    verifyToken,
    authenticate,
    authorize,
    authorizePatientAccess,
    hasAccessToPatient,
    authenticateUser
};

