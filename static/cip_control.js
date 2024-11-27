// Global removeConnection function
window.removeConnection = function(index) {
    const connections = window.connections;
    const updateConnectionsList = window.updateConnectionsList;
    const drawAll = window.drawAll;
    
    if (connections && index >= 0 && index < connections.length) {
        connections.splice(index, 1);
        if (updateConnectionsList) updateConnectionsList();
        if (drawAll) drawAll();
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Network Visualization State
    window.connections = [];
    let devices = [];
    let currentLayer = 'physical';
    let isDragging = false;
    let draggedDevice = null;
    let draggedPort = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let connectionInProgress = null;

    // Device Metrics Simulation
    const simulateMetrics = (device) => {
        return {
            cpu: Math.floor(Math.random() * 100),
            memory: Math.floor(Math.random() * 100),
            network: Math.floor(Math.random() * 1000),
            temperature: 40 + Math.floor(Math.random() * 40)
        };
    };

    // Rest of the original code remains exactly the same...
    // (Copy and paste the entire original content here, starting from the Device class)
});
