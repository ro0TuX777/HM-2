document.addEventListener('DOMContentLoaded', function() {
    const diagramContainer = document.querySelector('.diagram-container');
    if (!diagramContainer) return;

    // Clear placeholder
    diagramContainer.innerHTML = '';

    // Create flow diagram
    const flowDiagram = document.createElement('div');
    flowDiagram.className = 'flow-diagram';

    // CIP Parameters with detailed descriptions
    const cipParameters = [
        { 
            name: 'Patch Urgency (PU)',
            tooltip: 'Controls priority of security updates',
            details: `
                <h4>Impact on Network:</h4>
                <ul>
                    <li>Higher PU increases CPU usage during patch installations</li>
                    <li>Affects network bandwidth during update downloads</li>
                    <li>May temporarily increase memory usage</li>
                </ul>
                <p class="mt-2"><strong>Risk Impact:</strong> Critical for maintaining security baseline</p>
            `
        },
        { 
            name: 'Threat Level (TL)',
            tooltip: 'Indicates current system threat severity',
            details: `
                <h4>Impact on Network:</h4>
                <ul>
                    <li>Influences security monitoring intensity</li>
                    <li>Affects resource allocation for threat detection</li>
                    <li>Changes scanning frequency and depth</li>
                </ul>
                <p class="mt-2"><strong>Risk Impact:</strong> Directly affects security posture</p>
            `
        },
        { 
            name: 'User Risk Score (URS)',
            tooltip: 'Measures risk from user behavior',
            details: `
                <h4>Impact on Network:</h4>
                <ul>
                    <li>Determines access control restrictions</li>
                    <li>Affects monitoring resource allocation</li>
                    <li>Influences authentication requirements</li>
                </ul>
                <p class="mt-2"><strong>Risk Impact:</strong> Key factor in access management</p>
            `
        }
    ];

    // Network Metrics with detailed explanations
    const networkMetrics = [
        { 
            name: 'CPU Usage',
            tooltip: 'Processing power allocation',
            details: `
                <h4>Influenced by:</h4>
                <ul>
                    <li>Patch installation processes</li>
                    <li>Security scanning operations</li>
                    <li>Real-time monitoring tasks</li>
                </ul>
            `
        },
        { 
            name: 'Memory Usage',
            tooltip: 'RAM resource utilization',
            details: `
                <h4>Influenced by:</h4>
                <ul>
                    <li>Active security processes</li>
                    <li>Monitoring operations</li>
                    <li>System analysis tasks</li>
                </ul>
            `
        },
        { 
            name: 'Network Load',
            tooltip: 'Bandwidth consumption',
            details: `
                <h4>Influenced by:</h4>
                <ul>
                    <li>Update downloads</li>
                    <li>Security telemetry</li>
                    <li>Monitoring traffic</li>
                </ul>
            `
        }
    ];

    // Risk Levels with impact descriptions
    const riskLevels = [
        { 
            name: 'Device Risk',
            tooltip: 'Overall device security status',
            details: `
                <h4>Calculated from:</h4>
                <ul>
                    <li>Current patch status</li>
                    <li>System vulnerabilities</li>
                    <li>Resource utilization</li>
                </ul>
            `
        },
        { 
            name: 'Network Risk',
            tooltip: 'Network-wide security impact',
            details: `
                <h4>Calculated from:</h4>
                <ul>
                    <li>Connected device risks</li>
                    <li>Network traffic patterns</li>
                    <li>Security event frequency</li>
                </ul>
            `
        },
        { 
            name: 'System Risk',
            tooltip: 'Comprehensive system risk level',
            details: `
                <h4>Calculated from:</h4>
                <ul>
                    <li>Overall security posture</li>
                    <li>Threat environment</li>
                    <li>User behavior patterns</li>
                </ul>
            `
        }
    ];

    // Add nodes to diagram
    cipParameters.forEach(param => {
        const node = createNode(param.name, 'cip-node', param.tooltip, param.details);
        node.appendChild(createArrow('right'));
        flowDiagram.appendChild(node);
    });

    networkMetrics.forEach(metric => {
        const node = createNode(metric.name, 'metric-node', metric.tooltip, metric.details);
        node.appendChild(createArrow('right'));
        flowDiagram.appendChild(node);
    });

    riskLevels.forEach(risk => {
        const node = createNode(risk.name, 'risk-node', risk.tooltip, risk.details);
        flowDiagram.appendChild(node);
    });

    diagramContainer.appendChild(flowDiagram);

    // Add click handlers for detailed information
    document.querySelectorAll('.diagram-node').forEach(node => {
        node.addEventListener('click', function() {
            const detailsPanel = document.getElementById('node-details-panel');
            const details = this.getAttribute('data-details');
            
            if (detailsPanel) {
                detailsPanel.innerHTML = details;
                detailsPanel.style.display = 'block';
            }
        });
    });
});

function createNode(text, className, tooltip, details) {
    const node = document.createElement('div');
    node.className = `diagram-node ${className}`;
    node.setAttribute('data-details', details);
    node.innerHTML = `
        <span>${text}</span>
        <div class="diagram-tooltip">${tooltip}</div>
    `;
    return node;
}

function createArrow(direction) {
    const arrow = document.createElement('div');
    arrow.className = `arrow arrow-${direction}`;
    return arrow;
}
