import { showError, showSuccess } from './dm_ui.js';
import { deviceApi } from './services/dm_api.js';
import { getSelectedDevice } from '../dm_state.js';

// metrics update
const METRICS_UPDATED_EVENT = 'metrics-updated';

// Unique ID generator
const generateId = () => `dev_${Math.random().toString(36).substr(2, 9)}`;

export class Device {
    constructor(x, y, name, type = 'workstation') {
        this.id = generateId();
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 80;
        this.name = name;
        this.type = type;

        // Network configuration
        this.ipAddress = '192.168.1.1';
        this.subnetMask = '255.255.255.0';
        this.macAddress = this.generateMacAddress();
        this.gateway = '192.168.1.254';
        this.dnsServer = '8.8.8.8';
        
        // Performance metrics
        this.metrics = {
            cpu: 0,
            memory: 0,
            disk: 0,
            vulnerability: 0,
            network: 0,
            temperature: 40
        };

        this.subnet = '192.168.1.0/24';
        this.services = ['HTTP', 'SSH', 'DNS'].filter(() => Math.random() > 0.5);
        this.ports = this.generatePorts();
        this.layer = {
            physical: true,
            logical: true,
            application: true // Allow all types to be visible in the Application layer
        };

        // Start periodic metric updates with device-type specific ranges
        this.metricUpdateInterval = setInterval(() => {
            this.updateMetrics();
            this.persistMetrics();
        }, 10000);
    }

    generateMacAddress() {
        const hexDigits = "0123456789ABCDEF";
        let mac = "";
        for (let i = 0; i < 6; i++) {
            mac += hexDigits[Math.floor(Math.random() * 16)];
            mac += hexDigits[Math.floor(Math.random() * 16)];
            if (i < 5) mac += ":";
        }
        return mac;
    }

    generatePorts() {
        return [
            { id: `${this.id}_port1`, x: this.x, y: this.y + this.height / 2, name: 'port1' },
            { id: `${this.id}_port2`, x: this.x + this.width, y: this.y + this.height / 2, name: 'port2' },
            { id: `${this.id}_port3`, x: this.x + this.width / 2, y: this.y, name: 'port3' },
            { id: `${this.id}_port4`, x: this.x + this.width / 2, y: this.y + this.height, name: 'port4' }
        ];
    }

    updateMetrics() {
        const ranges = {
            server: {
                cpu: [0, 100],
                memory: [5, 95],
                disk: [10, 100],
                vulnerability: [0, 60],
                network: [200, 900],
                temperature: [35, 75]
            },
            router: {
                cpu: [0, 100],
                memory: [5, 95],
                disk: [10, 100],
                vulnerability: [0, 90],
                network: [200, 900],
                temperature: [30, 65]
            },
            switch: {
                cpu: [0, 100],
                memory: [5, 95],
                disk: [10, 100],
                vulnerability: [0, 90],
                network: [200, 900],
                temperature: [25, 55]
            },
            client: {
                cpu: [5, 100],
                memory: [10, 100],
                disk: [10, 95],
                vulnerability: [0, 80],
                network: [0, 500],
                temperature: [30, 70]
            },
            workstation: {
                cpu: [5, 100],
                memory: [10, 100],
                disk: [10, 95],
                vulnerability: [0, 70],
                network: [0, 400],
                temperature: [30, 65]
            }
        };

        const deviceRanges = ranges[this.type] || ranges.workstation;
        this.metrics = Object.entries(deviceRanges).reduce((acc, [key, [min, max]]) => {
            acc[key] = min + Math.floor(Math.random() * (max - min));
            return acc;
        }, {});

    // Add this section after the metrics calculation
    try {
        const selectedDevice = getSelectedDevice();
        if (selectedDevice && selectedDevice.id === this.id) {
            window.dispatchEvent(new CustomEvent(METRICS_UPDATED_EVENT, {
                detail: { metrics: this.metrics }
            }));
        }
    } catch (error) {
        console.error('Error dispatching metrics update event:', error);
    }
}

    async persistMetrics() {
        try {
            console.log(`[DEBUG] Starting metrics persistence for ${this.type} device ${this.name}`);
            console.log(`[DEBUG] Current metrics:`, this.metrics);
            
            await deviceApi.updateMetrics(this.id, this.metrics);
            console.log(`[DEBUG] Successfully updated metrics for ${this.type} device ${this.name}`);
        } catch (error) {
            console.error(`[ERROR] Failed to persist metrics for ${this.type} device ${this.name}:`, error);
        }
    }

    updateConfiguration(config) {
        Object.assign(this, {
            name: config.name || this.name,
            ipAddress: config.ipAddress || this.ipAddress,
            subnetMask: config.subnetMask || this.subnetMask,
            macAddress: config.macAddress || this.macAddress,
            gateway: config.gateway || this.gateway,
            dnsServer: config.dnsServer || this.dnsServer
        });
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
        this.ports = this.generatePorts();
    }

    containsPoint(x, y) {
        return x >= this.x && 
               x <= this.x + this.width && 
               y >= this.y && 
               y <= this.y + this.height;
    }

    getNearestPort(x, y) {
        return this.ports.reduce((nearest, port) => {
            const distance = Math.sqrt(
                Math.pow(port.x - x, 2) + Math.pow(port.y - y, 2)
            );
            if (!nearest || distance < nearest.distance) {
                return { port, distance };
            }
            return nearest;
        }, null).port;
    }

    draw(ctx, currentLayer) {
        // If the currentLayer is 'cip', draw regardless of device.layer settings
        // Otherwise, fall back to the original logic.
        if (currentLayer !== 'cip' && !this.layer[currentLayer]) {
            return;
        }
    
        this.drawBody(ctx, currentLayer);
        this.drawText(ctx, currentLayer);
    }

    drawBody(ctx, currentLayer) {
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        ctx.lineTo(this.x + this.width - radius, this.y);
        ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
        ctx.lineTo(this.x + this.width, this.y + this.height - radius);
        ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
        ctx.lineTo(this.x + radius, this.y + this.height);
        ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
        ctx.lineTo(this.x, this.y + radius);
        ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
        ctx.closePath();

        ctx.fillStyle = this.getFillColor(currentLayer);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawText(ctx, currentLayer) {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width / 2, this.y + 20);
        ctx.fillText(this.type, this.x + this.width / 2, this.y + 35);

        if (currentLayer === 'logical') {
            ctx.fillText(this.ipAddress, this.x + this.width / 2, this.y + 50);
        }

        if (currentLayer === 'application') {
            this.services.forEach((service, index) => {
                ctx.fillText(service, this.x + this.width / 2, this.y + 50 + (index * 15));
            });
        }
    }

    getFillColor(layer) {
        switch (layer) {
            case 'physical':
                return 'white';
            case 'logical':
                return this.type === 'router' ? '#ffeb3b' :
                       this.type === 'switch' ? '#4caf50' : 'white';
            case 'application':
                return this.type === 'server' ? '#2196f3' :
                       this.type === 'client' ? '#ff9800' : 'white';
            default:
                return 'white';
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            x: Number(this.x),
            y: Number(this.y),
            ipAddress: this.ipAddress,
            subnetMask: this.subnetMask,
            macAddress: this.macAddress,
            gateway: this.gateway,
            dnsServer: this.dnsServer,
            metrics: this.metrics,
            subnet: this.subnet,
            services: this.services,
            layer: this.layer
        };
    }

    cleanup() {
        clearInterval(this.metricUpdateInterval);
    }
}

export async function addDeviceToDatabase(device) {
    try {
        if (!(device instanceof Device)) {
            throw new Error('Invalid device object');
        }

        const deviceData = device.toJSON();
        console.log('Sending device data:', deviceData); // Debug log

        const response = await deviceApi.addDevice(deviceData);
        showSuccess('Device added successfully');

        // Update the device's ID to the numeric ID returned by the backend
        if (response.device_id) {
            device.id = response.device_id;  // Assigning the numeric ID from the backend
        }

        return response;
    } catch (error) {
        console.error('Error adding device:', error); // Debug log
        showError(`Failed to add device: ${error.message}`);
        throw error;
    }
}

export async function removeDeviceFromDatabase(deviceId) {
    try {
        await deviceApi.removeDevice(deviceId);
        showSuccess('Device removed successfully');
    } catch (error) {
        showError(`Failed to remove device: ${error.message}`);
        throw error;
    }
}

export async function updateDeviceInDatabase(deviceId, updates) {
    try {
        const response = await deviceApi.updateDevice(deviceId, updates);
        showSuccess('Device updated successfully');
        return response;
    } catch (error) {
        showError(`Failed to update device: ${error.message}`);
        throw error;
    }
}

export async function updateDevicePosition(deviceId, x, y) {
    try {
        await deviceApi.updateDevicePosition(deviceId, x, y);
    } catch (error) {
        showError(`Failed to update device position: ${error.message}`);
        throw error;
    }
}
