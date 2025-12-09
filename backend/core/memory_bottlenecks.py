def analyze_memory_bottlenecks(transfers, now_ms, recent_window_ms, extra, thresholds, memory_stats=None):
    """Placeholder for shared-memory-specific bottlenecks.

    transfers: recent transfers for this memory segment
    now_ms: current timestamp in ms
    recent_window_ms: analysis window in ms
    extra: optional dict with memory stats (race counts, lock waits, etc.)
    thresholds: dict from BottleneckAnalyzer.thresholds
    memory_stats: optional additional state (e.g., race counters)
    """
    # For now this returns an empty list; the detection logic can be
    # fleshed out following the same pattern as pipes/queues.
    return []
