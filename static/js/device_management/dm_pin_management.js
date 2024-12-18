// dm_pin_management.js
import { showError, showSuccess } from './dm_ui.js';

// Global variables to store currently associated pin and JSON
export let currentAssociatedPin = null;
export let currentAssociatedJson = null;

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
        jsonFileSelect: document.getElementById('jsonFileSelect')
    },
    buttons: {
        addPinButton: document.getElementById('addPinButton'),
        updateMapLocation: document.getElementById('updateMapLocation'),
        loadPinsButton: document.getElementById('loadPinsButton'),
        viewPinButton: document.getElementById('viewPinButton'),
        loadJsonFilesButton: document.getElementById('loadJsonFilesButton'),
        associatePinToJsonButton: document.getElementById('associatePinToJsonButton')
    }
};

let loadedPins = [];

function setupPinEventListeners() {
    UI.buttons.addPinButton?.addEventListener('click', addPinHandler);
    UI.selects.categorySelect?.addEventListener('change', populateSubcategories);
    UI.buttons.loadPinsButton?.addEventListener('click', loadPinsHandler);
    UI.buttons.viewPinButton?.addEventListener('click', viewPinHandler);
    UI.buttons.loadJsonFilesButton?.addEventListener('click', loadJsonFilesHandler);
    UI.buttons.associatePinToJsonButton?.addEventListener('click', associatePinToJsonHandler);
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

    // Attempt to center map on the pin
    if (window.myLeafletMap) {
        window.myLeafletMap.setView([pin.latitude, pin.longitude], 13);

        // Parse pin_type if available
        const pinInfo = pin.pin_type ? pin.pin_type.split(' - ') : [];
        const [cat, subcat, status_cls, priority_lvl] = pinInfo.length === 4 ? pinInfo : ['', '', '', ''];

        // If we are currently on the Physical layer, add the marker now
        const state = getState();
        if (state.currentLayer === 'physical') {
            addPinMarker(pin.latitude, pin.longitude, pin.name, cat, subcat, status_cls, priority_lvl);
        } else {
            // Optionally, tell the user to switch layers or switch automatically
            // For example:
            // showError('Switch to Physical layer to see the pin.');
            // or setCurrentLayer('physical') and rely on EVENTS.LAYER_CHANGED if you prefer
        }

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

        const pin = loadedPins.find(p => p.id == pinId);
        if (pin) {
            document.getElementById('pinInfoName').textContent = pin.name;
            document.getElementById('pinInfoNetwork').textContent = jsonFile;
            document.getElementById('pinInfoTime').textContent = new Date().toLocaleString();
            document.getElementById('pinInfoContainer').style.display = 'block';

            // Update global variables so dm_ui.js can reference them
            currentAssociatedPin = pin;
            currentAssociatedJson = jsonFile;
        }

    } catch (error) {
        console.error('Error associating pin with JSON:', error);
        showError('Error associating pin.');
    }
}

setupPinEventListeners();
loadJsonFilesHandler();

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
