from datetime import datetime

from .pipe_bottlenecks import analyze_pipe_bottlenecks
from .queue_bottlenecks import analyze_queue_bottlenecks
from .memory_bottlenecks import analyze_memory_bottlenecks

class BottleneckAnalyzer:
    def __init__(self):
        self.transfers = []
        # Live bottlenecks (sliding window) and persistent history
        self.bottlenecks = []
        self.bottleneck_history = []
        self.thresholds = {
            'high_latency': 1000,  # ms
            'queue_size_warning': 50,
            'transfer_rate_warning': 1000,  # bytes/sec
            # Pipe-specific heuristic thresholds
            'pipe_full_ratio': 0.9,       # buffer >90% full
            'pipe_empty_ratio': 0.1,      # buffer <10% used
            'small_write_size': 64,       # bytes
            'small_write_frequency': 50,  # per second
            'contention_writers': 3,      # distinct writers
            'busy_poll_interval': 50,     # ms between reads (very tight loop)
            # Queue-specific thresholds
            'queue_high_occupancy_ratio': 0.8,
            'queue_low_occupancy_ratio': 0.1,
            'queue_blocked_send_rate': 5,   # blocked sends/sec
            'queue_blocked_recv_rate': 5    # blocked receives/sec
        }
    
    def record_transfer(self, transfer_type, resource_id, size, latency=0, extra=None):
        """Record a data transfer.

        extra: optional dict with type-specific metadata (see analyze_bottleneck).
        """
        transfer = {
            'type': transfer_type,
            'resourceId': resource_id,
            'size': size,
            'latency': latency,
            'timestamp': datetime.now().timestamp() * 1000
        }
        
        self.transfers.append(transfer)
        
        # Keep only last 1000 transfers
        if len(self.transfers) > 1000:
            self.transfers = self.transfers[-1000:]
        
        # Pipe-read vs generic pipe write differentiation for busy-polling detection
        if transfer_type == 'pipe-read':
            # For reads we only store the event; analysis happens when writes arrive
            return

        # Analyze for bottlenecks
        self.analyze_bottleneck(transfer_type, resource_id, extra=extra)
    
    def analyze_bottleneck(self, transfer_type, resource_id, extra=None):
        """Analyze for bottlenecks in transfers.

        extra: optional dict for type-specific metrics, e.g. for pipes:
            {
              'bufferA_size': int,
              'bufferB_size': int,
              'buffer_capacity': int,
              'writer_id': str,
              'direction': 'AtoB'|'BtoA',
              'last_read_timestamps': {'AtoB': ts|None, 'BtoA': ts|None}
            }
        """
        # Get recent transfers for this resource
        recent_window = 5000  # 5 seconds
        now = datetime.now().timestamp() * 1000
        
        recent_transfers = [
            t for t in self.transfers
            if t['resourceId'] == resource_id and
               t['type'] == transfer_type and
               now - t['timestamp'] < recent_window
        ]
        
        if not recent_transfers:
            return
        
        # Calculate metrics
        total_size = sum(t['size'] for t in recent_transfers)
        avg_latency = sum(t['latency'] for t in recent_transfers) / len(recent_transfers)
        transfer_rate = total_size / (recent_window / 1000)  # bytes per second
        frequency = len(recent_transfers) / (recent_window / 1000)  # transfers per second
        
        # Detect generic bottlenecks
        bottleneck = {
            'type': transfer_type,
            'resourceId': resource_id,
            'timestamp': now,
            'metrics': {
                'transferRate': transfer_rate,
                'avgLatency': avg_latency,
                'frequency': frequency,
                'totalSize': total_size,
                'count': len(recent_transfers)
            },
            'issues': []
        }
        
        # Check for high latency
        if avg_latency > self.thresholds['high_latency']:
            bottleneck['issues'].append({
                'type': 'high-latency',
                'severity': 'high',
                'message': f"Average latency {avg_latency:.2f}ms exceeds threshold",
                'value': avg_latency,
                'threshold': self.thresholds['high_latency']
            })
        
        # Check for high frequency (potential flooding)
        if frequency > 100:
            bottleneck['issues'].append({
                'type': 'high-frequency',
                'severity': 'medium',
                'message': f"High transfer frequency: {frequency:.2f} transfers/sec",
                'value': frequency,
                'threshold': 100
            })
        
        # Check for low throughput relative to frequency
        if frequency > 10 and transfer_rate < self.thresholds['transfer_rate_warning']:
            bottleneck['issues'].append({
                'type': 'low-throughput',
                'severity': 'medium',
                'message': f"Low throughput: {transfer_rate:.2f} bytes/sec despite high frequency",
                'value': transfer_rate,
                'threshold': self.thresholds['transfer_rate_warning']
            })
        
        # Pipe-specific bottleneck patterns
        if transfer_type == 'pipe':
            history_ctx = {
                'all_transfers': self.transfers,
                'resource_id': resource_id
            }
            bottleneck['issues'].extend(
                analyze_pipe_bottlenecks(
                    recent_transfers,
                    now,
                    recent_window,
                    extra,
                    self.thresholds,
                    history_context=history_ctx
                )
            )

        # Queue-specific bottleneck patterns (slow consumer / slow producer)
        if transfer_type == 'queue':
            bottleneck['issues'].extend(
                analyze_queue_bottlenecks(
                    recent_transfers,
                    now,
                    recent_window,
                    extra,
                    self.thresholds
                )
            )

        # Shared-memory-specific bottlenecks (placeholder hook)
        if transfer_type == 'memory':
            bottleneck['issues'].extend(
                analyze_memory_bottlenecks(
                    recent_transfers,
                    now,
                    recent_window,
                    extra,
                    self.thresholds,
                    memory_stats=None
                )
            )

        # Only record if issues were found
        if bottleneck['issues']:
            # Check if we already have a recent bottleneck for this resource
            existing_index = None
            for i, b in enumerate(self.bottlenecks):
                if (b['resourceId'] == resource_id and
                    b['type'] == transfer_type and
                    now - b['timestamp'] < 10000):
                    existing_index = i
                    break
            
            if existing_index is not None:
                # Update existing bottleneck
                self.bottlenecks[existing_index] = bottleneck
            else:
                self.bottlenecks.append(bottleneck)
            
            # Append to persistent history as well
            self.bottleneck_history.append(bottleneck)
            # Keep history reasonably bounded
            if len(self.bottleneck_history) > 500:
                self.bottleneck_history = self.bottleneck_history[-500:]
            
            # Keep only last 50 live bottlenecks
            if len(self.bottlenecks) > 50:
                self.bottlenecks = self.bottlenecks[-50:]
    
    def get_bottlenecks(self):
        """Get live bottlenecks, persistent history and system metrics"""
        now = datetime.now().timestamp() * 1000
        recent_window = 30000  # 30 seconds
        
        # Filter to recent bottlenecks
        recent = [b for b in self.bottlenecks if now - b['timestamp'] < recent_window]
        
        # Calculate overall system metrics
        system_metrics = self.calculate_system_metrics()
        
        high_severity = [b for b in recent if any(i['severity'] == 'high' for i in b['issues'])]
        medium_severity = [b for b in recent if any(i['severity'] == 'medium' for i in b['issues'])]

        # History summary (no time filter)
        history_high = [b for b in self.bottleneck_history if any(i['severity'] == 'high' for i in b['issues'])]
        history_medium = [b for b in self.bottleneck_history if any(i['severity'] == 'medium' for i in b['issues'])]

        return {
            'bottlenecks': recent,
            'summary': {
                'total': len(recent),
                'highSeverity': len(high_severity),
                'mediumSeverity': len(medium_severity),
                'byType': {
                    'pipe': len([b for b in recent if b['type'] == 'pipe']),
                    'queue': len([b for b in recent if b['type'] == 'queue']),
                    'memory': len([b for b in recent if b['type'] == 'memory'])
                }
            },
            'history': {
                'items': self.bottleneck_history,
                'summary': {
                    'total': len(self.bottleneck_history),
                    'highSeverity': len(history_high),
                    'mediumSeverity': len(history_medium)
                }
            },
            'systemMetrics': system_metrics
        }
    
    def calculate_system_metrics(self):
        """Calculate overall system metrics"""
        now = datetime.now().timestamp() * 1000
        window = 10000  # 10 seconds
        
        recent_transfers = [t for t in self.transfers if now - t['timestamp'] < window]
        
        if not recent_transfers:
            return {
                'totalTransfers': 0,
                'totalBytes': 0,
                'avgTransferSize': 0,
                'transferRate': 0,
                'avgLatency': 0
            }
        
        total_bytes = sum(t['size'] for t in recent_transfers)
        total_latency = sum(t['latency'] for t in recent_transfers)
        
        return {
            'totalTransfers': len(recent_transfers),
            'totalBytes': total_bytes,
            'avgTransferSize': total_bytes / len(recent_transfers),
            'transferRate': total_bytes / (window / 1000),
            'avgLatency': total_latency / len(recent_transfers),
            'byType': {
                'pipe': len([t for t in recent_transfers if t['type'] == 'pipe']),
                'queue': len([t for t in recent_transfers if t['type'] == 'queue']),
                'memory': len([t for t in recent_transfers if t['type'] == 'memory'])
            }
        }
    
    def get_resource_analysis(self, resource_id, transfer_type):
        """Get analysis for a specific resource"""
        transfers = [
            t for t in self.transfers
            if t['resourceId'] == resource_id and t['type'] == transfer_type
        ]
        
        if not transfers:
            return None
        
        total_size = sum(t['size'] for t in transfers)
        avg_latency = sum(t['latency'] for t in transfers) / len(transfers)
        timespan = transfers[-1]['timestamp'] - transfers[0]['timestamp']
        
        return {
            'resourceId': resource_id,
            'type': transfer_type,
            'totalTransfers': len(transfers),
            'totalBytes': total_size,
            'avgTransferSize': total_size / len(transfers),
            'avgLatency': avg_latency,
            'transferRate': total_size / (timespan / 1000) if timespan > 0 else 0,
            'timespan': timespan
        }
    
    def reset(self):
        """Reset all tracking"""
        self.transfers = []
        self.bottlenecks = []
        self.bottleneck_history = []
