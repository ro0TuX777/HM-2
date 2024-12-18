import { getState, subscribeToState, EVENTS } from '../dm_state.js';
import zscoreVisualizer from './dm_zscore.js';

// Optional configuration object to control some features
const CONFIG = {
    SHOW_GRID: true,       // Allow toggling the background grid on/off
    GRID_SIZE: 20,
    GRID_COLOR: '#f0f0f0',
    ERROR_LOGGING_VERBOSE: true // More verbose logging when errors occur
};

// Helper function to draw background grid
function drawGrid(ctx, canvas) {
    if (!CONFIG.SHOW_GRID) return; // Allow disabling the grid if needed

    try {
        const gridSize = CONFIG.GRID_SIZE;
        const gridColor = CONFIG.GRID_COLOR;

        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;

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
        logError('Error drawing grid:', error);
    }
}

// Enhanced logging function
function logError(message, error) {
    if (CONFIG.ERROR_LOGGING_VERBOSE && error) {
        console.error(`${message} ${error.message}\nStack:`, error.stack);
    } else {
        console.error(message, error);
    }
}

// Main drawing function
function drawAll() {
    const state = getState();
    if (!state.initialized) {
        logError('Cannot draw: State not initialized');
        return;
    }

    const { canvas, ctx, devices, connections, currentLayer } = state;
    if (!ctx || !canvas) {
        logError('Canvas or context not available');
        return;
    }

    try {
        // Clear canvas and reset transform to ensure original scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid if enabled
        drawGrid(ctx, canvas);

        // Draw connections first
        connections.forEach(connection => {
            try {
                if (currentLayer === 'cip' || connection.layer[currentLayer]) {
                    connection.draw(ctx, currentLayer);
                }
            } catch (error) {
                logError('Error drawing connection:', error);
            }
        });

        // Draw devices on top
        devices.forEach(device => {
            try {
                if (currentLayer === 'cip' || device.layer[currentLayer]) {
                    device.draw(ctx, currentLayer);
                    zscoreVisualizer.drawZScoreIndicators(ctx, device);
                }
            } catch (error) {
                // Include device info if available
                const deviceInfo = device && device.name ? ` (Device: ${device.name})` : '';
                logError(`Error drawing device${deviceInfo}:`, error);
            }
        });

    } catch (error) {
        logError('Error in drawAll:', error);
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
        logError('Error getting mouse position:', error);
        return { x: 0, y: 0 };
    }
}

// Helper function to find device at position
function findDeviceAtPosition(x, y) {
    try {
        const state = getState();
        if (!state.initialized) {
            logError('Cannot find device: State not initialized');
            return null;
        }
        return state.devices.find(device => {
            try {
                return device.containsPoint(x, y);
            } catch (err) {
                // Additional error handling if device check fails
                logError(`Error checking containsPoint for a device:`, err);
                return false;
            }
        });
    } catch (error) {
        logError('Error finding device at position:', error);
        return null;
    }
}

// Helper function to find port at position
function findPortAtPosition(x, y, radius = 5) {
    try {
        const state = getState();
        if (!state.initialized) {
            logError('Cannot find port: State not initialized');
            return null;
        }
        for (const device of state.devices) {
            for (const port of device.ports) {
                const distance = Math.sqrt((port.x - x) ** 2 + (port.y - y) ** 2);
                if (distance <= radius) {
                    return { device, port };
                }
            }
        }
        return null;
    } catch (error) {
        logError('Error finding port at position:', error);
        return null;
    }
}

// Example enhancement: function to toggle grid visibility from elsewhere if needed
function toggleGridVisibility() {
    CONFIG.SHOW_GRID = !CONFIG.SHOW_GRID;
    drawAll();
}

// Subscribe to state changes that require redrawing
subscribeToState(
    [
        EVENTS.DEVICE_ADDED,
        EVENTS.DEVICE_REMOVED,
        EVENTS.DEVICE_UPDATED,
        EVENTS.DEVICE_SELECTED,
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
    findPortAtPosition,
    toggleGridVisibility
};
