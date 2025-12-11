def analyze_queue_bottlenecks(transfers, now_ms, recent_window_ms, extra, thresholds):
    """Return list of queue-specific bottleneck issues for a single resource.

    transfers: recent transfers for this queue (list of dicts)
    now_ms: current timestamp in ms
    recent_window_ms: analysis window in ms
    extra: dict with queue metrics (size, max, blocked flags)
    thresholds: dict from BottleneckAnalyzer.thresholds
    """
    if not extra:
        return []

    q_size = extra.get('queue_size', 0)
    q_max = extra.get('queue_max', 1)
    blocked_send = extra.get('blocked_send', False)
    blocked_recv = extra.get('blocked_recv', False)

    occupancy = q_size / q_max if q_max else 0
    issues = []

    # Slow Consumer: queue frequently full or producers blocked
    if occupancy >= thresholds['queue_high_occupancy_ratio'] or blocked_send:
        issues.append({
            'type': 'queue-slow-consumer',
            'severity': 'high' if occupancy >= thresholds['queue_high_occupancy_ratio'] else 'medium',
            'message': f"Queue near full ({q_size}/{q_max}). Producers may be blocked – consumer too slow.",
            'value': {'size': q_size, 'maxSize': q_max, 'blockedSend': blocked_send}
        })

    # Slow Producer: queue frequently empty and consumers blocked
    if occupancy <= thresholds['queue_low_occupancy_ratio'] and blocked_recv:
        issues.append({
            'type': 'queue-slow-producer',
            'severity': 'medium',
            'message': 'Queue often empty and consumers are blocked waiting – producer may be too slow.',
            'value': {'size': q_size, 'maxSize': q_max, 'blockedReceive': blocked_recv}
        })

    return issues
