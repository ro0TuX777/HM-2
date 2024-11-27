document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('networkCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (!canvas || !ctx) {
        console.error('Canvas element not found');
        return;
    }

    // State Management
    let devices = [];
    let connections = [];
    let currentLayer = 'physical';
    let isDragging = false;
    let draggedDevice = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let connecting = false;
    let firstDevice = null;

    // UI Elements
    const deviceSelect = document.getElementById('device-select');
    const addDeviceButton = document.getElementById('addDevice');
    const deviceTypeSelect = document.getElementById('deviceType');
    const updateSettingsButton = document.getElementById('update-settings');
    const connectDevicesButton = document.getElementById('connectDevices');
    const addConnectionButton = document.getElementById('addConnection');
    const saveButton = document.getElementById('save');
    const loadButton = document.getElementById('load');
    const layerToggles = document.querySelectorAll('.layer-toggle');

    // Device Metrics Simulation
    const simulateMetrics = (device) => {
        return {
            cpu: Math.floor(Math.random() * 100),
            memory: Math.floor(Math.random() * 100),
            network: Math.floor(Math.random() * 1000),
            temperature: 40 + Math.floor(Math.random() * 40)
        };
    };

    // Device Class Definition
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
            const healthColor = this.getHealthColor();
            ctx.fillStyle = healthColor;
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x + this.width / 2, this.y + 15);
            ctx.fillText(this.type, this.x + this.width / 2, this.y + 30);

            if (currentLayer === 'physical') {
                this.drawPhysicalMetrics(ctx);
            } else if (currentLayer === 'logical') {
                this.drawLogicalInfo(ctx);
            } else if (currentLayer === 'application') {
                this.drawApplicationInfo(ctx);
            }

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
            ctx.fillText(`CPU: ${this.metrics.cpu}%`, this.x + this.width / 2, this.y + 45);
            ctx.fillText(`Mem: ${this.metrics.memory}%`, this.x + this.width / 2, this.y + 60);
            ctx.fillText(`${this.metrics.network}Mbps`, this.x + this.width / 2, this.y + 75);
        }

        drawLogicalInfo(ctx) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.fillText(this.subnet, this.x + this.width / 2, this.y + 60);
        }

        drawApplicationInfo(ctx) {
            ctx.font = '10px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            this.services.forEach((service, index) => {
                ctx.fillText(service, this.x + this.width / 2, this.y + 45 + (index * 15));
            });
        }

        getHealthColor() {
            const health = (100 - this.metrics.cpu - this.metrics.temperature / 2) / 100;
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

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);

            switch (this.type) {
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
            ctx.setLineDash([]);

            this.drawMetrics(ctx, startX, startY, endX, endY);
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

    // Event Listeners
    addDeviceButton.addEventListener('click', () => {
        const type = deviceTypeSelect.value;
        const device = new Device(
            50 + Math.random() * (canvas.width - 150),
            50 + Math.random() * (canvas.height - 110),
            `${type.charAt(0).toUpperCase() + type.slice(1)} ${devices.length + 1}`,
            type
        );
        devices.push(device);
        updateDeviceLists();
        drawAll();
    });

    connectDevicesButton.addEventListener('click', () => {
        connecting = !connecting;
        connectDevicesButton.textContent = connecting ? 'Cancel Connection' : 'Connect Devices';
        firstDevice = null;
    });

    addConnectionButton.addEventListener('click', () => {
        const sourceDevice = devices.find(d => d.name === document.getElementById('sourceDevice').value);
        const targetDevice = devices.find(d => d.name === document.getElementById('targetDevice').value);
        const type = document.getElementById('connectionType').value;
        const bandwidth = document.getElementById('bandwidth').value || '1000';

        if (sourceDevice && targetDevice && sourceDevice !== targetDevice) {
            const connection = new Connection(
                sourceDevice,
                sourceDevice.ports[2],
                targetDevice,
                targetDevice.ports[0],
                type,
                bandwidth
            );
            connections.push(connection);
            updateConnectionsList();
            drawAll();
        }
    });

    saveButton.addEventListener('click', () => {
        const projectName = prompt('Enter project name:');
        if (!projectName) return;

        const projectData = {
            devices: devices.map(device => ({
                name: device.name,
                type: device.type,
                x: device.x,
                y: device.y,
                metrics: device.metrics,
                subnet: device.subnet
            })),
            connections: connections.map(conn => ({
                startDevice: conn.startDevice.name,
                endDevice: conn.endDevice.name,
                type: conn.type,
                bandwidth: conn.bandwidth
            }))
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    loadButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                loadProject(data);
            };
            reader.readAsText(file);
        };
        input.click();
    });

    function loadProject(data) {
        devices = data.devices.map(d => new Device(d.x, d.y, d.name, d.type));
        connections = data.connections.map(c => {
            const startDevice = devices.find(d => d.name === c.startDevice);
            const endDevice = devices.find(d => d.name === c.endDevice);
            return new Connection(startDevice, startDevice.ports[2], endDevice, endDevice.ports[0], c.type, c.bandwidth);
        });
        updateDeviceLists();
        updateConnectionsList();
        drawAll();
    }

    layerToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            layerToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            currentLayer = toggle.dataset.layer;
            drawAll();
        });
    });

    updateSettingsButton.addEventListener('click', updateDeviceConfig);

    deviceSelect.addEventListener('change', function() {
        const device = devices.find(d => d.name === this.value);
        if (device) {
            selectedDevice = device;
            updateConfigPanel(device);
            drawAll();
        }
    });

    // Canvas Event Handlers
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

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
        }

        drawAll();
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        draggedDevice = null;
    });

    function updateConfigPanel(device) {
        if (!device) return;

        deviceSelect.value = device.name;
        document.getElementById('cpu-usage').value = device.metrics.cpu;
        document.getElementById('memory-usage').value = device.metrics.memory;
        document.getElementById('disk-usage').value = device.metrics.disk_usage;
        document.getElementById('vulnerability-score').value = device.metrics.vulnerability_score;
        document.getElementById('ip-address').value = device.subnet;
    }

    function updateDeviceConfig() {
        if (!selectedDevice) return;

        selectedDevice.metrics.cpu = parseInt(document.getElementById('cpu-usage').value) || 0;
        selectedDevice.metrics.memory = parseInt(document.getElementById('memory-usage').value) || 0;
        selectedDevice.metrics.disk_usage = parseInt(document.getElementById('disk-usage').value) || 0;
        selectedDevice.metrics.vulnerability_score = parseFloat(document.getElementById('vulnerability-score').value) || 0;
        selectedDevice.subnet = document.getElementById('ip-address').value;

        drawAll();
    }

    function updateDeviceLists() {
        deviceSelect.innerHTML = '<option value="">Select a device...</option>';
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.name;
            option.textContent = device.name;
            deviceSelect.appendChild(option);
        });

        const sourceDeviceSelect = document.getElementById('sourceDevice');
        const targetDeviceSelect = document.getElementById('targetDevice');
        sourceDeviceSelect.innerHTML = '<option value="">Select source device...</option>';
        targetDeviceSelect.innerHTML = '<option value="">Select target device...</option>';
        devices.forEach(device => {
            const option1 = document.createElement('option');
            option1.value = device.name;
            option1.textContent = device.name;
            sourceDeviceSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = device.name;
            option2.textContent = device.name;
            targetDeviceSelect.appendChild(option2);
        });
    }

    function updateConnectionsList() {
        const connectionsList = document.getElementById('connectionsList');
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

    function drawAll() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        connections.forEach(conn => conn.draw(ctx));
        
        devices.forEach(device => device.draw(ctx));
    }

    drawAll();
});
