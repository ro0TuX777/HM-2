// /static/js/device_management/services/dm_api.js

// Debug logging
function debug(...args) {
    if (CONFIG.DEBUG) {
        console.log('[API]:', ...args);
    }
}

// Configuration
const CONFIG = {
    API_BASE: '/api',
    DEBUG: true,
    TIMEOUT: 5000 // 5 seconds timeout
};

// Error handling helper
async function handleApiError(response, endpoint) {
    let errorMessage;
    try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMessage = data.error || `API error: ${response.status}`;
        } else {
            const text = await response.text();
            errorMessage = text || `API error: ${response.status}`;
        }
    } catch (error) {
        errorMessage = `API error: ${response.status}`;
    }

    debug(`Error in ${endpoint}:`, errorMessage);
    throw new Error(errorMessage);
}

// Data validation helpers
const validators = {
    device: (data) => {
        debug('Validating device data:', data);
        // Check required fields
        const required = ['name', 'type', 'x', 'y'];
        const missing = required.filter(field => data[field] === undefined);
        if (missing.length) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate coordinates
        if (isNaN(Number(data.x)) || isNaN(Number(data.y))) {
            throw new Error('Coordinates must be valid numbers');
        }

        // Validate type
        const validTypes = ['workstation', 'server', 'router', 'switch', 'client'];
        if (!validTypes.includes(data.type)) {
            throw new Error(`Invalid device type. Must be one of: ${validTypes.join(', ')}`);
        }

        return true;
    },

    connection: (data) => {
        debug('Validating connection data:', data);
        // Check required fields
        const required = ['source_device_id', 'target_device_id', 'type', 'bandwidth'];
        const missing = required.filter(field => !(field in data));
        if (missing.length) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate bandwidth
        if (typeof data.bandwidth !== 'number' || data.bandwidth < 1) {
            throw new Error('Bandwidth must be a positive number');
        }

        // Validate connection type
        const validTypes = ['ethernet', 'fiber', 'vpn', 'wifi'];
        if (!validTypes.includes(data.type)) {
            throw new Error(`Invalid connection type. Must be one of: ${validTypes.join(', ')}`);
        }

        return true;
    },

    project: (data) => {
        debug('Validating project data:', data);
        const required = ['devices', 'connections'];
        const missing = required.filter(field => !(field in data));
        if (missing.length) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        if (!Array.isArray(data.devices) || !Array.isArray(data.connections)) {
            throw new Error('Devices and connections must be arrays');
        }

        return true;
    }
};

// Enhanced API call handler with timeout and retries
async function apiCall(endpoint, options = {}, retries = 2) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

    try {
        const url = `${CONFIG.API_BASE}${endpoint}`;
        debug(`Making ${options.method || 'GET'} request to ${url}`, options.body);

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            signal: controller.signal,
            ...options
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            await handleApiError(response, endpoint);
        }

        // Check if response is empty
        const text = await response.text();
        if (!text) {
            return { message: 'Operation successful' };
        }

        // Try to parse JSON
        try {
            const data = JSON.parse(text);
            debug(`Success response from ${endpoint}:`, data);
            return data;
        } catch (error) {
            debug(`Non-JSON response from ${endpoint}:`, text);
            return { message: text };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            if (retries > 0) {
                debug(`Request timeout, retrying... (${retries} retries left)`);
                return apiCall(endpoint, options, retries - 1);
            }
            throw new Error('Request timeout');
        }

        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Device API Calls
export const deviceApi = {
    getAllDevices: () => apiCall('/devices'),
 
    addDevice: (deviceData) => {
        debug('Adding device:', deviceData);
        validators.device(deviceData);
        return apiCall('/add_device', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    },
 
    updateDevice: (deviceId, deviceData) => {
        debug('Updating device:', deviceId, deviceData);
        if (!deviceId) throw new Error('Device ID is required');
        return apiCall(`/devices/${deviceId}`, {
            method: 'PUT', 
            body: JSON.stringify(deviceData)
        });
    },
 
    updateMetrics: async (deviceId, metrics) => {
        debug('Attempting to update metrics:', deviceId, metrics);
        try {
            const response = await apiCall(`/device_metrics/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(metrics)
            });
            debug('Metrics update response:', response);
            return response;
        } catch (error) {
            console.error('Failed to update metrics:', error);
            throw error;
        }
    },
 
    updateDevicePosition: (deviceId, x, y) => {
        debug('Updating device position:', deviceId, x, y);
        if (!deviceId) throw new Error('Device ID is required');
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Coordinates must be numbers');
        }
        return apiCall(`/devices/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify({ x, y })
        });
    },
 
    removeDevice: (deviceId) => {
        debug('Removing device:', deviceId);
        if (!deviceId) throw new Error('Device ID is required');
        return apiCall(`/devices/${deviceId}`, {
            method: 'DELETE'
        });
    }
 };

// Connection API Calls
export const connectionApi = {
    getAllConnections: () => apiCall('/connections'),

    addConnection: (connectionData) => {
        debug('Adding connection:', connectionData);
        validators.connection(connectionData);
        return apiCall('/connections', {
            method: 'POST',
            body: JSON.stringify(connectionData)
        });
    },

    updateConnection: (connectionId, connectionData) => {
        debug('Updating connection:', connectionId, connectionData);
        if (!connectionId) throw new Error('Connection ID is required');
        return apiCall(`/connections/${connectionId}`, {
            method: 'PUT',
            body: JSON.stringify(connectionData)
        });
    },

    removeConnection: (connectionId) => {
        debug('Removing connection:', connectionId);
        if (!connectionId) throw new Error('Connection ID is required');
        return apiCall(`/connections/${connectionId}`, {
            method: 'DELETE'
        });
    }
};


// Project API Calls
export const projectApi = {
    saveProject: (projectData) => {
        debug('Saving project:', projectData);
        validators.project(projectData);
        return apiCall('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    },

    loadProject: (projectId) => {
        debug('Loading project:', projectId);
        if (!projectId) throw new Error('Project ID is required');
        return apiCall(`/projects/${projectId}`);
    },

    getAllProjects: () => apiCall('/projects')
};

// Export additional utilities for testing
export const utils = {
    validators,
    debug,
    CONFIG
};
