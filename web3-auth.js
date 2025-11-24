// Web3 Authentication Utility
// This file handles Web3 wallet connections and authentication

// Check if we're on localhost
function isLocalhost() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '0.0.0.0';
}

// API URL configuration
const API_BASE_URL = isLocalhost() ? 'http://localhost:10000/' : 'https://api.nexflowai.app/';

// Web3 connection state
let web3Provider = null;
let signer = null;
let userAddress = null;

// Initialize Web3
async function initWeb3() {
    if (typeof window.ethereum !== 'undefined' && typeof ethers !== 'undefined') {
        try {
            // Use ethers v5 API (BrowserProvider is v6, Web3Provider is v5)
            web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            signer = web3Provider.getSigner();
            userAddress = await signer.getAddress();
            return { connected: true, address: userAddress };
        } catch (error) {
            console.error('Error initializing Web3:', error);
            return { connected: false, error: error.message };
        }
    } else {
        return { connected: false, error: 'MetaMask or Web3 wallet not found. Please install MetaMask.' };
    }
}

// Connect wallet
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Initialize Web3
        const result = await initWeb3();
        if (!result.connected) {
            throw new Error(result.error || 'Failed to connect wallet');
        }

        return {
            address: userAddress,
            provider: web3Provider,
            signer: signer
        };
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
}

// Sign message for authentication
async function signMessage(message) {
    if (!signer) {
        throw new Error('Wallet not connected');
    }

    try {
        const signature = await signer.signMessage(message);
        return signature;
    } catch (error) {
        console.error('Error signing message:', error);
        throw error;
    }
}

// Web3 Login
async function web3Login(role = 'patient') {
    try {
        // Connect wallet
        const wallet = await connectWallet();
        if (!wallet.address) {
            throw new Error('Failed to get wallet address');
        }

        // Create authentication message
        const timestamp = Date.now();
        const message = `NexFlow Authentication\n\nAddress: ${wallet.address}\nRole: ${role}\nTimestamp: ${timestamp}`;

        // Sign message
        const signature = await signMessage(message);

        // Send to backend for verification
        const response = await fetch(`${API_BASE_URL}/api/web3/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                address: wallet.address,
                signature: signature,
                message: message,
                role: role,
                timestamp: timestamp
            })
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                address: wallet.address,
                role: data.role || role,
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Web3 login error:', error);
        throw error;
    }
}

// Web3 Signup
async function web3Signup(name, role = 'patient', clinicId = null) {
    try {
        // Connect wallet
        const wallet = await connectWallet();
        if (!wallet.address) {
            throw new Error('Failed to get wallet address');
        }

        // Create signup message
        const timestamp = Date.now();
        const message = `NexFlow Signup\n\nAddress: ${wallet.address}\nName: ${name}\nRole: ${role}\nTimestamp: ${timestamp}`;

        // Sign message
        const signature = await signMessage(message);

        // Send to backend
        const body = {
            address: wallet.address,
            signature: signature,
            message: message,
            name: name,
            role: role,
            timestamp: timestamp
        };

        if (role === 'clinician' && clinicId) {
            body.clinic_id = clinicId;
        } else if (role === 'patient' && clinicId) {
            body.patient_signup_id = clinicId;
        }

        const response = await fetch(`${API_BASE_URL}/api/web3/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                address: wallet.address,
                role: data.role || role,
                user: data.user
            };
        } else {
            throw new Error(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Web3 signup error:', error);
        throw error;
    }
}

// Check if user is authenticated (Web3 or localhost bypass)
async function checkAuth() {
    // Localhost bypass
    if (isLocalhost()) {
        return {
            authenticated: true,
            isLocalhost: true,
            address: 'localhost-user',
            role: 'clinician' // Default to clinician for localhost
        };
    }

    // Check if wallet is connected
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                // Wallet is connected, verify with backend
                const response = await fetch(`${API_BASE_URL}/api/web3/session`, {
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated) {
                        return {
                            authenticated: true,
                            address: data.address,
                            role: data.role,
                            user: data.user
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    return { authenticated: false };
}

// Get current user info
async function getCurrentUser() {
    if (isLocalhost()) {
        return {
            address: 'localhost-user',
            role: 'clinician',
            name: 'Localhost User',
            isLocalhost: true
        };
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/web3/user`, {
            credentials: 'include'
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Get user error:', error);
    }

    return null;
}

// Logout
async function web3Logout() {
    if (isLocalhost()) {
        sessionStorage.clear();
        return;
    }

    try {
        await fetch(`${API_BASE_URL}/api/web3/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        sessionStorage.clear();
        userAddress = null;
        signer = null;
        web3Provider = null;
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.web3Auth = {
        initWeb3,
        connectWallet,
        web3Login,
        web3Signup,
        checkAuth,
        getCurrentUser,
        web3Logout,
        isLocalhost,
        API_BASE_URL
    };
}

