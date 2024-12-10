from database import get_db_connection
from contextlib import closing
from statistics import mean, stdev

class DeviceZScore:
    """Handles Z-score calculations for device metrics"""
    
    def __init__(self):
        # Define the metrics we'll analyze
        self.device_metrics = [
            'cpu_usage',
            'memory_usage', 
            'disk_usage',
            'vulnerability_score'
        ]

    def get_population_stats(self, metric_name):
        """Calculate mean and standard deviation for a metric across all devices"""
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            try:
                # Get all non-null values for the metric
                cursor.execute(f'''
                    SELECT {metric_name} 
                    FROM devices 
                    WHERE {metric_name} IS NOT NULL
                ''')
                values = [row[0] for row in cursor.fetchall()]
                
                if not values:
                    return None, None
                
                return mean(values), stdev(values) if len(values) > 1 else 0
                
            except Exception as e:
                print(f"Error calculating stats for {metric_name}: {str(e)}")
                return None, None

    def calculate_single_zscore(self, value, metric_mean, metric_std):
        """Calculate Z-score for a single value"""
        if metric_std == 0:
            return 0
        return (value - metric_mean) / metric_std

    def get_device_metrics(self, device_id):
        """Get current metrics for a specific device"""
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT cpu_usage, memory_usage, disk_usage, vulnerability_score
                FROM devices
                WHERE id = ?
            ''', (device_id,))
            return cursor.fetchone()

    def analyze_device(self, device_id):
        """Analyze all metrics for a specific device"""
        metrics = self.get_device_metrics(device_id)
        if not metrics:
            return None

        analysis = {}
        zscores = []  # Track individual zscores for mean calculation

        for i, metric_name in enumerate(self.device_metrics):
            mean_val, std_dev = self.get_population_stats(metric_name)
            if mean_val is not None:
                zscore = self.calculate_single_zscore(metrics[i], mean_val, std_dev)
                zscores.append(zscore)  # Add to zscores list
                analysis[metric_name] = {
                    'current_value': metrics[i],
                    'population_mean': mean_val,
                    'population_std': std_dev,
                    'zscore': zscore,
                    'status': self.get_status_from_zscore(zscore)
                }

        # Calculate and add mean Z-score if we have any scores
        if zscores:
            mean_z = sum(zscores) / len(zscores)
            analysis['zscore_mean'] = {
                'zscore': mean_z,
                'status': self.get_status_from_zscore(mean_z),
                'component_scores': zscores,  # Store individual scores for reference
                'metric_count': len(zscores)
            }

        return analysis

    def get_status_from_zscore(self, zscore):
        """Determine status based on Z-score magnitude"""
        abs_zscore = abs(zscore)
        if abs_zscore <= 1:
            return 'normal'
        elif abs_zscore <= 2:
            return 'warning'
        elif abs_zscore <= 3:
            return 'critical'
        else:
            return 'extreme'

    def get_anomalous_devices(self, threshold=2.0):
        """Find all devices with metrics beyond the threshold"""
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, name FROM devices')
            devices = cursor.fetchall()

            anomalies = []
            for device_id, device_name in devices:
                analysis = self.analyze_device(device_id)
                if analysis:
                    device_anomalies = []
                    for metric_name, metric_data in analysis.items():
                        if abs(metric_data['zscore']) > threshold:
                            device_anomalies.append({
                                'metric': metric_name,
                                'value': metric_data['current_value'],
                                'zscore': metric_data['zscore'],
                                'status': metric_data['status']
                            })
                    
                    if device_anomalies:
                        anomalies.append({
                            'device_id': device_id,
                            'device_name': device_name,
                            'anomalies': device_anomalies
                        })

            return anomalies

    def get_metric_rankings(self):
        """Rank all devices by their Z-scores for each metric"""
        rankings = {metric: [] for metric in self.device_metrics}
        
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, name FROM devices')
            devices = cursor.fetchall()

            for device_id, device_name in devices:
                analysis = self.analyze_device(device_id)
                if analysis:
                    for metric_name, metric_data in analysis.items():
                        rankings[metric_name].append({
                            'device_id': device_id,
                            'device_name': device_name,
                            'value': metric_data['current_value'],
                            'zscore': metric_data['zscore'],
                            'status': metric_data['status']
                        })

            # Sort each metric's rankings by absolute Z-score
            for metric in rankings:
                rankings[metric].sort(key=lambda x: abs(x['zscore']), reverse=True)

            return rankings

    def get_device_history(self, device_id, limit=100):
        """Get historical Z-scores for a device"""
        with closing(get_db_connection()) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT timestamp, cpu_usage, memory_usage, disk_usage, vulnerability_score
                FROM device_metrics_history
                WHERE device_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (device_id, limit))
            history = cursor.fetchall()

            analyzed_history = []
            for record in history:
                timestamp = record[0]
                metrics = record[1:]
                analysis = {}
                for i, metric_name in enumerate(self.device_metrics):
                    mean_val, std_dev = self.get_population_stats(metric_name)
                    if mean_val is not None and metrics[i] is not None:
                        zscore = self.calculate_single_zscore(metrics[i], mean_val, std_dev)
                        analysis[metric_name] = {
                            'value': metrics[i],
                            'zscore': zscore,
                            'status': self.get_status_from_zscore(zscore)
                        }
                analyzed_history.append({
                    'timestamp': timestamp,
                    'metrics': analysis
                })

            return analyzed_history