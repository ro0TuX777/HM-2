// /static/js/dm_state.js

// Application State
const state = {
    devices: [],
    connections: [],
    currentLayer: 'physical',  // Default layer
    canvas: null,
    ctx: null,
    isDragging: false,
    draggedDevice: null,
    dragStartX: 0,
    dragStartY: 0,
    initialized: false,
    selectedDevice: null
};

// Custom Events
export const EVENTS = {
    STATE_CHANGE: 'dm-state-change',
    DEVICE_ADDED: 'dm-device-added',
    DEVICE_REMOVED: 'dm-device-removed',
    DEVICE_UPDATED: 'dm-device-updated',
    DEVICE_SELECTED: 'dm-device-selected',
    CONNECTION_ADDED: 'dm-connection-added',
    CONNECTION_REMOVED: 'dm-connection-removed',
    LAYER_CHANGED: 'dm-layer-changed'
};

// Event Dispatcher
function dispatchStateEvent(eventName, detail) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// State Getters
export function getState() {
    return state;
}

export function getDevices() {
    return state.devices;
}

export function getConnections() {
    return state.connections;
}

export function getCurrentLayer() {
    return state.currentLayer;
}

export function getSelectedDevice() {
    return state.selectedDevice;
}

export function getCanvasState() {
    if (!state.initialized) {
        console.error('State not initialized');
        return null;
    }
    return {
        canvas: state.canvas,
        ctx: state.ctx,
        devices: state.devices,
        connections: state.connections
    };
}

// State Setters
export function initializeState(canvas, ctx) {
    if (!canvas || !ctx) {
        console.error('Invalid canvas or context provided');
        return false;
    }
    state.canvas = canvas;
    state.ctx = ctx;
    state.initialized = true;
    dispatchStateEvent(EVENTS.STATE_CHANGE, { type: 'initialized' });
    return true;
}

export function setCurrentLayer(layer) {
    if (!['physical', 'logical', 'application', 'cip'].includes(layer)) {
        console.error('Invalid layer:', layer);
        return;
    }
    state.currentLayer = layer;
    dispatchStateEvent(EVENTS.LAYER_CHANGED, { layer });
}

export function setSelectedDevice(device) {
    state.selectedDevice = device;
    dispatchStateEvent(EVENTS.DEVICE_SELECTED, { device });
}

// Device Management
export function addDevice(device) {
    if (!state.initialized) {
        console.error('Cannot add device: State not initialized');
        return null;
    }
    state.devices.push(device);
    dispatchStateEvent(EVENTS.DEVICE_ADDED, { device });
    return device;
}

export function removeDevice(deviceId) {
    if (!state.initialized) {
        console.error('Cannot remove device: State not initialized');
        return;
    }
    const index = state.devices.findIndex(d => d.id === deviceId);
    if (index !== -1) {
        const device = state.devices[index];
        state.devices.splice(index, 1);
        // Remove associated connections
        state.connections = state.connections.filter(
            conn => conn.startDevice.id !== deviceId && conn.endDevice.id !== deviceId
        );
        // Clear selected device if it was removed
        if (state.selectedDevice && state.selectedDevice.id === deviceId) {
            setSelectedDevice(null);
        }
        dispatchStateEvent(EVENTS.DEVICE_REMOVED, { device });
    }
}

export function updateDevice(deviceId, updates) {
    if (!state.initialized) {
        console.error('Cannot update device: State not initialized');
        return;
    }
    const device = state.devices.find(d => d.id === deviceId);
    if (device) {
        Object.assign(device, updates);
        dispatchStateEvent(EVENTS.DEVICE_UPDATED, { device });
        // Update selected device if it was updated
        if (state.selectedDevice && state.selectedDevice.id === deviceId) {
            setSelectedDevice(device);
        }
    }
}

export function updateDeviceMetrics(deviceId, metrics) {
    if (!state.initialized) {
        console.error('Cannot update metrics: State not initialized');
        return;
    }
    const device = state.devices.find(d => d.id === deviceId);
    if (device) {
        device.metrics = { ...device.metrics, ...metrics };
        dispatchStateEvent(EVENTS.DEVICE_UPDATED, { device });
        // Update selected device if it was updated
        if (state.selectedDevice && state.selectedDevice.id === deviceId) {
            setSelectedDevice(device);
        }
    }
}

// Connection Management
export function addConnection(connection) {
    if (!state.initialized) {
        console.error('Cannot add connection: State not initialized');
        return null;
    }
    state.connections.push(connection);
    dispatchStateEvent(EVENTS.CONNECTION_ADDED, { connection });
    return connection;
}

export function removeConnection(connectionId) {
    if (!state.initialized) {
        console.error('Cannot remove connection: State not initialized');
        return;
    }
    const index = state.connections.findIndex(c => c.id === connectionId);
    if (index !== -1) {
        const connection = state.connections[index];
        state.connections.splice(index, 1);
        dispatchStateEvent(EVENTS.CONNECTION_REMOVED, { connection });
    }
}

// Drag State Management
export function setDragState(isDragging, device = null, startX = 0, startY = 0) {
    if (!state.initialized) {
        console.error('Cannot set drag state: State not initialized');
        return;
    }
    state.isDragging = isDragging;
    state.draggedDevice = device;
    state.dragStartX = startX;
    state.dragStartY = startY;
}

export function getDragState() {
    if (!state.initialized) {
        console.error('Cannot get drag state: State not initialized');
        return null;
    }
    return {
        isDragging: state.isDragging,
        draggedDevice: state.draggedDevice,
        dragStartX: state.dragStartX,
        dragStartY: state.dragStartY
    };
}

// Event Subscription Helper
export function subscribeToState(events, callback) {
    const handlers = {};
    
    events.forEach(eventName => {
        const handler = (event) => callback(eventName, event.detail);
        handlers[eventName] = handler;
        window.addEventListener(eventName, handler);
    });
    
    // Return unsubscribe function
    return () => {
        events.forEach(eventName => {
            window.removeEventListener(eventName, handlers[eventName]);
        });
    };
}
