// dm_pin_management.js
import { addPinMarker } from './dm_pin_management.js';

import { showError, showSuccess } from './dm_ui.js';

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
        pinListSelect: document.getElementById('pinListSelect'),
        jsonFileSelect: document.getElementById('jsonFileSelect') // Dropdown for JSON files
    },
    buttons: {
        addPinButton: document.getElementById('addPinButton'),
        updateMapLocation: document.getElementById('updateMapLocation'),
        loadPinsButton: document.getElementById('loadPinsButton'),
        viewPinButton: document.getElementById('viewPinButton'),
        loadJsonFilesButton: document.getElementById('loadJsonFilesButton'), // Button to load JSON files
        associatePinToJsonButton: document.getElementById('associatePinToJsonButton') // Button to associate pin with JSON
    }
};

// Store loaded pins globally for easy access
let loadedPins = [];

// Set up event listeners for pins
function setupPinEventListeners() {
    UI.buttons.addPinButton?.addEventListener('click', addPinHandler);
    UI.selects.categorySelect?.addEventListener('change', populateSubcategories);
    UI.buttons.loadPinsButton?.addEventListener('click', loadPinsHandler);
    UI.buttons.viewPinButton?.addEventListener('click', viewPinHandler);
    UI.buttons.loadJsonFilesButton?.addEventListener('click', loadJsonFilesHandler);
    UI.buttons.associatePinToJsonButton?.addEventListener('click', associatePinToJsonHandler);
}

// Dynamically populate subcategories based on category selection
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

async function addPinHandler() {
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

        // Add marker to the map for the newly added pin
        addPinMarker(lat, lng, pinName, category, subcategory, status_classification, priority_level);

    } catch (error) {
        console.error('Error adding pin:', error);
        showError('Error adding pin. Check console for details.');
    }
}

async function loadPinsHandler() {
    try {
        const response = await fetch('/api/pins');
        if (!response.ok) {
            const result = await response.json();
            showError(`Failed to load pins: ${result.error || response.statusText}`);
            return;
        }

        const pins = await response.json();
        loadedPins = pins; // store loaded pins globally

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

function viewPinHandler() {
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

    // Attempt to center map on the pin and add a marker if necessary
    if (window.myLeafletMap) {
        window.myLeafletMap.setView([pin.latitude, pin.longitude], 13);

        // If we have pin_type encoded as "category - subcategory - status - priority"
        // we can split them if needed. Otherwise, you may need to store these separately.
        // For this example, we did store pin_type as a combined string in the backend.
        // If you need separate values, consider updating the backend or the schema.
        // For now, just display pin_type as is or adapt the logic if available.
        // We'll assume pin_type is stored in 'pin_type' attribute if the backend returns it.
        const pinInfo = pin.pin_type ? pin.pin_type.split(' - ') : [];
        const [cat, subcat, status_cls, priority_lvl] = pinInfo.length === 4 ? pinInfo : ['', '', '', ''];

        addPinMarker(pin.latitude, pin.longitude, pin.name, cat, subcat, status_cls, priority_lvl);
        showSuccess(`Viewing pin: ${pin.name}`);
    } else {
        showError('Map is not initialized. Switch to Physical layer.');
    }
}

async function loadJsonFilesHandler() {
    try {
        const response = await fetch('/api/json_files');
        const files = await response.json();
        if (!response.ok) {
            showError(`Failed to load JSON files: ${files.error || response.statusText}`);
            return;
        }

        UI.selects.jsonFileSelect.innerHTML = '<option value="" disabled selected>Select a JSON File</option>';
        files.forEach(fname => {
            const op = document.createElement('option');
            op.value = fname;
            op.textContent = fname;
            UI.selects.jsonFileSelect.appendChild(op);
        });
        showSuccess('JSON files loaded successfully!');
    } catch (error) {
        console.error('Error loading JSON files:', error);
        showError('Error loading JSON files.');
    }
}

async function associatePinToJsonHandler() {
    const pinId = UI.selects.pinListSelect.value;
    const jsonFile = UI.selects.jsonFileSelect.value;

    if (!pinId || !jsonFile) {
        showError('Please select both a Pin and a JSON file.');
        return;
    }

    try {
        const response = await fetch('/api/pins/associate_json', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ pin_id: parseInt(pinId), json_file: jsonFile })
        });
        const result = await response.json();
        if (!response.ok) {
            showError(`Failed to associate pin: ${result.error || response.statusText}`);
            return;
        }
        showSuccess('Pin successfully associated with JSON file!');
    } catch (error) {
        console.error('Error associating pin with JSON:', error);
        showError('Error associating pin.');
    }
}

function addPinMarker(lat, lng, pinName, category, subcategory, status_classification, priority_level) {
    if (!window.myLeafletMap) return; // if map is not initialized, do nothing

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

setupPinEventListeners();
loadJsonFilesHandler();
export { loadJsonFilesHandler };

export function addPinMarker(lat, lng, pinName, category, subcategory, status_classification, priority_level) {
    if (!window.myLeafletMap) return;

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