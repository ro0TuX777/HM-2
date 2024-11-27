// Main entry point for device management system

import { drawAll } from './device_management/dm_canvas.js';
import { initializeUI } from './device_management/dm_ui.js';
import { initializeEventListeners } from './device_management/dm_events.js';
import { showError } from './device_management/dm_ui.js';
import { initializeState, getState, setCurrentLayer } from './dm_state.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('Initializing device management system...');

        // First get the canvas element
        const canvas = document.getElementById('networkCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        // Get the canvas context
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Set initial canvas size
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = 400; // Fixed height as per template
        }

        // Initialize the state first
        console.log('Initializing state...');
        const initialized = initializeState(canvas, ctx);
        if (!initialized) {
            throw new Error('Failed to initialize state');
        }

        // Initialize UI components
        console.log('Initializing UI...');
        const uiInitialized = initializeUI();
        if (!uiInitialized) {
            throw new Error('Failed to initialize UI');
        }

        // Initialize event listeners
        console.log('Setting up event listeners...');
        const eventsInitialized = initializeEventListeners();
        if (!eventsInitialized) {
            throw new Error('Failed to initialize event listeners');
        }

        // Add resize handler
        window.addEventListener('resize', () => {
            const container = canvas.parentElement;
            if (container) {
                canvas.width = container.clientWidth;
                canvas.height = 400;
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
                drawAll();
            }
        });

        // Set up layer toggle listeners
        const layerToggles = document.querySelectorAll('.layer-toggle');
        layerToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                // Remove active class from all toggles
                layerToggles.forEach(t => t.classList.remove('active'));
                // Add active class to clicked toggle
                toggle.classList.add('active');
                // Update current layer through state management
                const layer = toggle.dataset.layer;
                if (layer) {
                    setCurrentLayer(layer);
                }
            });
        });

        // Finally, draw the initial state
        console.log('Drawing initial state...');
        drawAll();

        console.log('Device management system initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showError(`Failed to initialize: ${error.message}`);
    }
});
