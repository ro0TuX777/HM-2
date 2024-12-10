import { getState, addConnection } from '../dm_state.js';
import { showError, showSuccess } from './dm_ui.js';
import { connectionApi } from './services/dm_api.js';

class Connection {
    constructor(startDevice, startPort, endDevice, endPort, type, bandwidth) {
        this.id = `conn_${Math.random().toString(36).substr(2, 9)}`;
        this.startDevice = startDevice;
        this.startPort = startPort;
        this.endDevice = endDevice;
        this.endPort = endPort;
        this.type = type;
        this.bandwidth = bandwidth;

        // Connection styles for different types
        this.styles = {
            ethernet: { color: '#4caf50', dash: [] },      // Solid green
            fiber: { color: '#2196f3', dash: [] },         // Solid blue
            vpn: { color: '#ff9800', dash: [5, 5] },       // Dashed orange
            wifi: { color: '#9c27b0', dash: [2, 2] }       // Dotted purple
        };

        // Layer visibility based on connection type
        this.layer = {
            physical: true,
            logical: true,
            application: true // Allow all connection types to be visible in all layers
        };
    }

    draw(ctx, currentLayer) {
        if (!this.layer[currentLayer]) return;

        // Update port positions based on current device positions
        const startPort = this.startDevice.getNearestPort(this.endDevice.x, this.endDevice.y);
        const endPort = this.endDevice.getNearestPort(this.startDevice.x, this.startDevice.y);

        // Update stored ports
        this.startPort = startPort;
        this.endPort = endPort;

        // Get style for current connection type
        const style = this.styles[this.type] || this.styles.ethernet;

        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(startPort.x, startPort.y);
        ctx.lineTo(endPort.x, endPort.y);

        ctx.strokeStyle = style.color;
        ctx.setLineDash(style.dash);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw bandwidth label if in logical layer
        if (currentLayer === 'logical' && this.bandwidth) {
            const midX = (startPort.x + endPort.x) / 2;
            const midY = (startPort.y + endPort.y) / 2;

            ctx.font = '12px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.bandwidth} Mbps`, midX, midY - 10);
        }
    }

    toJSON() {
        return {
            id: this.id,
            source_device_id: this.startDevice.id,  // Updated field name
            target_device_id: this.endDevice.id,    // Updated field name
            type: this.type,
            bandwidth: this.bandwidth,
            startPortId: this.startPort.id,
            endPortId: this.endPort.id,
            layer: this.layer
        };
    }

    static fromJSON(data, devices) {
        const startDevice = devices.find(d => d.id === data.source_device_id);  // Updated field name
        const endDevice = devices.find(d => d.id === data.target_device_id);    // Updated field name

        if (!startDevice || !endDevice) {
            throw new Error('Could not find devices for connection');
        }

        const startPort = startDevice.getNearestPort(endDevice.x, endDevice.y);
        const endPort = endDevice.getNearestPort(startDevice.x, startDevice.y);

        const connection = new Connection(
            startDevice,
            startPort,
            endDevice,
            endPort,
            data.type,
            data.bandwidth
        );
        connection.id = data.id;
        connection.layer = data.layer || connection.layer;

        return connection;
    }
}

// Validation Functions
function validateConnection(sourceDevice, targetDevice, type) {
    if (!sourceDevice || !targetDevice) {
        throw new Error('Source or target device not selected');
    }

    if (sourceDevice === targetDevice) {
        throw new Error('Cannot connect device to itself');
    }

    // Check for existing connections
    const { connections } = getState();
    const existingConnection = connections.find(conn => 
        (conn.startDevice.id === sourceDevice.id && conn.endDevice.id === targetDevice.id) ||
        (conn.startDevice.id === targetDevice.id && conn.endDevice.id === sourceDevice.id)
    );

    if (existingConnection) {
        throw new Error('Connection already exists between these devices');
    }

    // Remove specific connection rules to allow any type of connection
    return true;
}

// API Functions
async function addConnectionToDatabase(connectionData) {
    try {
        console.log('Original connection data:', connectionData); // Debug log

        // Format the connection data to match API expectations
        const formattedData = {
            source_device_id: connectionData.source_device_id,
            target_device_id: connectionData.target_device_id,
            type: connectionData.type,
            bandwidth: connectionData.bandwidth,
            metrics: {
                latency: 0,
                packet_loss: 0
            }
        };

        console.log('Sending formatted connection data:', formattedData); // Debug log
        const response = await connectionApi.addConnection(formattedData);
        console.log('Connection API response:', response); // Debug log
        showSuccess('Connection added successfully');
        return response;
    } catch (error) {
        console.error('Connection error:', error); // Debug log
        showError(`Failed to create connection: ${error.message}`);
        throw error;
    }
}

async function createConnection(sourceDevice, targetDevice, type, bandwidth) {
    try {
        console.log('Creating connection:', { sourceDevice, targetDevice, type, bandwidth }); // Debug log
        validateConnection(sourceDevice, targetDevice, type);

        const startPort = sourceDevice.getNearestPort(targetDevice.x, targetDevice.y);
        const endPort = targetDevice.getNearestPort(sourceDevice.x, sourceDevice.y);

        const connection = new Connection(
            sourceDevice,
            startPort,
            targetDevice,
            endPort,
            type,
            bandwidth
        );

        // Add to database if needed
        await addConnectionToDatabase(connection.toJSON());

        // Add to state
        addConnection(connection);
        showSuccess('Connection created successfully');

        return connection;
    } catch (error) {
        showError(`Failed to create connection: ${error.message}`);
        throw error;
    }
}

// Export necessary functions and classes
export {
    Connection,
    validateConnection,
    createConnection,
    addConnectionToDatabase
};
