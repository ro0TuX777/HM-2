// dm_pin_management.js

import { showError, showSuccess } from './dm_ui.js'; // Ensure these are exported from dm_ui.js if needed.

let UI = {
    inputs: {
        latitudeInput: document.getElementById('latitudeInput'),
        longitudeInput: document.getElementById('longitudeInput'),
        pinNameInput: document.getElementById('pinNameInput'),
        networkAssocInput: document.getElementById('networkAssocInput')
    },
    selects: {
        categorySelect: document.getElementById('categorySelect'),
        subcategorySelect: document.getElementById('subcategorySelect'),
        statusSelect: document.getElementById('statusSelect'),
        prioritySelect: document.getElementById('prioritySelect'),
        pinListSelect: document.getElementById('pinListSelect')
    },
    buttons: {
        addPinButton: document.getElementById('addPinButton'),
        updateMapLocation: document.getElementById('updateMapLocation'),
        loadPinsButton: document.getElementById('loadPinsButton'),
        viewPinButton: document.getElementById('viewPinButton')
    }
};

// We'll store loaded pins in a variable for easy access
let loadedPins = [];

function setupPinEventListeners() {
    UI.buttons.addPinButton?.addEventListener('click', addPin);
    UI.selects.categorySelect?.addEventListener('change', populateSubcategories);
    UI.buttons.loadPinsButton?.addEventListener('click', loadPins);
    UI.buttons.viewPinButton?.addEventListener('click', viewSelectedPin);
}

async function addPin() {
    const lat = parseFloat(UI.inputs.latitudeInput.value);
    const lng = parseFloat(UI.inputs.longitudeInput.value);
    const pinName = UI.inputs.pinNameInput.value;
    const category = UI.selects.categorySelect.value;
    const subcategory = UI.selects.subcategorySelect.value;
    const status_classification = UI.selects.statusSelect.value;
    const priority_level = UI.selects.prioritySelect.value;
    const network_assoc = UI.inputs.networkAssocInput.value;

    if (!pinName || !category || !subcategory || !status_classification || !priority_level || isNaN(lat) || isNaN(lng)) {
        showError('Please fill in all required pin fields and valid coordinates.');
        return;
    }

    const timestamp_utc = new Date().toISOString();
    const pinData = {
        pin_name: pinName,
        latitude: lat,
        longitude: lng,
        network_assoc: network_assoc || '',
        category: category,
        subcategory: subcategory,
        status_classification: status_classification,
        priority_level: priority_level,
        timestamp_utc: timestamp_utc
    };

    try {
        const response = await fetch('/api/pins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pinData)
        });
        const result = await response.json();

        if (!response.ok) {
            showError(`Failed to add pin: ${result.error || response.statusText}`);
            return;
        }

        showSuccess('Pin added successfully!');

        // Add marker to the map (optional immediate display)
        addPinMarker(lat, lng, pinName, category, subcategory, status_classification, priority_level);

    } catch (error) {
        console.error('Error adding pin:', error);
        showError('Error adding pin. Check console for details.');
    }
}

async function loadPins() {
    try {
        const response = await fetch('/api/pins');
        if (!response.ok) {
            const result = await response.json();
            showError(`Failed to load pins: ${result.error || response.statusText}`);
            return;
        }

        const pins = await response.json();
        loadedPins = pins; // Store loaded pins globally

        // Clear existing options
        UI.selects.pinListSelect.innerHTML = '<option value="" disabled selected>Select a Pin</option>';

        pins.forEach(pin => {
            const op = document.createElement('option');
            op.value = pin.id;
            op.textContent = pin.name;
            UI.selects.pinListSelect.appendChild(op);
        });

        showSuccess('Pins loaded successfully!');
    } catch (error) {
        console.error('Error loading pins:', error);
        showError('Error loading pins. Check console for details.');
    }
}

function viewSelectedPin() {
    const selectedPinId = UI.selects.pinListSelect.value;
    if (!selectedPinId) {
        showError('Please select a pin from the dropdown.');
        return;
    }

    const pin = loadedPins.find(p => p.id == selectedPinId);
    if (!pin) {
        showError('Selected pin not found.');
        return;
    }

    // Re-center map on pin and show a popup (if we have a marker)
    if (window.myLeafletMap) {
        window.myLeafletMap.setView([pin.latitude, pin.longitude], 13);

        // If you want to add a marker dynamically now:
        addPinMarker(pin.latitude, pin.longitude, pin.name, pin.pin_type);

        showSuccess(`Viewing pin: ${pin.name}`);
    } else {
        showError('Map is not initialized. Switch to Physical layer.');
    }
}

function addPinMarker(lat, lng, pinName, category, subcategory, status_classification, priority_level) {
    // category, subcategory, status_classification, priority_level might be combined into pin_type
    let color = 'blue'; 
    if (priority_level === 'High Priority') color = 'red';
    else if (priority_level === 'Medium Priority') color = 'orange';
    else if (priority_level === 'Low Priority') color = 'green';
    else if (priority_level === 'Monitor Only') color = 'purple';

    const pinIcon = window.L.divIcon({
        className: '',
        html: `<div style="width:20px; height:20px; background-color:${color}; border-radius:50%; opacity:0.8;"></div>`,
        iconSize: [20,20]
    });

    const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(window.myLeafletMap);
    marker.bindPopup(`<b>${pinName}</b><br>${category} - ${subcategory}<br>Status: ${status_classification}<br>Priority: ${priority_level}`);
}

function populateSubcategories() {
    const cat = UI.selects.categorySelect.value;
    const subcategorySelect = UI.selects.subcategorySelect;
    subcategorySelect.innerHTML = '<option value="" disabled selected>Select Subcategory</option>';

    let options = [];
    switch(cat) {
        case 'Critical Infrastructure':
            options = ['Power Generation','Distribution Centers','Communication Hubs','Transportation Nodes'];
            break;
        case 'Personnel Categories':
            options = ['Primary Contacts','Secondary Contacts','Unknown Entities','Watch List','Support Personnel'];
            break;
        case 'Operational Sites':
            options = ['Command Posts','Rally Points','Checkpoints','Observation Posts'];
            break;
        case 'Status Classifications':
            // Actually this is a category itself, not sure if needed here,
            // but leaving as example
            options = ['Active','Inactive','Pending Investigation','Verified','Unverified'];
            break;
        case 'Network Elements':
            options = ['Network Nodes','Control Systems','Remote Terminals','Access Points'];
            break;
        default:
            options = [];
    }

    options.forEach(opt => {
        const op = document.createElement('option');
        op.value = opt;
        op.textContent = opt;
        subcategorySelect.appendChild(op);
    });
}

setupPinEventListeners();
