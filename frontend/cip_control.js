document.addEventListener('DOMContentLoaded', function() {
    // Network Visualization State
    let devices = [];
    let connections = [];
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

    class Device {
        constructor(x, y, name, type = 'workstation') {
            this.x = x;
            this.y = y;
            this.width = 120;
            this.height = 80;
            this.name = name;
            this.type = type;
            this.metrics = simulateMetrics(this);
            this.ports = [
                { x: 0, y: 20, type: 'input', connections: [] },
                { x: 0, y: 40, type: 'input', connections: [] },
                { x: this.width, y: 20, type: 'output', connections: [] },
                { x: this.width, y: 40, type: 'output', connections: [] }
            ];
            this.subnet = '192.168.1.0/24';
            this.services = ['HTTP', 'SSH', 'DNS'].filter(() => Math.random() > 0.5);
        }

        draw(ctx) {
            // Draw device body with health-based color
            const healthColor = this.getHealthColor();
            ctx.fillStyle = healthColor;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            ctx.stroke();

            // Draw device name and type
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width/2, this.y + 15);
            ctx.fillText(this.type, this.x + this.width/2, this.y + 30);

            // Draw metrics based on current layer
            if (currentLayer === 'physical') {
                this.drawPhysicalMetrics(ctx);
            } else if (currentLayer === 'logical') {
                this.drawLogicalInfo(ctx);
            } else if (currentLayer === 'application') {
                this.drawApplicationInfo(ctx);
            }

            // Draw ports
            this.ports.forEach(port => {
                ctx.beginPath();
                ctx.arc(this.x + port.x, this.y + port.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#666';
                ctx.fill();
                ctx.stroke();
            });
        }

        drawPhysicalMetrics(ctx) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(`CPU: ${this.metrics.cpu}%`, this.x + this.width/2, this.y + 45);
            ctx.fillText(`Mem: ${this.metrics.memory}%`, this.x + this.width/2, this.y + 60);
            ctx.fillText(`${this.metrics.network}Mbps`, this.x + this.width/2, this.y + 75);
        }

        drawLogicalInfo(ctx) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(this.subnet, this.x + this.width/2, this.y + 60);
        }

        drawApplicationInfo(ctx) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            this.services.forEach((service, index) => {
                ctx.fillText(service, this.x + this.width/2, this.y + 45 + (index * 15));
            });
        }

        getHealthColor() {
            const health = (100 - this.metrics.cpu - this.metrics.temperature/2) / 100;
            if (health > 0.7) return '#f0f0f0';
            if (health > 0.4) return '#fff3e0';
            return '#ffe0e0';
        }

        containsPoint(x, y) {
            return x >= this.x && x <= this.x + this.width &&
                   y >= this.y && y <= this.y + this.height;
        }

        getPortAt(x, y) {
            return this.ports.find(port => {
                const portX = this.x + port.x;
                const portY = this.y + port.y;
                const dx = x - portX;
                const dy = y - portY;
                return Math.sqrt(dx * dx + dy * dy) < 8;
            });
        }

        updateMetrics() {
            this.metrics = simulateMetrics(this);
        }
    }

    class Connection {
        constructor(startDevice, startPort, endDevice, endPort, type = 'ethernet', bandwidth = '1000') {
            this.startDevice = startDevice;
            this.startPort = startPort;
            this.endDevice = endDevice;
            this.endPort = endPort;
            this.type = type;
            this.bandwidth = bandwidth;
            this.animationOffset = 0;
            this.metrics = {
                latency: Math.random() * 100,
                packetLoss: Math.random() * 5,
                throughput: Math.random() * parseInt(bandwidth)
            };
        }

        draw(ctx) {
            const startX = this.startDevice.x + this.startPort.x;
            const startY = this.startDevice.y + this.startPort.y;
            const endX = this.endDevice.x + this.endPort.x;
            const endY = this.endDevice.y + this.endPort.y;

            // Draw the main connection line
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            switch(this.type) {
                case 'ethernet':
                    ctx.strokeStyle = '#3b82f6';
                    ctx.setLineDash([]);
                    break;
                case 'wifi':
                    ctx.strokeStyle = '#22c55e';
                    ctx.setLineDash([5, 5]);
                    break;
                case 'serial':
                    ctx.strokeStyle = '#6b7280';
                    ctx.setLineDash([2, 2]);
                    break;
            }

            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]); // Reset line dash

            // Draw animated data flow
            if (currentLayer === 'physical') {
                this.drawDataFlow(ctx, startX, startY, endX, endY);
            }

            // Draw connection metrics
            this.drawMetrics(ctx, startX, startY, endX, endY);
        }

        drawDataFlow(ctx, startX, startY, endX, endY) {
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const numDots = Math.floor(distance / 20);
            
            for (let i = 0; i < numDots; i++) {
                const t = ((i / numDots) + this.animationOffset) % 1;
                const x = startX + dx * t;
                const y = startY + dy * t;
                
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = this.type === 'ethernet' ? '#3b82f6' : 
                               this.type === 'wifi' ? '#22c55e' : '#6b7280';
                ctx.fill();
            }
            
            this.animationOffset = (this.animationOffset + 0.005) % 1;
        }

        drawMetrics(ctx, startX, startY, endX, endY) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            
            if (currentLayer === 'physical') {
                ctx.fillText(`${Math.round(this.metrics.throughput)}Mbps`, midX, midY - 10);
            } else if (currentLayer === 'logical') {
                ctx.fillText(`${Math.round(this.metrics.latency)}ms`, midX, midY - 10);
            }
        }

        updateMetrics() {
            this.metrics.throughput = Math.random() * parseInt(this.bandwidth);
            this.metrics.latency = Math.random() * 100;
            this.metrics.packetLoss = Math.random() * 5;
        }
    }

    // Canvas Setup
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const addDeviceButton = document.getElementById('addDevice');
    const deviceTypeSelect = document.getElementById('deviceType');
    const layerToggles = document.querySelectorAll('.layer-toggle');
    const connectionsList = document.getElementById('connectionsList');
    const addConnectionButton = document.getElementById('addConnection');

    // Layer Toggle Handlers
    layerToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            layerToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            currentLayer = toggle.dataset.layer;
            drawAll();
        });
    });

    // Connection Management
    function updateConnectionsList() {
        connectionsList.innerHTML = '';
        connections.forEach((conn, index) => {
            const connDiv = document.createElement('div');
            connDiv.className = 'flex items-center justify-between p-2 bg-white rounded shadow-sm';
            connDiv.innerHTML = `
                <div>
                    <div class="text-sm font-medium">${conn.startDevice.name} → ${conn.endDevice.name}</div>
                    <div class="text-xs text-gray-500">${conn.type} (${conn.bandwidth}Mbps)</div>
                </div>
                <button class="text-red-500 hover:text-red-700" onclick="removeConnection(${index})">×</button>
            `;
            connectionsList.appendChild(connDiv);
        });
    }

    function updateDeviceLists() {
        const sourceSelect = document.getElementById('sourceDevice');
        const targetSelect = document.getElementById('targetDevice');
        sourceSelect.innerHTML = '';
        targetSelect.innerHTML = '';
        
        devices.forEach(device => {
            const option1 = document.createElement('option');
            const option2 = document.createElement('option');
            option1.value = option2.value = device.name;
            option1.textContent = option2.textContent = device.name;
            sourceSelect.appendChild(option1);
            targetSelect.appendChild(option2.cloneNode(true));
        });
    }

    // Add new connection from panel
    addConnectionButton.addEventListener('click', () => {
        const sourceDevice = devices.find(d => d.name === document.getElementById('sourceDevice').value);
        const targetDevice = devices.find(d => d.name === document.getElementById('targetDevice').value);
        const type = document.getElementById('connectionType').value;
        const bandwidth = document.getElementById('bandwidth').value || '1000';

        if (sourceDevice && targetDevice && sourceDevice !== targetDevice) {
            const connection = new Connection(
                sourceDevice,
                sourceDevice.ports[2], // Using first output port
                targetDevice,
                targetDevice.ports[0], // Using first input port
                type,
                bandwidth
            );
            connections.push(connection);
            updateConnectionsList();
            drawAll();
        }
    });

    // Device Management
    let deviceCounter = 1;
    addDeviceButton.addEventListener('click', () => {
        const type = deviceTypeSelect.value;
        const device = new Device(
            50 + Math.random() * (canvas.width - 150),
            50 + Math.random() * (canvas.height - 110),
            `${type.charAt(0).toUpperCase() + type.slice(1)} ${deviceCounter++}`,
            type
        );
        devices.push(device);
        updateDeviceLists();
        drawAll();
    });

    // Canvas Event Handlers
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if clicked on a device's port
        for (const device of devices) {
            const port = device.getPortAt(x, y);
            if (port) {
                isDragging = true;
                draggedPort = port;
                connectionInProgress = {
                    startX: device.x + port.x,
                    startY: device.y + port.y,
                    endX: x,
                    endY: y,
                    startDevice: device,
                    startPort: port
                };
                return;
            }
        }

        // Check if clicked on a device
        for (const device of devices) {
            if (device.containsPoint(x, y)) {
                isDragging = true;
                draggedDevice = device;
                dragStartX = x - device.x;
                dragStartY = y - device.y;
                return;
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (draggedDevice) {
            draggedDevice.x = x - dragStartX;
            draggedDevice.y = y - dragStartY;
        } else if (connectionInProgress) {
            connectionInProgress.endX = x;
            connectionInProgress.endY = y;
        }

        drawAll();
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (connectionInProgress) {
            // Check if released on another device's port
            for (const device of devices) {
                if (device === connectionInProgress.startDevice) continue;

                const port = device.getPortAt(x, y);
                if (port) {
                    // Validate connection
                    if (isValidConnection(connectionInProgress.startDevice, device)) {
                        const connection = new Connection(
                            connectionInProgress.startDevice,
                            connectionInProgress.startPort,
                            device,
                            port,
                            document.getElementById('connectionType').value,
                            document.getElementById('bandwidth').value || '1000'
                        );
                        connections.push(connection);
                        updateConnectionsList();
                    }
                    break;
                }
            }
        }

        isDragging = false;
        draggedDevice = null;
        connectionInProgress = null;
        drawAll();
    });

    function isValidConnection(sourceDevice, targetDevice) {
        // Prevent direct workstation to workstation connections
        if (sourceDevice.type === 'workstation' && targetDevice.type === 'workstation') {
            alert('Direct workstation to workstation connections are not allowed. Please use a switch or router.');
            return false;
        }
        return true;
    }

    function drawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw subnet boundaries if in logical layer
        if (currentLayer === 'logical') {
            drawSubnets();
        }
        
        // Draw connections
        connections.forEach(conn => conn.draw(ctx));
        
        // Draw connection in progress if any
        if (connectionInProgress) {
            ctx.beginPath();
            ctx.moveTo(connectionInProgress.startX, connectionInProgress.startY);
            ctx.lineTo(connectionInProgress.endX, connectionInProgress.endY);
            ctx.strokeStyle = '#3b82f6';
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Draw devices
        devices.forEach(device => device.draw(ctx));
    }

    function drawSubnets() {
        const subnets = {};
        devices.forEach(device => {
            if (!subnets[device.subnet]) {
                subnets[device.subnet] = [];
            }
            subnets[device.subnet].push(device);
        });

        Object.entries(subnets).forEach(([subnet, deviceList]) => {
            if (deviceList.length > 1) {
                const minX = Math.min(...deviceList.map(d => d.x));
                const minY = Math.min(...deviceList.map(d => d.y));
                const maxX = Math.max(...deviceList.map(d => d.x + d.width));
                const maxY = Math.max(...deviceList.map(d => d.y + d.height));

                ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
                ctx.strokeStyle = 'rgba(100, 100, 255, 0.3)';
                ctx.beginPath();
                ctx.roundRect(minX - 20, minY - 20, maxX - minX + 40, maxY - minY + 40, 10);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'rgba(100, 100, 255, 0.5)';
                ctx.font = '12px Arial';
                ctx.fillText(subnet, minX, minY - 25);
            }
        });
    }

    // Initialize with some example devices
    devices.push(new Device(100, 100, 'Router 1', 'router'));
    devices.push(new Device(300, 200, 'Switch 1', 'switch'));
    devices.push(new Device(500, 150, 'Server 1', 'server'));
    updateDeviceLists();
    drawAll();

    // Simulate real-time updates
    setInterval(() => {
        devices.forEach(device => device.updateMetrics());
        connections.forEach(conn => conn.updateMetrics());
        drawAll();
    }, 1000);

    // Original CIP Control Dashboard functionality...
    const deviceSelect = document.getElementById('deviceSelect');
    const riskLevelIndicator = document.getElementById('riskLevelIndicator');
    const changesSummary = document.getElementById('changesSummary');
    const confirmChangesButton = document.getElementById('confirmChanges');
    const parameters = [
        'patchUrgency', 'threatLevel', 'knownVulnerabilities', 'globalThreatLevel',
        'industryThreatLevel', 'userRiskScore', 'threatIntelligenceScore',
        'vulnerabilitySeverityScore', 'alertnessScore', 'honeypotThreatIndicator',
        'complianceRiskScore', 'supplyChainRiskFactor'
    ];
    const inputs = parameters.reduce((acc, param) => {
        acc[param] = document.getElementById(param);
        if (acc[param]) {
            acc[param].value = 5; // Set default value
        }
        return acc;
    }, {});

    const applyChangesButton = document.getElementById('applyChanges');
    const riskChartCtx = document.getElementById('riskChart').getContext('2d');

    // Initialize Chart.js
    const riskChart = new Chart(riskChartCtx, {
        type: 'line',
        data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [{
                label: 'Risk Level Over Time',
                data: [65, 59, 80, 81, 56, 55, 40],
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Update chart data dynamically
    function updateChart(newRiskLevel) {
        riskChart.data.datasets[0].data.push(newRiskLevel);
        if (riskChart.data.datasets[0].data.length > 7) {
            riskChart.data.datasets[0].data.shift();
        }
        riskChart.update();
    }

    // Calculate and update the risk level
    function updateRiskLevel() {
        const cipValues = parameters.reduce((acc, param) => {
            const input = inputs[param];
            if (input) {
                acc[param] = parseFloat(input.value) / 10; // Normalize to 0-1
            }
            return acc;
        }, {});

        // Calculate average risk level
        const values = Object.values(cipValues);
        const avgRiskLevel = values.reduce((a, b) => a + b, 0) / values.length * 10;
        
        let riskLevel = 'Low';
        let color = 'green';

        if (avgRiskLevel > 7) {
            riskLevel = 'High';
            color = 'red';
        } else if (avgRiskLevel > 4) {
            riskLevel = 'Medium';
            color = 'orange';
        }

        if (riskLevelIndicator) {
            riskLevelIndicator.textContent = `Risk Level: ${riskLevel}`;
            riskLevelIndicator.style.color = color;
        }

        updateChart(avgRiskLevel);

        // Update changes summary
        if (changesSummary) {
            changesSummary.innerHTML = `
                <p>Adjusted Risk Score: ${avgRiskLevel.toFixed(2)}</p>
                <p>Risk Level: ${riskLevel}</p>
            `;
        }
    }

    // Add event listeners for real-time updates
    parameters.forEach(param => {
        const input = inputs[param];
        if (input) {
            input.addEventListener('input', updateRiskLevel);
        }
    });

    // Initialize with default values
    updateRiskLevel();

    // Handle apply changes button
    if (applyChangesButton) {
        applyChangesButton.addEventListener('click', function() {
            updateRiskLevel();
            alert('Changes applied successfully!');
        });
    }

    // Handle confirm changes button
    if (confirmChangesButton) {
        confirmChangesButton.addEventListener('click', function() {
            alert('Changes confirmed and applied to all devices!');
        });
    }
});
