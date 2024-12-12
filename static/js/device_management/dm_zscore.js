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

        // Periodically refresh the visualization to reflect changes as new data arrives
        this.setupPeriodicRefresh();
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

    setupPeriodicRefresh() {
        // Refresh every 10 seconds to pull new data and update visuals
        setInterval(() => {
            this.updateVisualization();
        }, 10000);
    }

    async updateVisualization() {
        try {
            const state = getState();
            if (!state.initialized) return;

            const response = await fetch('/api/network/topology/details');
            if (!response.ok) {
                throw new Error('Failed to fetch network topology');
            }
            
            const topology = await response.json();
            
            // Debug log to inspect the topology data and verify if zscore_mean is present
            console.log('Topology data:', topology);
    
            // Update device colors based on selected metric
            topology.devices.forEach(deviceData => {
                const device = state.devices.find(d => d.id === deviceData.id);
                if (device && deviceData.zscores) {
                    let metricData = deviceData.zscores[this.selectedMetric];
    
                    // If the selected metric is zscore_mean, ensure it's present
                    if (this.selectedMetric === 'zscore_mean' && !metricData) {
                        console.warn(`zscore_mean not found for device ID ${deviceData.id}. Ensure backend returns zscore_mean data.`);
                        return;
                    }
    
                    if (metricData) {
                        device.zscoreData = metricData;
                        device.color = this.getZScoreColor(metricData.zscore);
    
                        // Update status color based on Z-score status if present
                        if (metricData.status) {
                            device.color = this.statusColors[metricData.status];
                        }
                    }
                } else if (device) {
                    // If no zscores for this device or selected metric, clear zscoreData
                    device.zscoreData = null;
                }
            });
    
            // If not already subscribed, subscribe to state changes that require redrawing
            // We check this.initialized to avoid multiple subscriptions
            if (!this.initialized) {
                subscribeToState(
                    [EVENTS.DEVICE_UPDATED, EVENTS.LAYER_CHANGED],
                    () => {
                        drawAll();
                    }
                );
                this.initialized = true;
            }

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
