from datetime import datetime


def analyze_pipe_bottlenecks(transfers, now_ms, recent_window_ms, extra, thresholds, history_context=None):
    """Return list of pipe-specific bottleneck issues for a single resource.

    transfers: recent transfers for this pipe (list of dicts)
    now_ms: current timestamp in ms
    recent_window_ms: analysis window in ms
    extra: dict with pipe metrics (buffer sizes, capacity, writer, reads)
    thresholds: dict from BottleneckAnalyzer.thresholds
    history_context: optional dict with additional historical info (unused for now)
    """
    if not extra:
        return []

    buf_cap = extra.get('buffer_capacity') or 1
    buf_a = extra.get('bufferA_size', 0)
    buf_b = extra.get('bufferB_size', 0)
    last_reads = extra.get('last_read_timestamps') or {}

    ratio_a = buf_a / buf_cap
    ratio_b = buf_b / buf_cap

    issues = []

    # Pipe buffer near full (either direction)
    if ratio_a >= thresholds['pipe_full_ratio'] or ratio_b >= thresholds['pipe_full_ratio']:
        issues.append({
            'type': 'pipe-buffer-full',
            'severity': 'high',
            'message': f"Pipe buffer near or at capacity (A:{buf_a}, B:{buf_b}, cap:{buf_cap})",
            'value': {'bufferA': buf_a, 'bufferB': buf_b, 'capacity': buf_cap}
        })

    # Pipe buffer empty despite recent transfers
    if len(transfers) > 5 and buf_a == 0 and buf_b == 0:
        issues.append({
            'type': 'pipe-buffer-empty',
            'severity': 'medium',
            'message': 'Pipe buffers are empty despite frequent transfers – potential reader starvation or dropped data.',
            'value': {'count': len(transfers)}
        })

    # Excessive small writes
    small_writes = [t for t in transfers if t['size'] <= thresholds['small_write_size']]
    small_freq = len(small_writes) / (recent_window_ms / 1000)
    if small_freq > thresholds['small_write_frequency']:
        issues.append({
            'type': 'excessive-small-writes',
            'severity': 'medium',
            'message': f"Excessive small writes: {small_freq:.1f} small msgs/sec (<= {thresholds['small_write_size']} bytes)",
            'value': small_freq,
            'threshold': thresholds['small_write_frequency']
        })

    # Multiple writers contention
    writers = {t.get('writerId') for t in transfers if t.get('writerId')}
    if len(writers) >= thresholds['contention_writers']:
        issues.append({
            'type': 'multiple-writers-contention',
            'severity': 'medium',
            'message': f"Pipe has contention between {len(writers)} writers.",
            'value': list(writers),
            'threshold': thresholds['contention_writers']
        })

    # Slow reader detection via last read timestamps
    read_a = last_reads.get('AtoB')
    read_b = last_reads.get('BtoA')
    if read_a and now_ms - read_a > recent_window_ms and buf_a > 0:
        issues.append({
            'type': 'slow-reader-AtoB',
            'severity': 'high',
            'message': 'Slow reader on B side – A→B buffer accumulating data.',
            'value': {'bufferA': buf_a, 'lastReadAgoMs': now_ms - read_a}
        })
    if read_b and now_ms - read_b > recent_window_ms and buf_b > 0:
        issues.append({
            'type': 'slow-reader-BtoA',
            'severity': 'high',
            'message': 'Slow reader on A side – B→A buffer accumulating data.',
            'value': {'bufferB': buf_b, 'lastReadAgoMs': now_ms - read_b}
        })

    # Busy polling (CPU hog) detection using pipe-read transfers from history_context
    if history_context:
        read_transfers = [t for t in history_context.get('all_transfers', [])
                          if t['resourceId'] == history_context.get('resource_id') and t['type'] == 'pipe-read']
        if len(read_transfers) >= 5:
            recent_reads = read_transfers[-10:]
            intervals = [recent_reads[i]['timestamp'] - recent_reads[i-1]['timestamp']
                         for i in range(1, len(recent_reads))]
            if intervals and max(intervals) < thresholds['busy_poll_interval']:
                issues.append({
                    'type': 'busy-polling',
                    'severity': 'medium',
                    'message': 'Possible CPU hog: very frequent reads with minimal data (busy polling pattern).',
                    'value': {'readsInWindow': len(recent_reads), 'maxIntervalMs': max(intervals)}
                })

    return issues
