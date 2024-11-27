document.addEventListener('DOMContentLoaded', () => {
    const devices = document.querySelectorAll('.device');
    const dropZone = document.querySelector('.drop-zone');
    const deviceSelect = document.getElementById('device-select');
    const saveButton = document.getElementById('save');
    const loadButton = document.getElementById('load');
    const updateSettingsButton = document.getElementById('update-settings');

    let currentDevice = null;
    let deviceConfigurations = {};
    let draggedDevice = null;
    let offsetX, offsetY;

    devices.forEach(device => {
        device.addEventListener('dragstart', dragStart);
    });

    dropZone.addEventListener('dragover', dragOver);
    dropZone.addEventListener('drop', drop);

    function dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.textContent);
    }

    function dragOver(e) {
        e.preventDefault();
    }

    function drop(e) {
        e.preventDefault();
        const deviceName = e.dataTransfer.getData('text/plain');
        const newDevice = document.createElement('div');
        newDevice.textContent = deviceName;
        newDevice.className = 'device';
        newDevice.style.position = 'absolute';

        // Calculate position within the drop zone boundaries
        const dropZoneRect = dropZone.getBoundingClientRect();
        const offsetX = e.clientX - dropZoneRect.left;
        const offsetY = e.clientY - dropZoneRect.top;
        const clampedX = Math.max(10, Math.min(offsetX, dropZoneRect.width - newDevice.offsetWidth - 10));
        const clampedY = Math.max(10, Math.min(offsetY, dropZoneRect.height - newDevice.offsetHeight - 10));

        newDevice.style.left = `${clampedX}px`;
        newDevice.style.top = `${clampedY}px`;
        newDevice.addEventListener('mousedown', startDrag);
        dropZone.appendChild(newDevice);
        addDeviceToSelect(deviceName);

        // Adjust position if overlapping
        adjustPositionIfOverlapping(newDevice);
    }

    function addDeviceToSelect(deviceName) {
        const option = document.createElement('option');
        option.value = deviceName;
        option.textContent = deviceName;
        deviceSelect.appendChild(option);
    }

    function selectDevice(deviceElement) {
        currentDevice = deviceElement.textContent;
        deviceSelect.value = currentDevice;
        loadDeviceConfiguration(currentDevice);
    }

    function loadDeviceConfiguration(deviceName) {
        const config = deviceConfigurations[deviceName] || {};
        document.getElementById('cpu-usage').value = config.cpuUsage || '';
        document.getElementById('memory-usage').value = config.memoryUsage || '';
        document.getElementById('disk-usage').value = config.diskUsage || '';
        document.getElementById('vulnerability-score').value = config.vulnerabilityScore || '';
        document.getElementById('ip-address').value = config.ipAddress || '';
        document.getElementById('subnet-mask').value = config.subnetMask || '';
        document.getElementById('mac-address').value = config.macAddress || '';
        document.getElementById('gateway').value = config.gateway || '';
        document.getElementById('dns-settings').value = config.dnsSettings || '';
        document.getElementById('patch-level').value = config.patchLevel || '';
        document.getElementById('security-settings').value = config.securitySettings || '';
        document.getElementById('admin-level').value = config.adminLevel || '';
    }

    updateSettingsButton.addEventListener('click', () => {
        if (currentDevice) {
            deviceConfigurations[currentDevice] = {
                cpuUsage: document.getElementById('cpu-usage').value,
                memoryUsage: document.getElementById('memory-usage').value,
                diskUsage: document.getElementById('disk-usage').value,
                vulnerabilityScore: document.getElementById('vulnerability-score').value,
                ipAddress: document.getElementById('ip-address').value,
                subnetMask: document.getElementById('subnet-mask').value,
                macAddress: document.getElementById('mac-address').value,
                gateway: document.getElementById('gateway').value,
                dnsSettings: document.getElementById('dns-settings').value,
                patchLevel: document.getElementById('patch-level').value,
                securitySettings: document.getElementById('security-settings').value,
                adminLevel: document.getElementById('admin-level').value
            };
            alert('Settings updated for ' + currentDevice);
        }
    });

    saveButton.addEventListener('click', () => {
        const data = {
            devices: Array.from(dropZone.children).map(device => ({
                name: device.textContent,
                position: {
                    left: device.style.left,
                    top: device.style.top
                }
            })),
            configurations: deviceConfigurations
        };
        const json = JSON.stringify(data);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'network-topology.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    loadButton.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                const data = JSON.parse(event.target.result);
                loadWorkspace(data);
            };
            reader.readAsText(file);
        };
        input.click();
    });

    function loadWorkspace(data) {
        dropZone.innerHTML = '';
        deviceConfigurations = data.configurations || {};
        data.devices.forEach(deviceData => {
            const deviceElement = document.createElement('div');
            deviceElement.textContent = deviceData.name;
            deviceElement.className = 'device';
            deviceElement.style.position = 'absolute';
            deviceElement.style.left = deviceData.position.left;
            deviceElement.style.top = deviceData.position.top;
            deviceElement.addEventListener('mousedown', startDrag);
            dropZone.appendChild(deviceElement);
            addDeviceToSelect(deviceData.name);
        });
    }

    function startDrag(e) {
        draggedDevice = e.target;
        offsetX = e.clientX - draggedDevice.offsetLeft;
        offsetY = e.clientY - draggedDevice.offsetTop;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }

    function drag(e) {
        if (draggedDevice) {
            const dropZoneRect = dropZone.getBoundingClientRect();
            const clampedX = Math.max(10, Math.min(e.clientX - dropZoneRect.left - offsetX, dropZoneRect.width - draggedDevice.offsetWidth - 10));
            const clampedY = Math.max(10, Math.min(e.clientY - dropZoneRect.top - offsetY, dropZoneRect.height - draggedDevice.offsetHeight - 10));

            draggedDevice.style.left = `${clampedX}px`;
            draggedDevice.style.top = `${clampedY}px`;

            // Check for overlap with other devices
            Array.from(dropZone.children).forEach(device => {
                if (device !== draggedDevice && isOverlapping(draggedDevice, device)) {
                    device.style.border = '2px solid red';
                } else {
                    device.style.border = '';
                }
            });
        }
    }

    function endDrag() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', endDrag);
        if (draggedDevice) {
            adjustPositionIfOverlapping(draggedDevice);
        }
        draggedDevice = null;
    }

    function isOverlapping(device1, device2) {
        const rect1 = device1.getBoundingClientRect();
        const rect2 = device2.getBoundingClientRect();
        return !(rect1.right < rect2.left || 
                 rect1.left > rect2.right || 
                 rect1.bottom < rect2.top || 
                 rect1.top > rect2.bottom);
    }

    function adjustPositionIfOverlapping(device) {
        let adjusted = false;
        Array.from(dropZone.children).forEach(otherDevice => {
            if (device !== otherDevice && isOverlapping(device, otherDevice)) {
                const deviceRect = device.getBoundingClientRect();
                const otherRect = otherDevice.getBoundingClientRect();
                const dropZoneRect = dropZone.getBoundingClientRect();

                // Try to move the device to the right
                let newLeft = parseInt(device.style.left) + otherRect.width + 10;
                if (newLeft + deviceRect.width <= dropZoneRect.width) {
                    device.style.left = `${newLeft}px`;
                } else {
                    // If not possible, try to move it down
                    let newTop = parseInt(device.style.top) + otherRect.height + 10;
                    if (newTop + deviceRect.height <= dropZoneRect.height) {
                        device.style.top = `${newTop}px`;
                    }
                }
                adjusted = true;
            }
        });
        if (adjusted) {
            adjustPositionIfOverlapping(device); // Re-check for overlaps after adjustment
        }
    }
});
