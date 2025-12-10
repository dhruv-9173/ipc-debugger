def analyze_memory_bottlenecks(transfers, now_ms, recent_window_ms, extra, thresholds, memory_stats=None):
    """Analyze shared-memory-specific bottlenecks.

    transfers: recent transfers for this memory segment
    now_ms: current timestamp in ms
    recent_window_ms: analysis window in ms
    extra: optional dict with memory stats (lock waits, access patterns, etc.)
        Expected keys:
        - lock_wait_time: time spent waiting for locks (ms)
        - lock_queue_length: number of processes waiting for lock
        - access_history: list of recent access events with type (read/write)
        - total_reads: count of read operations
        - total_writes: count of write operations
        - conflicts: count of access conflicts
        - memory_size: total memory segment size
        - used_memory: currently used memory
        - fragmented_blocks: number of fragmented memory blocks
    thresholds: dict from BottleneckAnalyzer.thresholds
    memory_stats: optional additional state (e.g., race counters)
    """
    if not extra:
        return []

    issues = []

    # Lock wait time analysis
    lock_wait_time = extra.get('lock_wait_time', 0)
    lock_queue_length = extra.get('lock_queue_length', 0)
    
    # High lock contention threshold: >500ms wait time
    if lock_wait_time > 500:
        issues.append({
            'type': 'high-lock-wait-time',
            'severity': 'high',
            'message': f"High lock wait time: {lock_wait_time:.2f}ms - severe lock contention detected",
            'value': lock_wait_time,
            'threshold': 500,
            'recommendation': 'Consider reducing critical section size or using finer-grained locks'
        })
    elif lock_wait_time > 200:
        issues.append({
            'type': 'moderate-lock-wait-time',
            'severity': 'medium',
            'message': f"Moderate lock wait time: {lock_wait_time:.2f}ms - lock contention present",
            'value': lock_wait_time,
            'threshold': 200,
            'recommendation': 'Monitor lock hold times and optimize critical sections'
        })

    # Lock queue length analysis
    if lock_queue_length >= 5:
        issues.append({
            'type': 'high-lock-contention',
            'severity': 'high',
            'message': f"High lock contention: {lock_queue_length} processes waiting for lock",
            'value': lock_queue_length,
            'threshold': 5,
            'recommendation': 'Multiple processes blocked - consider lock-free data structures or read-write locks'
        })
    elif lock_queue_length >= 3:
        issues.append({
            'type': 'moderate-lock-contention',
            'severity': 'medium',
            'message': f"Moderate lock contention: {lock_queue_length} processes waiting for lock",
            'value': lock_queue_length,
            'threshold': 3
        })

    # Access pattern detection (read/write ratios)
    total_reads = extra.get('total_reads', 0)
    total_writes = extra.get('total_writes', 0)
    total_accesses = total_reads + total_writes

    if total_accesses > 0:
        write_ratio = total_writes / total_accesses
        read_ratio = total_reads / total_accesses

        # Write-heavy pattern (>70% writes) - potential for write contention
        if write_ratio > 0.7:
            issues.append({
                'type': 'write-heavy-pattern',
                'severity': 'high',
                'message': f"Write-heavy access pattern: {write_ratio*100:.1f}% writes - high contention risk",
                'value': {'writes': total_writes, 'reads': total_reads, 'ratio': write_ratio},
                'recommendation': 'Consider write buffering or batch updates to reduce lock contention'
            })

        # Read-heavy pattern (>90% reads) - good candidate for read-write locks
        if read_ratio > 0.9 and total_accesses > 20:
            issues.append({
                'type': 'read-heavy-pattern',
                'severity': 'low',
                'message': f"Read-heavy access pattern: {read_ratio*100:.1f}% reads - optimization opportunity",
                'value': {'reads': total_reads, 'writes': total_writes, 'ratio': read_ratio},
                'recommendation': 'Consider using read-write locks to allow concurrent reads'
            })

        # Excessive write frequency
        if transfers and total_writes > 0:
            write_transfers = [t for t in transfers if t.get('operation') == 'write']
            write_frequency = len(write_transfers) / (recent_window_ms / 1000)
            
            if write_frequency > 50:  # >50 writes per second
                issues.append({
                    'type': 'excessive-write-frequency',
                    'severity': 'high',
                    'message': f"Excessive write frequency: {write_frequency:.1f} writes/sec",
                    'value': write_frequency,
                    'threshold': 50,
                    'recommendation': 'Batch multiple writes together to reduce lock acquisitions'
                })

    # Contention metrics
    conflicts = extra.get('conflicts', 0)
    
    if conflicts > 0:
        conflict_rate = conflicts / (recent_window_ms / 1000)
        
        if conflict_rate > 10:  # >10 conflicts per second
            issues.append({
                'type': 'high-conflict-rate',
                'severity': 'high',
                'message': f"High access conflict rate: {conflict_rate:.1f} conflicts/sec",
                'value': conflict_rate,
                'threshold': 10,
                'recommendation': 'Reduce concurrent access attempts or implement optimistic locking'
            })
        elif conflict_rate > 5:
            issues.append({
                'type': 'moderate-conflict-rate',
                'severity': 'medium',
                'message': f"Moderate access conflict rate: {conflict_rate:.1f} conflicts/sec",
                'value': conflict_rate,
                'threshold': 5
            })

    # Memory fragmentation tracking
    memory_size = extra.get('memory_size', 1)
    used_memory = extra.get('used_memory', 0)
    fragmented_blocks = extra.get('fragmented_blocks', 0)
    
    # High fragmentation: many small blocks
    if fragmented_blocks > 10:
        issues.append({
            'type': 'high-memory-fragmentation',
            'severity': 'medium',
            'message': f"High memory fragmentation: {fragmented_blocks} fragmented blocks",
            'value': fragmented_blocks,
            'threshold': 10,
            'recommendation': 'Consider memory compaction or using fixed-size allocations'
        })

    # Memory utilization analysis
    if memory_size > 0:
        utilization = used_memory / memory_size
        
        if utilization > 0.9:
            issues.append({
                'type': 'high-memory-utilization',
                'severity': 'high',
                'message': f"High memory utilization: {utilization*100:.1f}% ({used_memory}/{memory_size} bytes)",
                'value': utilization,
                'threshold': 0.9,
                'recommendation': 'Memory segment near capacity - consider increasing size'
            })
        elif utilization < 0.1 and used_memory > 0:
            issues.append({
                'type': 'low-memory-utilization',
                'severity': 'low',
                'message': f"Low memory utilization: {utilization*100:.1f}% - oversized allocation",
                'value': utilization,
                'recommendation': 'Memory segment underutilized - consider reducing allocation size'
            })

    # Access pattern temporal analysis
    access_history = extra.get('access_history', [])
    if len(access_history) > 10:
        # Check for rapid alternating read/write (thrashing pattern)
        recent_ops = [a.get('type') for a in access_history[-10:]]
        transitions = sum(1 for i in range(1, len(recent_ops)) if recent_ops[i] != recent_ops[i-1])
        
        if transitions > 7:  # High number of transitions
            issues.append({
                'type': 'access-thrashing',
                'severity': 'high',
                'message': 'Access thrashing detected: rapid alternating read/write pattern',
                'value': {'transitions': transitions, 'pattern': recent_ops[-5:]},
                'recommendation': 'Coordinate access patterns between processes to reduce cache invalidation'
            })

    # Starvation detection
    if lock_queue_length > 0 and lock_wait_time > 2000:  # >2 seconds
        issues.append({
            'type': 'potential-starvation',
            'severity': 'critical',
            'message': f"Potential starvation: processes waiting {lock_wait_time:.2f}ms with {lock_queue_length} in queue",
            'value': {'waitTime': lock_wait_time, 'queueLength': lock_queue_length},
            'recommendation': 'Implement fair locking policy or timeout mechanisms'
        })

    return issues
