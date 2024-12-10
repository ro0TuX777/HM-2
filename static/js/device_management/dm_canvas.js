import { getState, subscribeToState, EVENTS } from '../dm_state.js';
import zscoreVisualizer from './dm_zscore.js';

// Helper function to draw background grid
function drawGrid(ctx, canvas) {
    try {
        const gridSize = 20;
        const gridColor = '#f0f0f0';

        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

        // Calculate grid based on canvas size
        const width = canvas.width;
        const height = canvas.height;

        // Draw vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }

        // Draw horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }

        ctx.stroke();
    } catch (error) {
        console.error('Error drawing grid:', error);
    }
}

// Main drawing function
function drawAll() {
    const state = getState();
    if (!state.initialized) {
        console.error('Cannot draw: State not initialized');
        return;
    }

    const { canvas, ctx, devices, connections, currentLayer } = state;
    if (!ctx || !canvas) {
        console.error('Canvas or context not available');
        return;
    }

    try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        drawGrid(ctx, canvas);

        // Draw connections first
        connections.forEach(connection => {
            try {
                if (connection.layer[currentLayer]) {
                    connection.draw(ctx, currentLayer);
                }
            } catch (error) {
                console.error('Error drawing connection:', error);
            }
        });

        // Draw devices on top
        devices.forEach(device => {
            try {
                if (device.layer[currentLayer]) {
                    device.draw(ctx, currentLayer);
                    // After device is drawn, draw Z-score indicators
                    zscoreVisualizer.drawZScoreIndicators(ctx, device);
                }
            } catch (error) {
                console.error('Error drawing device:', error);
            }
        });
    } catch (error) {   // ← Add this catch block
        console.error('Error in drawAll:', error);
    }
}


// Helper function to get mouse position relative to canvas
function getMousePosition(canvas, event) {
    try {
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    } catch (error) {
        console.error('Error getting mouse position:', error);
        return { x: 0, y: 0 };
    }
}

// Helper function to find device at position
function findDeviceAtPosition(x, y) {
    try {
        const state = getState();
        if (!state.initialized) {
            console.error('Cannot find device: State not initialized');
            return null;
        }
        return state.devices.find(device => device.containsPoint(x, y));
    } catch (error) {
        console.error('Error finding device at position:', error);
        return null;
    }
}

// Helper function to find port at position
function findPortAtPosition(x, y, radius = 5) {
    try {
        const state = getState();
        if (!state.initialized) {
            console.error('Cannot find port: State not initialized');
            return null;
        }
        for (const device of state.devices) {
            for (const port of device.ports) {
                const distance = Math.sqrt(
                    Math.pow(port.x - x, 2) + Math.pow(port.y - y, 2)
                );
                if (distance <= radius) {
                    return { device, port };
                }
            }
        }
        return null;
    } catch (error) {
        console.error('Error finding port at position:', error);
        return null;
    }
}

// Subscribe to state changes that require redrawing
subscribeToState(
    [
        EVENTS.DEVICE_ADDED,
        EVENTS.DEVICE_REMOVED,
        EVENTS.DEVICE_UPDATED,
        EVENTS.CONNECTION_ADDED,
        EVENTS.CONNECTION_REMOVED,
        EVENTS.LAYER_CHANGED
    ],
    () => {
        drawAll();
    }
);

// Export necessary functions
export {
    drawAll,
    drawGrid,
    getMousePosition,
    findDeviceAtPosition,
    findPortAtPosition
};
