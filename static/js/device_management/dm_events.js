// dm_events.js

import {
    getState,
    setDragState,
    updateDevice,
    EVENTS,
    addDevice,
    removeDevice,
    addConnection,
    removeConnection,
    subscribeToState,
    setSelectedDevice
} from '../dm_state.js';

import {
    drawAll,
    getMousePosition,
    findDeviceAtPosition,
    findPortAtPosition
} from './dm_canvas.js';

import { showError, showSuccess } from './dm_ui.js';
import { Device } from './dm_device.js';

// Debug flag for development
const DEBUG = true;

function debug(...args) {
    if (DEBUG) {
        console.log('[DM Events]:', ...args);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    debug('Initializing event listeners');

    const state = getState();
    if (!state.initialized) {
        showError('State not initialized');
        return false;
    }

    const canvas = state.canvas;
    if (!canvas) {
        showError('Canvas not initialized');
        return false;
    }

    debug('Setting up canvas event listeners');

    // Mouse event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleCanvasClick);

    // Subscribe to state change events
    subscribeToState(
        [
            EVENTS.DEVICE_ADDED,
            EVENTS.DEVICE_REMOVED,
            EVENTS.DEVICE_UPDATED,
            EVENTS.CONNECTION_ADDED,
            EVENTS.CONNECTION_REMOVED,
        ],
        () => {
            drawAll();
        }
    );

    debug('Event listeners initialized');
    return true;
}

// Canvas click handler for device selection
function handleCanvasClick(e) {
    const canvas = getState().canvas;
    if (!canvas) return;

    const { x, y } = getMousePosition(canvas, e);
    const device = findDeviceAtPosition(x, y);

    // Update selected device in state
    setSelectedDevice(device);
}

// Mouse event handlers
function handleMouseDown(e) {
    const state = getState();
    if (!state.canvas) return;

    const { x, y } = getMousePosition(state.canvas, e);
    debug('Mouse down at:', x, y);

    const device = findDeviceAtPosition(x, y);
    if (device) {
        debug('Device found:', device.name);
        setDragState(true, device, x - device.x, y - device.y);
        state.canvas.style.cursor = 'grabbing';
    }
}

function handleMouseMove(e) {
    const state = getState();
    const { draggedDevice, isDragging, dragStartX, dragStartY } = state;
    const canvas = state.canvas;

    if (!isDragging || !draggedDevice || !canvas) return;

    const { x, y } = getMousePosition(canvas, e);

    // Update device position and regenerate ports
    draggedDevice.updatePosition(x - dragStartX, y - dragStartY);

    // Force redraw to update connections
    drawAll();
}

function handleMouseUp() {
    const state = getState();
    const { draggedDevice, isDragging, canvas } = state;

    if (isDragging && draggedDevice) {
        debug('Device drag ended:', draggedDevice.name);

        // Update device in state
        updateDevice(draggedDevice.id, {
            x: draggedDevice.x,
            y: draggedDevice.y,
        });

        showSuccess('Device position updated');
    }

    setDragState(false, null, 0, 0);
    if (canvas) {
        canvas.style.cursor = 'default';
    }
}

// Device management handlers
function handleAddDevice(type) {
    try {
        const state = getState();
        if (!state.initialized) {
            throw new Error('State not initialized');
        }

        const canvas = state.canvas;
        if (!canvas) {
            throw new Error('Canvas not found');
        }

        // Create device instance properly
        const deviceX = 50 + Math.random() * (canvas.width - 100);
        const deviceY = 50 + Math.random() * (canvas.height - 100);
        const deviceName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${
            state.devices.length + 1
        }`;

        // Create a Device instance
        const device = new Device(deviceX, deviceY, deviceName, type);

        // Add to state
        addDevice(device);
        showSuccess('Device added successfully');
        drawAll();

        // Select the newly added device
        setSelectedDevice(device);
    } catch (error) {
        showError(`Failed to add device: ${error.message}`);
        console.error('Error in handleAddDevice:', error);
    }
}

// Connection mode handlers
function startConnectMode() {
    debug('Starting connect mode');
    const state = getState();
    if (!state.canvas) return;

    setDragState(false, null, 0, 0);
    state.isConnecting = true;
    state.canvas.style.cursor = 'crosshair';
}

function cancelConnectMode() {
    debug('Canceling connect mode');
    const state = getState();
    if (!state.canvas) return;

    setDragState(false, null, 0, 0);
    state.isConnecting = false;
    state.canvas.style.cursor = 'default';
}

// Remove device handler
function removeDeviceHandler(deviceId) {
    debug('Removing device:', deviceId);
    try {
        removeDevice(deviceId);
        drawAll();
        showSuccess('Device removed successfully');
    } catch (error) {
        showError(`Failed to remove device: ${error.message}`);
        debug('Device removal failed:', error);
    }
}

// Remove connection handler
function removeConnectionHandler(connectionId) {
    debug('Removing connection:', connectionId);
    try {
        removeConnection(connectionId);
        drawAll();
        showSuccess('Connection removed successfully');
    } catch (error) {
        showError(`Failed to remove connection: ${error.message}`);
        debug('Connection removal failed:', error);
    }
}

// Export functions
export {
    initializeEventListeners,
    handleAddDevice,
    removeDeviceHandler,
    removeConnectionHandler,
    startConnectMode,
    cancelConnectMode
};
