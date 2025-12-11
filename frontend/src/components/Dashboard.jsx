import { useState, useEffect } from 'react'
import { useIPCStore } from '../services/store'
import { pipeSimulator, queueSimulator, memorySimulator, analysisSimulator } from '../services/simulator'
import './Dashboard.css'

function Dashboard() {
  const { pipes, queues, memories, bottlenecks, deadlocks, metrics, updatePipes, updateQueues, updateMemories, updateBottlenecks, updateDeadlocks } = useIPCStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
    const interval = setInterval(loadAllData, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadAllData = () => {
    try {
      const pipesData = pipeSimulator.getAll()
      const queuesData = queueSimulator.getAll()
      const memoriesData = memorySimulator.getAll()
      const bottlenecksData = analysisSimulator.getBottlenecks()
      const deadlocksData = analysisSimulator.getDeadlocks()

      updatePipes(pipesData)
      updateQueues(queuesData)
      updateMemories(memoriesData)
      updateBottlenecks(bottlenecksData)
      updateDeadlocks(deadlocksData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      setLoading(false)
    }
  }

  const stats = [
    {
      title: 'Active Pipes',
      value: pipes.length,
      icon: '🔗',
      color: 'primary',
      trend: pipes.filter(p => p.status === 'active').length
    },
    {
      title: 'Message Queues',
      value: queues.length,
      icon: '📬',
      color: 'success',
      trend: queues.reduce((sum, q) => sum + (q.currentSize || 0), 0)
    },
    {
      title: 'Memory Segments',
      value: memories.length,
      icon: '💾',
      color: 'info',
      trend: memories.filter(m => m.locked).length
    },
    {
      title: 'Bottlenecks',
      value: bottlenecks.length,
      icon: '⚠️',
      color: 'warning',
      severity: bottlenecks.filter(b => b.severity === 'high' || b.severity === 'critical').length
    },
    {
      title: 'Deadlocks',
      value: deadlocks.length,
      icon: '🔴',
      color: 'error',
      active: deadlocks.filter(d => !d.resolved).length
    }
  ]

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>System Overview</h2>
        <p className="dashboard-subtitle">Real-time IPC monitoring and analysis</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
              {stat.trend !== undefined && (
                <div className="stat-trend">
                  {stat.trend > 0 ? `${stat.trend} active` : 'No activity'}
                </div>
              )}
              {stat.severity !== undefined && stat.severity > 0 && (
                <div className="stat-severity">
                  {stat.severity} critical
                </div>
              )}
              {stat.active !== undefined && (
                <div className="stat-active">
                  {stat.active > 0 ? `${stat.active} unresolved` : 'All resolved'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Recent Pipes</h3>
          <div className="list">
            {pipes.length === 0 ? (
              <div className="empty-state">No pipes created yet</div>
            ) : (
              pipes.slice(0, 5).map(pipe => (
                <div key={pipe.id} className="list-item">
                  <div className="list-item-header">
                    <span className="list-item-title">{pipe.processA} ↔ {pipe.processB}</span>
                    <span className={`badge badge-${pipe.status === 'active' ? 'success' : 'error'}`}>
                      {pipe.status}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    A→B: {pipe.stats?.messagesAtoB || 0} | B→A: {pipe.stats?.messagesBtoA || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Recent Queues</h3>
          <div className="list">
            {queues.length === 0 ? (
              <div className="empty-state">No queues created yet</div>
            ) : (
              queues.slice(0, 5).map(queue => (
                <div key={queue.id} className="list-item">
                  <div className="list-item-header">
                    <span className="list-item-title">{queue.name}</span>
                    <span className="badge badge-info">
                      {queue.currentSize || 0}/{queue.maxSize}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    Subscribers: {queue.subscribers?.length || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Active Bottlenecks</h3>
          <div className="list">
            {bottlenecks.length === 0 ? (
              <div className="empty-state">✅ No bottlenecks detected</div>
            ) : (
              bottlenecks.slice(0, 5).map((bottleneck, index) => (
                <div key={index} className="list-item">
                  <div className="list-item-header">
                    <span className="list-item-title">{bottleneck.type} - {bottleneck.resourceId}</span>
                    <span className={`badge badge-${
                      bottleneck.severity === 'critical' ? 'error' : 
                      bottleneck.severity === 'high' ? 'warning' : 'info'
                    }`}>
                      {bottleneck.severity}
                    </span>
                  </div>
                  <div className="list-item-meta">{bottleneck.message}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Deadlock Status</h3>
          <div className="list">
            {deadlocks.length === 0 ? (
              <div className="empty-state">✅ No deadlocks detected</div>
            ) : (
              deadlocks.map((deadlock, index) => (
                <div key={index} className="list-item">
                  <div className="list-item-header">
                    <span className="list-item-title">Cycle: {deadlock.cycle?.join(' → ')}</span>
                    <span className={`badge ${deadlock.resolved ? 'badge-success' : 'badge-error'}`}>
                      {deadlock.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  <div className="list-item-meta">
                    Resources: {deadlock.resources?.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
