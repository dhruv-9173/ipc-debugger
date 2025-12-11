import { useState, useEffect } from 'react'
import { useIPCStore } from '../services/store'
import { analysisSimulator } from '../services/simulator'
import './AnalysisPanel.css'

function AnalysisPanel() {
  const { bottlenecks, deadlocks, updateBottlenecks, updateDeadlocks, addNotification } = useIPCStore()
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadAnalysisData()
    
    if (autoRefresh) {
      const interval = setInterval(loadAnalysisData, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAnalysisData = () => {
    try {
      const bottlenecksData = analysisSimulator.getBottlenecks()
      const deadlocksData = analysisSimulator.getDeadlocks()
      updateBottlenecks(bottlenecksData)
      updateDeadlocks(deadlocksData)
    } catch (error) {
      console.error('Failed to load analysis data:', error)
    }
  }

  const handleReset = () => {
    if (!confirm('Are you sure you want to reset all analysis data?')) return

    setLoading(true)
    try {
      analysisSimulator.reset()
      updateBottlenecks([])
      updateDeadlocks([])
      addNotification({
        type: 'success',
        message: 'Analysis data reset successfully',
        severity: 'success'
      })
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to reset analysis: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error'
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'info'
      default: return 'info'
    }
  }

  const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high')
  const activeDeadlocks = deadlocks.filter(d => !d.resolved)

  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <div>
          <h2>Analysis & Diagnostics</h2>
          <p className="analysis-subtitle">Real-time bottleneck detection and deadlock analysis</p>
        </div>
        <div className="analysis-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto Refresh</span>
          </label>
          <button className="btn btn-secondary" onClick={loadAnalysisData} disabled={loading}>
            🔄 Refresh
          </button>
          <button className="btn btn-danger" onClick={handleReset} disabled={loading}>
            🗑️ Reset
          </button>
        </div>
      </div>

      <div className="analysis-summary">
        <div className="summary-card critical">
          <div className="summary-icon">⚠️</div>
          <div className="summary-content">
            <div className="summary-value">{criticalBottlenecks.length}</div>
            <div className="summary-label">Critical Bottlenecks</div>
          </div>
        </div>
        <div className="summary-card danger">
          <div className="summary-icon">🔴</div>
          <div className="summary-content">
            <div className="summary-value">{activeDeadlocks.length}</div>
            <div className="summary-label">Active Deadlocks</div>
          </div>
        </div>
        <div className="summary-card info">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-value">{bottlenecks.length}</div>
            <div className="summary-label">Total Issues</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">
            Bottleneck Detection
            <span className="badge badge-warning">{bottlenecks.length}</span>
          </h3>
          <div className="analysis-list">
            {bottlenecks.length === 0 ? (
              <div className="empty-state">
                ✅ No bottlenecks detected. System is performing optimally.
              </div>
            ) : (
              bottlenecks.map((bottleneck, index) => (
                <div key={index} className={`analysis-item bottleneck-${bottleneck.severity}`}>
                  <div className="analysis-item-header">
                    <div className="analysis-item-title">
                      <span className={`severity-badge severity-${bottleneck.severity}`}>
                        {bottleneck.severity?.toUpperCase()}
                      </span>
                      <span className="analysis-type">{bottleneck.type}</span>
                    </div>
                    <span className="analysis-resource">{bottleneck.resourceId}</span>
                  </div>
                  <div className="analysis-item-message">{bottleneck.message}</div>
                  {bottleneck.details && (
                    <div className="analysis-item-details">
                      {Object.entries(bottleneck.details).map(([key, value]) => (
                        <div key={key} className="detail-item">
                          <span className="detail-key">{key}:</span>
                          <span className="detail-value">{JSON.stringify(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="analysis-item-footer">
                    <span className="timestamp">
                      {bottleneck.timestamp ? new Date(bottleneck.timestamp).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">
            Deadlock Detection
            <span className="badge badge-error">{deadlocks.length}</span>
          </h3>
          <div className="analysis-list">
            {deadlocks.length === 0 ? (
              <div className="empty-state">
                ✅ No deadlocks detected. All resources are properly synchronized.
              </div>
            ) : (
              deadlocks.map((deadlock, index) => (
                <div key={index} className={`analysis-item deadlock-item ${deadlock.resolved ? 'resolved' : 'active'}`}>
                  <div className="analysis-item-header">
                    <div className="analysis-item-title">
                      <span className="deadlock-badge">
                        {deadlock.resolved ? '✅ RESOLVED' : '🔴 ACTIVE'}
                      </span>
                    </div>
                    <span className={`badge ${deadlock.resolved ? 'badge-success' : 'badge-error'}`}>
                      {deadlock.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  
                  {deadlock.cycle && (
                    <div className="deadlock-cycle">
                      <div className="cycle-label">Circular Wait Detected:</div>
                      <div className="cycle-path">
                        {deadlock.cycle.join(' → ')} → {deadlock.cycle[0]}
                      </div>
                    </div>
                  )}
                  
                  {deadlock.resources && (
                    <div className="deadlock-resources">
                      <div className="resources-label">Involved Resources:</div>
                      <div className="resources-list">
                        {deadlock.resources.map((resource, idx) => (
                          <span key={idx} className="resource-tag">{resource}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {deadlock.message && (
                    <div className="analysis-item-message">{deadlock.message}</div>
                  )}
                  
                  <div className="analysis-item-footer">
                    <span className="timestamp">
                      Detected: {deadlock.timestamp ? new Date(deadlock.timestamp).toLocaleString() : 'N/A'}
                    </span>
                    {deadlock.resolvedAt && (
                      <span className="timestamp">
                        Resolved: {new Date(deadlock.resolvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Recommendations</h3>
        <div className="recommendations">
          {criticalBottlenecks.length > 0 && (
            <div className="recommendation-item warning">
              <div className="recommendation-icon">⚠️</div>
              <div className="recommendation-content">
                <div className="recommendation-title">Critical Bottlenecks Detected</div>
                <div className="recommendation-text">
                  {criticalBottlenecks.length} critical bottleneck(s) detected. Consider increasing buffer sizes,
                  optimizing data transfer rates, or implementing load balancing strategies.
                </div>
              </div>
            </div>
          )}
          
          {activeDeadlocks.length > 0 && (
            <div className="recommendation-item danger">
              <div className="recommendation-icon">🔴</div>
              <div className="recommendation-content">
                <div className="recommendation-title">Active Deadlocks</div>
                <div className="recommendation-text">
                  {activeDeadlocks.length} active deadlock(s) found. Review resource acquisition order,
                  implement timeout mechanisms, or use deadlock prevention algorithms.
                </div>
              </div>
            </div>
          )}
          
          {bottlenecks.length === 0 && deadlocks.length === 0 && (
            <div className="recommendation-item success">
              <div className="recommendation-icon">✅</div>
              <div className="recommendation-content">
                <div className="recommendation-title">System Operating Normally</div>
                <div className="recommendation-text">
                  No critical issues detected. Continue monitoring for potential problems.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalysisPanel
