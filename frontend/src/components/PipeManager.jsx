import { useState, useEffect } from 'react'
import { useIPCStore } from '../services/store'
import { pipeSimulator, analysisSimulator } from '../services/simulator'
import './PipeManager.css'

function PipeManager() {
  const { pipes, updatePipes, addPipe, removePipe, addNotification } = useIPCStore()
  const [processA, setProcessA] = useState('')
  const [processB, setProcessB] = useState('')
  const [selectedPipe, setSelectedPipe] = useState(null)
  const [sendData, setSendData] = useState('')
  const [direction, setDirection] = useState('AtoB')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPipes()
  }, [])

  const loadPipes = () => {
    try {
      const data = pipeSimulator.getAll()
      updatePipes(data)
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to load pipes: ${error.message}`,
        severity: 'error'
      })
    }
  }

  const handleCreatePipe = (e) => {
    e.preventDefault()
    if (!processA || !processB) {
      addNotification({
        type: 'error',
        message: 'Both process names are required',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const pipe = pipeSimulator.create(processA, processB)
      addPipe(pipe)
      addNotification({
        type: 'success',
        message: `Pipe created between ${processA} and ${processB}`,
        severity: 'success'
      })
      setProcessA('')
      setProcessB('')
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to create pipe: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendData = (e) => {
    e.preventDefault()
    if (!selectedPipe || !sendData) {
      addNotification({
        type: 'error',
        message: 'Please select a pipe and enter data',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const result = pipeSimulator.send(selectedPipe.id, sendData, direction)
      if (result.success) {
        analysisSimulator.recordTransfer('pipe', selectedPipe.id, sendData.length)
        addNotification({
          type: 'success',
          message: `Data sent through pipe (${direction})`,
          severity: 'success'
        })
        setSendData('')
      } else {
        addNotification({
          type: result.bottleneck ? 'warning' : 'error',
          message: result.error,
          severity: result.bottleneck ? 'warning' : 'error'
        })
      }
      loadPipes()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to send data: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReadData = (pipe, dir) => {
    setLoading(true)
    try {
      const result = pipeSimulator.read(pipe.id, dir)
      if (result.success) {
        addNotification({
          type: 'success',
          message: `Read from pipe: ${result.message || 'No data'}`,
          severity: 'info'
        })
      } else {
        addNotification({
          type: 'warning',
          message: result.error,
          severity: 'warning'
        })
      }
      loadPipes()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to read data: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePipe = (pipeId) => {
    if (!confirm('Are you sure you want to delete this pipe?')) return

    setLoading(true)
    try {
      pipeSimulator.delete(pipeId)
      removePipe(pipeId)
      addNotification({
        type: 'success',
        message: 'Pipe deleted successfully',
        severity: 'success'
      })
      if (selectedPipe?.id === pipeId) {
        setSelectedPipe(null)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to delete pipe: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pipe-manager">
      <div className="manager-header">
        <h2>Pipe Manager</h2>
        <p className="manager-subtitle">Create and manage bidirectional communication pipes</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Create New Pipe</h3>
          <form onSubmit={handleCreatePipe} className="form">
            <div className="form-group">
              <label className="label">Process A</label>
              <input
                type="text"
                className="input"
                placeholder="Enter process name (e.g., Producer)"
                value={processA}
                onChange={(e) => setProcessA(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label">Process B</label>
              <input
                type="text"
                className="input"
                placeholder="Enter process name (e.g., Consumer)"
                value={processB}
                onChange={(e) => setProcessB(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '🔗 Create Pipe'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Send Data</h3>
          <form onSubmit={handleSendData} className="form">
            <div className="form-group">
              <label className="label">Select Pipe</label>
              <select
                className="input"
                value={selectedPipe?.id || ''}
                onChange={(e) => setSelectedPipe(pipes.find(p => p.id === e.target.value))}
                disabled={loading}
              >
                <option value="">Choose a pipe...</option>
                {pipes.map(pipe => (
                  <option key={pipe.id} value={pipe.id}>
                    {pipe.processA} ↔ {pipe.processB}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Direction</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="direction"
                    value="AtoB"
                    checked={direction === 'AtoB'}
                    onChange={(e) => setDirection(e.target.value)}
                    disabled={loading}
                  />
                  <span>{selectedPipe ? `${selectedPipe.processA} → ${selectedPipe.processB}` : 'A → B'}</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="direction"
                    value="BtoA"
                    checked={direction === 'BtoA'}
                    onChange={(e) => setDirection(e.target.value)}
                    disabled={loading}
                  />
                  <span>{selectedPipe ? `${selectedPipe.processB} → ${selectedPipe.processA}` : 'B → A'}</span>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Data</label>
              <textarea
                className="input textarea"
                placeholder="Enter data to send through pipe..."
                value={sendData}
                onChange={(e) => setSendData(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedPipe}>
              {loading ? 'Sending...' : '📤 Send Data'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Active Pipes ({pipes.length})</h3>
        <div className="pipes-list">
          {pipes.length === 0 ? (
            <div className="empty-state">
              No pipes created yet. Create your first pipe to enable inter-process communication.
            </div>
          ) : (
            pipes.map(pipe => (
              <div key={pipe.id} className="pipe-card">
                <div className="pipe-header">
                  <div className="pipe-title">
                    <span className="process-badge">{pipe.processA}</span>
                    <span className="pipe-connector">↔</span>
                    <span className="process-badge">{pipe.processB}</span>
                  </div>
                  <div className="pipe-actions">
                    <span className={`badge badge-${pipe.status === 'active' ? 'success' : 'error'}`}>
                      {pipe.status}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => handleDeletePipe(pipe.id)}
                      disabled={loading}
                      title="Delete pipe"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="pipe-buffers">
                  <div className="buffer-section">
                    <div className="buffer-header">
                      <span className="buffer-label">Buffer A→B</span>
                      <span className="buffer-count">{pipe.bufferA?.length || 0} messages</span>
                    </div>
                    <div className="buffer-content">
                      {pipe.bufferA && pipe.bufferA.length > 0 ? (
                        <div className="buffer-messages">
                          {pipe.bufferA.slice(-3).map((msg, idx) => (
                            <div key={idx} className="buffer-message">{msg}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="buffer-empty">Empty</div>
                      )}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReadData(pipe, 'AtoB')}
                      disabled={loading || !pipe.bufferA?.length}
                    >
                      📥 Read
                    </button>
                  </div>

                  <div className="buffer-section">
                    <div className="buffer-header">
                      <span className="buffer-label">Buffer B→A</span>
                      <span className="buffer-count">{pipe.bufferB?.length || 0} messages</span>
                    </div>
                    <div className="buffer-content">
                      {pipe.bufferB && pipe.bufferB.length > 0 ? (
                        <div className="buffer-messages">
                          {pipe.bufferB.slice(-3).map((msg, idx) => (
                            <div key={idx} className="buffer-message">{msg}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="buffer-empty">Empty</div>
                      )}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReadData(pipe, 'BtoA')}
                      disabled={loading || !pipe.bufferB?.length}
                    >
                      📥 Read
                    </button>
                  </div>
                </div>

                <div className="pipe-stats">
                  <div className="stat-item">
                    <span className="stat-label">Messages A→B:</span>
                    <span className="stat-value">{pipe.stats?.messagesAtoB || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Messages B→A:</span>
                    <span className="stat-value">{pipe.stats?.messagesBtoA || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default PipeManager
