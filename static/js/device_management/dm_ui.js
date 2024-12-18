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

// Global variables for current associated pin and JSON
let currentAssociatedPin = null;
let currentAssociatedJson = null;

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
        updateMetrics: document.getElementById('updateMetrics'),
        updateMapLocation: document.getElementById('updateMapLocation')
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
        dnsServer: document.getElementById('dnsServer'),
        customMetricSlider: document.getElementById('customMetricSlider'),
        customMetricValue: document.getElementById('customMetricValue'),
        loadFile: document.getElementById('loadFile'),
        latitudeInput: document.getElementById('latitudeInput'),
        longitudeInput: document.getElementById('longitudeInput')
    },
    metrics: {
        cpuValue: document.getElementById('cpuValue'),
        memoryValue: document.getElementById('memoryValue'),
        diskValue: document.getElementById('diskValue'),
        vulnerabilityValue: document.getElementById('vulnerabilityValue'),
        networkValue: document.getElementById('networkValue'),
        temperatureValue: document.getElementById('temperatureValue'),
        lastUpdateTime: document.getElementById('lastUpdateTime')
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

// UI Feedback Functions
function showError(message) {
    const container = UI.containers.error;
    if (!container) return;
    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => { container.style.display = 'none'; }, 5000);
}

function showSuccess(message) {
    const container = UI.containers.success;
    if (!container) return;
    container.textContent = message;
    container.style.display = 'block';
    setTimeout(() => { container.style.display = 'none'; }, 3000);
}

function clearError() {
    const container = UI.containers.error;
    if (!container) return;
    container.textContent = '';
    container.style.display = 'none';
}

// Device and Connection Updates
function updateDeviceLists(devices, currentLayer) {
    UI.deviceLists.source.innerHTML = '<option value="" disabled selected>Select Source Device</option>';
    UI.deviceLists.target.innerHTML = '<option value="" disabled selected>Select Target Device</option>';
    UI.deviceLists.main.innerHTML = '';

    devices.forEach(device => {
        // Populate source/target selects
        const sourceOption = document.createElement('option');
        sourceOption.value = device.id;
        sourceOption.textContent = device.name || device.id;
        UI.deviceLists.source.appendChild(sourceOption);

        const targetOption = document.createElement('option');
        targetOption.value = device.id;
        targetOption.textContent = device.name || device.id;
        UI.deviceLists.target.appendChild(targetOption);

        // Device list
        const listItem = document.createElement('li');
        listItem.textContent = device.name || device.id;
        listItem.addEventListener('click', () => handleDeviceSelection(device));
        UI.deviceLists.main.appendChild(listItem);
    });
}

function updateConnectionsList(connections, currentLayer) {
    const connectionsList = UI.containers.connections;
    if (!connectionsList) return;
    connectionsList.innerHTML = '';

    connections.forEach(connection => {
        if (!connection.layer[currentLayer]) return;
        const listItem = document.createElement('li');
        listItem.textContent = `${connection.startDevice.name || connection.startDevice.id} - ${connection.endDevice.name || connection.endDevice.id} (${connection.type})`;

        // Remove button
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
    updateMetricsDisplay(device.metrics);
}

// Populate Device Config
function populateDeviceConfig(device) {
    UI.inputs.deviceName.value = device.name || '';
    UI.inputs.ipAddress.value = device.ipAddress || '';
    UI.inputs.subnetMask.value = device.subnetMask || '';
    UI.inputs.macAddress.value = device.macAddress || '';
    UI.inputs.gateway.value = device.gateway || '';
    UI.inputs.dnsServer.value = device.dnsServer || '';
}

// Metrics Display
function updateMetricsDisplay(metrics) {
    if (!metrics) return;
    const deviceNameElem = document.getElementById('metricDeviceName');
    if (deviceNameElem) {
        deviceNameElem.textContent = metrics.name || 'Selected Device';
    }
    UI.metrics.cpuValue.textContent = `${metrics.cpu}%`;
    UI.metrics.memoryValue.textContent = `${metrics.memory}%`;
    UI.metrics.diskValue.textContent = `${metrics.disk}%`;
    UI.metrics.vulnerabilityValue.textContent = `${metrics.vulnerability}%`;
    UI.metrics.networkValue.textContent = `${metrics.network} Mbps`;
    UI.metrics.temperatureValue.textContent = `${metrics.temperature}°C`;
    UI.metrics.lastUpdateTime.textContent = `Last Update: ${new Date().toLocaleTimeString()}`;
}

// Connection Handling
async function handleAddConnection() {
    try {
        const sourceId = Number(UI.deviceLists.source?.value);
        const targetId = Number(UI.deviceLists.target?.value);
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

// Initialization
function initializeUI() {
    try {
        const state = getState();
        if (!state.initialized) {
            throw new Error('Cannot initialize UI: State not initialized');
        }

        window.addEventListener('metrics-updated', (event) => {
            updateMetricsDisplay(event.detail.metrics);
        });

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

// Event Listeners
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

    // Update Device Config
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

    // Save Configuration
    UI.buttons.save?.addEventListener('click', async () => {
        const projectName = prompt("Enter a name for the configuration:");
        if (projectName) {
            const state = getState();
            const data = {
                name: projectName,
                devices: state.devices.map(d => d.toJSON()),
                connections: state.connections.map(c => c.toJSON())
            };

            try {
                await projectApi.saveProject(data);
                showSuccess('Configuration saved successfully');
            } catch (error) {
                showError(`Failed to save configuration: ${error.message}`);
            }
        }
    });

    // Load Configuration
    UI.buttons.load?.addEventListener('click', () => {
        UI.inputs.loadFile.click(); // Trigger file input
    });

    UI.inputs.loadFile?.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                console.log('Loading file content:', e.target.result);
                const data = JSON.parse(e.target.result);
                console.log('Parsed JSON data:', data);

                const state = getState();
                console.log('Current state before clearing:', state);

                state.devices = [];
                state.connections = [];

                // Recreate devices
                for (const deviceData of data.devices) {
                    const device = new Device(
                        deviceData.x,
                        deviceData.y,
                        deviceData.name,
                        deviceData.type
                    );
                    device.id = deviceData.id;
                    device.ipAddress = deviceData.ipAddress;
                    device.subnetMask = deviceData.subnetMask;
                    device.macAddress = deviceData.macAddress;
                    device.gateway = deviceData.gateway;
                    device.dnsServer = deviceData.dnsServer;
                    device.metrics = deviceData.metrics;
                    device.subnet = deviceData.subnet;
                    device.services = deviceData.services;
                    device.layer = deviceData.layer;
                    
                    addDevice(device);
                }

                // Recreate connections
                for (const connData of data.connections) {
                    const startDevice = state.devices.find(d => d.id === connData.source_device_id);
                    const endDevice = state.devices.find(d => d.id === connData.target_device_id);

                    if (startDevice && endDevice) {
                        const connection = await createConnection(
                            startDevice,
                            endDevice,
                            connData.type,
                            connData.bandwidth
                        );
                        connection.id = connData.id;
                        connection.layer = connData.layer;
                        connection.startPortId = connData.startPortId;
                        connection.endPortId = connData.endPortId;
                        
                        addConnection(connection);
                    }
                }

                showSuccess('Configuration loaded successfully');
                updateUI();

                // Now fetch the pin associated with this just-loaded JSON file
                const jsonFilename = file.name;
                fetch(`/api/pins/by_json/${encodeURIComponent(jsonFilename)}`)
                  .then(r => r.json())
                  .then(pinData => {
                    if (pinData.error) {
                      console.log('No associated pin found for this JSON file');
                      document.getElementById('pinInfoContainer').style.display = 'none';
                      currentAssociatedPin = null;
                      currentAssociatedJson = null;
                    } else {
                      // Store globally
                      currentAssociatedPin = pinData;
                      currentAssociatedJson = jsonFilename;

                      document.getElementById('pinInfoName').textContent = pinData.name;
                      document.getElementById('pinInfoNetwork').textContent = jsonFilename;
                      document.getElementById('pinInfoTime').textContent = new Date().toLocaleString();
                      document.getElementById('pinInfoContainer').style.display = 'block';

                      const pinInfo = pinData.pin_type ? pinData.pin_type.split(' - ') : [];
                      const [cat, subcat, status_cls, priority_lvl] = pinInfo.length === 4 ? pinInfo : ['', '', '', ''];

                      if (window.myLeafletMap && pinData.latitude && pinData.longitude) {
                        window.myLeafletMap.setView([pinData.latitude, pinData.longitude], 13);
                        addPinMarker(
                          pinData.latitude,
                          pinData.longitude,
                          pinData.name,
                          cat,
                          subcat,
                          status_cls,
                          priority_lvl
                        );
                      }
                    }
                  })
                  .catch(err => console.error('Failed to fetch pin by JSON:', err));

            } catch (error) {
                console.error('Error loading configuration:', error);
                showError(`Failed to load configuration: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });

    // Slider for Custom Metric
    UI.inputs.customMetricSlider?.addEventListener('input', (event) => {
        UI.inputs.customMetricValue.textContent = event.target.value;
    });

    // Layer Toggles
    UI.layerToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            UI.layerToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            const layer = toggle.dataset.layer;
            if (layer) setCurrentLayer(layer);
        });
    });

    // Update Map Location
    UI.buttons.updateMapLocation?.addEventListener('click', () => {
        const lat = parseFloat(UI.inputs.latitudeInput.value);
        const lng = parseFloat(UI.inputs.longitudeInput.value);
        if (isNaN(lat) || isNaN(lng)) {
            showError('Please enter valid latitude and longitude values.');
            return;
        }
        if (window.myLeafletMap) {
            window.myLeafletMap.setView([lat, lng], 13);
            showSuccess(`Map updated to lat: ${lat}, lng: ${lng}`);
        } else {
            showError('Map is not initialized. Make sure you are in the Physical layer.');
        }
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
        // No direct AOI logic here since we fetch upon load configuration.
    });
}

function updateUI() {
    const state = getState();
    if (!state.initialized) {
        console.error('Cannot update UI: State not initialized');
        return;
    }

    updateDeviceLists(state.devices, state.currentLayer);
    updateConnectionsList(state.connections, state.currentLayer);
    drawAll();

    const selectedDevice = getSelectedDevice();
    if (selectedDevice) {
        populateDeviceConfig(selectedDevice);
    } else {
        clearDeviceConfig();
    }

    const physicalMapContainer = document.getElementById('physicalMapContainer');
    const networkCanvas = document.getElementById('networkCanvas');

    if (state.currentLayer === 'physical') {
        networkCanvas.style.display = 'none';
        physicalMapContainer.style.display = 'block';

        if (typeof window.L === 'undefined' || typeof window.L.map !== 'function') {
            console.error('Leaflet is not available. Cannot initialize map.');
            return;
        }

        if (!window.myLeafletMap) {
            window.myLeafletMap = window.L.map('physicalMapContainer').setView([40.7128, -74.0060], 13);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(window.myLeafletMap);
        } else {
            setTimeout(() => { window.myLeafletMap.invalidateSize(); }, 200);
        }
    } else {
        physicalMapContainer.style.display = 'none';
        networkCanvas.style.display = 'block';
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

export {
    initializeUI,
    updateDeviceLists,
    updateConnectionsList,
    updateUI,
    showError,
    showSuccess,
    clearError
};
