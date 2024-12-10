// static/js/device_management/dm_zscore.js
import { getState, subscribeToState, EVENTS } from '../dm_state.js';
import { drawAll } from './dm_canvas.js'; // Use static import

export class ZScoreVisualizer {
    constructor() {
        this.selectedMetric = 'cpu_usage';
        this.statusColors = {
            'normal': '#00ff00',
            'warning': '#ffa500',
            'critical': '#ff4444',
            'extreme': '#ff0000'
        };
        this.initialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for CIP Parameters dropdown changes
        const cipParameters = document.getElementById('cipParameters');
        if (cipParameters) {
            cipParameters.addEventListener('change', (e) => {
                if (e.target.value === 'z_score_mean') {
                    this.selectedMetric = 'zscore_mean';
                    this.updateVisualization();
                }
            });
        }

        // Keep existing Z-score specific dropdown if it exists
        const cipParams = document.getElementById('cip-parameters');
        if (cipParams) {
            const metrics = ['CPU Usage', 'Memory Usage', 'Disk Usage', 'Vulnerability Score'];
            metrics.forEach(metric => {
                const option = document.createElement('option');
                option.value = `zscore-${metric.toLowerCase().replace(' ', '-')}`;
                option.textContent = `Z-Score: ${metric}`;
                cipParams.appendChild(option);
            });

            cipParams.addEventListener('change', (e) => {
                if (e.target.value.startsWith('zscore-')) {
                    this.selectedMetric = e.target.value.replace('zscore-', '').replace('-', '_');
                    this.updateVisualization();
                }
            });
        }
    }

    async updateVisualization() {
        try {
            const state = getState();
            if (!state.initialized) return;

            const response = await fetch('/api/network/topology');
            if (!response.ok) {
                throw new Error('Failed to fetch network topology');
            }
            
            const topology = await response.json();

            // Update device colors based on Z-scores
            topology.devices.forEach(deviceData => {
                const device = state.devices.find(d => d.id === deviceData.id);
                if (device && deviceData.zscores) {
                    const metricData = deviceData.zscores[this.selectedMetric];
                    if (metricData) {
                        device.zscoreData = metricData;
                        device.color = this.getZScoreColor(metricData.zscore);
                        
                        // Update status color based on Z-score status
                        if (metricData.status) {
                            device.color = this.statusColors[metricData.status];
                        }
                    }
                }
            });

            // Subscribe to state changes that require redrawing
            subscribeToState(
                [EVENTS.DEVICE_UPDATED, EVENTS.LAYER_CHANGED],
                () => {
                    drawAll();
                }
            );

            // Trigger immediate redraw
            drawAll();
        } catch (error) {
            console.error('Error updating Z-score visualization:', error);
        }
    }

    getZScoreColor(zscore) {
        const absScore = Math.abs(zscore);
        if (absScore >= 3.0) return this.statusColors.extreme;
        if (absScore >= 2.0) return this.statusColors.critical;
        if (absScore >= 1.0) return this.statusColors.warning;
        return this.statusColors.normal;
    }

    drawZScoreIndicators(ctx, device) {
        if (!device.zscoreData) return;
    
        // Calculate device center if not already centered
        const deviceCenterX = device.x + (device.width / 2);
        const deviceCenterY = device.y + (device.height / 2);
    
        // Compute a radius if the device object doesn't have one
        const radius = device.radius || Math.min(device.width, device.height) / 2;
    
        // Draw Z-score value with metric name
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        const metricDisplay = this.selectedMetric.replace('_', ' ').toUpperCase();
        // Place text above device center
        ctx.fillText(
            `${metricDisplay}: ${device.zscoreData.zscore.toFixed(2)}`,
            deviceCenterX + 15,
            deviceCenterY - (radius + 20)
        );
    
        // Draw status indicator ring around device
        ctx.beginPath();
        ctx.arc(deviceCenterX, deviceCenterY, radius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = device.color || this.statusColors[device.zscoreData.status];
        ctx.lineWidth = 2;
        ctx.stroke();
    
        // Add status label if available
        if (device.zscoreData.status) {
            ctx.font = '10px Arial';
            ctx.fillText(
                device.zscoreData.status.toUpperCase(),
                deviceCenterX + 15,
                deviceCenterY - (radius + 35)
            );
        }
    }
}

// Create singleton instance
const zscoreVisualizer = new ZScoreVisualizer();
export default zscoreVisualizer;
