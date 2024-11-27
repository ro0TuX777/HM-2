// dm_ui.js

import { 
    getState, 
    setCurrentLayer, 
    subscribeToState, 
    EVENTS,
    setSelectedDevice,
    getSelectedDevice,
    updateDevice,
    updateDeviceMetrics,
    removeConnection,
    addDevice,
    addConnection
} from '../dm_state.js';

import { handleAddDevice } from './dm_events.js';
import { Connection, createConnection } from './dm_connection.js';
import { drawAll } from './dm_canvas.js';
import { Device } from './dm_device.js';
import { projectApi } from './services/dm_api.js';

// UI Elements Cache
const UI = {
    deviceLists: {
        source: document.getElementById('sourceDevice'),
        target: document.getElementById('targetDevice'),
        main: document.getElementById('deviceList')
    },
    buttons: {
        addDevice: document.getElementById('addDevice'),
        connect: document.getElementById('connectDevices'),
        save: document.getElementById('save'),
        load: document.getElementById('load'),
        addConnection: document.getElementById('addConnection'),
        updateDeviceConfig: document.getElementById('updateDeviceConfig'),
        updateMetrics: document.getElementById('updateMetrics')
    },
    selects: {
        deviceType: document.getElementById('deviceType'),
        connectionType: document.getElementById('connectionType')
    },
    inputs: {
        bandwidth: document.getElementById('bandwidth'),
        deviceName: document.getElementById('deviceName'),
        ipAddress: document.getElementById('ipAddress'),
        subnetMask: document.getElementById('subnetMask'),
        macAddress: document.getElementById('macAddress'),
        gateway: document.getElementById('gateway'),
        dnsServer: document.getElementById('dnsServer')
    },
    metrics: {
        cpu: document.getElementById('cpuMetric'),
        memory: document.getElementById('memoryMetric'),
        disk: document.getElementById('diskMetric'),
        vulnerability: document.getElementById('vulnerabilityMetric'),
        cpuValue: document.getElementById('cpuValue'),
        memoryValue: document.getElementById('memoryValue'),
        diskValue: document.getElementById('diskValue'),
        vulnerabilityValue: document.getElementById('vulnerabilityValue')
    },
    containers: {
        error: document.getElementById('error-container'),
        success: document.getElementById('success-container'),
        connections: document.getElementById('connectionsList')
    },
    panels: {
        deviceConfig: document.getElementById('deviceConfigPanel'),
        performanceMetrics: document.getElementById('performanceMetricsPanel')
    },
    layerToggles: document.querySelectorAll('.layer-toggle')
};

// Connection handling functions
async function handleAddConnection() {
    try {
        const sourceId = UI.deviceLists.source?.value;
        const targetId = UI.deviceLists.target?.value;
        const type = UI.selects.connectionType?.value;
        const bandwidth = parseInt(UI.inputs.bandwidth?.value);

        if (!sourceId || !targetId || !type) {
            showError('Please select source device, target device, and connection type');
            return;
        }

        const state = getState();
        const sourceDevice = state.devices.find(d => d.id === sourceId);
        const targetDevice = state.devices.find(d => d.id === targetId);

        if (!sourceDevice || !targetDevice) {
            showError('Selected devices not found');
            return;
        }

        await createConnection(sourceDevice, targetDevice, type, bandwidth);
        updateUI();
    } catch (error) {
        showError(`Failed to create connection: ${error.message}`);
    }
}

// UI Feedback Functions
function showError(message) {
    const container = UI.containers.error;
    if (!container) return;

    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => {
        container.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const container = UI.containers.success;
    if (!container) return;

    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => {
        container.style.display = 'none';
    }, 3000);
}

function clearError() {
    const container = UI.containers.error;
    if (!container) return;

    container.textContent = '';
    container.style.display = 'none';
}

// Update Device Lists
function updateDeviceLists(devices, currentLayer) {
    // Clear existing options
    UI.deviceLists.source.innerHTML = '';
    UI.deviceLists.target.innerHTML = '';
    UI.deviceLists.main.innerHTML = '';

    // Add default options
    UI.deviceLists.source.innerHTML = '<option value="" disabled selected>Select Source Device</option>';
    UI.deviceLists.target.innerHTML = '<option value="" disabled selected>Select Target Device</option>';

    devices.forEach(device => {
        // Add devices to source and target select elements
        const sourceOption = document.createElement('option');
        sourceOption.value = device.id;
        sourceOption.textContent = device.name || device.id;
        UI.deviceLists.source.appendChild(sourceOption);

        const targetOption = document.createElement('option');
        targetOption.value = device.id;
        targetOption.textContent = device.name || device.id;
        UI.deviceLists.target.appendChild(targetOption);

        // Add devices to main device list
        const listItem = document.createElement('li');
        listItem.textContent = device.name || device.id;
        listItem.addEventListener('click', () => handleDeviceSelection(device));
        UI.deviceLists.main.appendChild(listItem);
    });
}

// Update Connections List
function updateConnectionsList(connections, currentLayer) {
    const connectionsList = UI.containers.connections;
    if (!connectionsList) return;

    connectionsList.innerHTML = '';

    connections.forEach(connection => {
        if (!connection.layer[currentLayer]) return;

        const listItem = document.createElement('li');
        listItem.textContent = `${connection.startDevice.name || connection.startDevice.id} - ${connection.endDevice.name || connection.endDevice.id} (${connection.type})`;

        // Add remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600';
        removeButton.addEventListener('click', () => {
            removeConnection(connection.id);
            updateUI();
        });

        listItem.appendChild(removeButton);
        connectionsList.appendChild(listItem);
    });
}

// Device Selection Handling
function handleDeviceSelection(device) {
    setSelectedDevice(device);
    populateDeviceConfig(device);
}

// Populate Device Configuration Panel
function populateDeviceConfig(device) {
    UI.inputs.deviceName.value = device.name || '';
    UI.inputs.ipAddress.value = device.ipAddress || '';
    UI.inputs.subnetMask.value = device.subnetMask || '';
    UI.inputs.macAddress.value = device.macAddress || '';
    UI.inputs.gateway.value = device.gateway || '';
    UI.inputs.dnsServer.value = device.dnsServer || '';
}

// Initialize UI
function initializeUI() {
    try {
        const state = getState();
        if (!state.initialized) {
            throw new Error('Cannot initialize UI: State not initialized');
        }

        setupEventListeners();
        setupStateSubscriptions();
        updateUI();

        console.log('UI initialized successfully');
        return true;
    } catch (error) {
        console.error('UI initialization error:', error);
        showError(`Failed to initialize UI: ${error.message}`);
        return false;
    }
}

function setupEventListeners() {
    // Add Device
    UI.buttons.addDevice?.addEventListener('click', () => {
        const type = UI.selects.deviceType?.value;
        if (!type) {
            showError('Please select a device type');
            return;
        }
        handleAddDevice(type);
    });

    // Add Connection
    UI.buttons.addConnection?.addEventListener('click', handleAddConnection);

    // Update Device Configuration
    UI.buttons.updateDeviceConfig?.addEventListener('click', () => {
        const selectedDevice = getSelectedDevice();
        if (!selectedDevice) {
            showError('No device selected');
            return;
        }

        const config = {
            name: UI.inputs.deviceName.value || selectedDevice.name,
            ipAddress: UI.inputs.ipAddress.value || selectedDevice.ipAddress,
            subnetMask: UI.inputs.subnetMask.value || selectedDevice.subnetMask,
            macAddress: UI.inputs.macAddress.value || selectedDevice.macAddress,
            gateway: UI.inputs.gateway.value || selectedDevice.gateway,
            dnsServer: UI.inputs.dnsServer.value || selectedDevice.dnsServer
        };

        updateDevice(selectedDevice.id, config);
        updateUI();
        showSuccess('Device configuration updated');
    });

    // Update Metrics
    UI.buttons.updateMetrics?.addEventListener('click', () => {
        const selectedDevice = getSelectedDevice();
        if (!selectedDevice) {
            showError('No device selected');
            return;
        }

        // Simulate metrics update
        selectedDevice.updateMetrics();
        updateUI();
        showSuccess('Device metrics updated');
    });

    // Save/Load Configuration
    UI.buttons.save?.addEventListener('click', handleSaveConfiguration);
    UI.buttons.load?.addEventListener('click', handleLoadConfiguration);

    // Layer Toggles
    UI.layerToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            UI.layerToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            const layer = toggle.dataset.layer;
            if (layer) {
                setCurrentLayer(layer);
            }
        });
    });
}

function setupStateSubscriptions() {
    subscribeToState([
        EVENTS.DEVICE_ADDED,
        EVENTS.DEVICE_REMOVED,
        EVENTS.DEVICE_UPDATED,
        EVENTS.DEVICE_SELECTED,
        EVENTS.CONNECTION_ADDED,
        EVENTS.CONNECTION_REMOVED,
        EVENTS.LAYER_CHANGED
    ], (eventName, detail) => {
        updateUI();
    });
}

// Update UI based on state changes
function updateUI() {
    const state = getState();
    if (!state.initialized) {
        console.error('Cannot update UI: State not initialized');
        return;
    }

    updateDeviceLists(state.devices, state.currentLayer);
    updateConnectionsList(state.connections, state.currentLayer);
    drawAll();

    // Update Device Configuration Panel
    const selectedDevice = getSelectedDevice();
    if (selectedDevice) {
        populateDeviceConfig(selectedDevice);
    } else {
        clearDeviceConfig();
    }
}

function clearDeviceConfig() {
    UI.inputs.deviceName.value = '';
    UI.inputs.ipAddress.value = '';
    UI.inputs.subnetMask.value = '';
    UI.inputs.macAddress.value = '';
    UI.inputs.gateway.value = '';
    UI.inputs.dnsServer.value = '';
}

// Save/Load Configuration
async function handleSaveConfiguration() {
    try {
        const state = getState();
        const data = {
            devices: state.devices.map(device => device.toJSON()),
            connections: state.connections.map(connection => connection.toJSON())
        };

        await projectApi.saveProject(data);
        showSuccess('Configuration saved successfully');
    } catch (error) {
        showError(`Failed to save configuration: ${error.message}`);
    }
}

async function handleLoadConfiguration() {
    try {
        const data = await projectApi.loadProject();
        const state = getState();

        // Clear existing state
        state.devices = [];
        state.connections = [];

        // Load devices
        data.devices.forEach(deviceData => {
            const device = new Device(
                deviceData.x,
                deviceData.y,
                deviceData.name,
                deviceData.type
            );
            addDevice(device);
        });

        // Load connections
        data.connections.forEach(connectionData => {
            const sourceDevice = state.devices.find(d => d.id === connectionData.source_device_id);
            const targetDevice = state.devices.find(d => d.id === connectionData.target_device_id);
            if (sourceDevice && targetDevice) {
                createConnection(
                    sourceDevice,
                    targetDevice,
                    connectionData.type,
                    connectionData.bandwidth
                );
            }
        });

        updateUI();
        showSuccess('Configuration loaded successfully');
    } catch (error) {
        showError(`Failed to load configuration: ${error.message}`);
    }
}

// Export necessary functions
export {
    initializeUI,
    updateDeviceLists,
    updateConnectionsList,
    updateUI,
    showError,
    showSuccess,
    clearError
};
