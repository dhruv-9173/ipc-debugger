import { useState, useEffect } from 'react'
import { useIPCStore } from '../services/store'
import { memorySimulator, analysisSimulator } from '../services/simulator'
import './MemoryManager.css'

function MemoryManager() {
  const { memories, updateMemories, addMemory, removeMemory, addNotification } = useIPCStore()
  const [memoryName, setMemoryName] = useState('')
  const [memorySize, setMemorySize] = useState(1024)
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [processId, setProcessId] = useState('')
  const [writeData, setWriteData] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = () => {
    try {
      const data = memorySimulator.getAll()
      updateMemories(data)
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to load memory segments: ${error.message}`,
        severity: 'error'
      })
    }
  }

  const handleCreateMemory = (e) => {
    e.preventDefault()
    if (!memoryName) {
      addNotification({
        type: 'error',
        message: 'Memory name is required',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const memory = memorySimulator.create(memoryName, memorySize)
      addMemory(memory)
      addNotification({
        type: 'success',
        message: `Memory segment "${memoryName}" created`,
        severity: 'success'
      })
      setMemoryName('')
      setMemorySize(1024)
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to create memory: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWrite = (e) => {
    e.preventDefault()
    if (!selectedMemory || !processId || !writeData) {
      addNotification({
        type: 'error',
        message: 'Please fill all fields',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const result = memorySimulator.write(selectedMemory.id, processId, { value: writeData })
      analysisSimulator.recordTransfer('memory', selectedMemory.id, writeData.length)
      addNotification({
        type: result.deadlock ? 'error' : 'success',
        message: result.deadlock ? '⚠️ Deadlock detected!' : 'Data written successfully',
        severity: result.deadlock ? 'error' : 'success'
      })
      setWriteData('')
      loadMemories()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to write: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRead = () => {
    if (!selectedMemory || !processId) {
      addNotification({
        type: 'error',
        message: 'Please select memory and enter process ID',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const result = memorySimulator.read(selectedMemory.id, processId)
      addNotification({
        type: result.deadlock ? 'error' : 'info',
        message: result.deadlock ? '⚠️ Deadlock detected!' : `Read: ${JSON.stringify(result.data)}`,
        severity: result.deadlock ? 'error' : 'info'
      })
      loadMemories()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to read: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLock = (memory, procId) => {
    setLoading(true)
    try {
      const result = memorySimulator.lock(memory.id, procId)
      if (result.success) {
        addNotification({
          type: 'success',
          message: `Lock acquired by ${procId}`,
          severity: 'success'
        })
      } else {
        addNotification({
          type: 'warning',
          message: result.error,
          severity: 'warning'
        })
      }
      loadMemories()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to acquire lock: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = (memory, procId) => {
    setLoading(true)
    try {
      const result = memorySimulator.unlock(memory.id, procId)
      if (result.success) {
        addNotification({
          type: 'success',
          message: `Lock released by ${procId}`,
          severity: 'success'
        })
      } else {
        addNotification({
          type: 'error',
          message: result.error,
          severity: 'error'
        })
      }
      loadMemories()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to release lock: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMemory = (memoryId) => {
    if (!confirm('Are you sure you want to delete this memory segment?')) return

    setLoading(true)
    try {
      memorySimulator.delete(memoryId)
      removeMemory(memoryId)
      addNotification({
        type: 'success',
        message: 'Memory segment deleted',
        severity: 'success'
      })
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory(null)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to delete memory: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="memory-manager">
      <div className="manager-header">
        <h2>Shared Memory Manager</h2>
        <p className="manager-subtitle">Create and manage shared memory segments with synchronization</p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="card-title">Create Memory Segment</h3>
          <form onSubmit={handleCreateMemory} className="form">
            <div className="form-group">
              <label className="label">Memory Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter memory segment name"
                value={memoryName}
                onChange={(e) => setMemoryName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label">Size (bytes)</label>
              <input
                type="number"
                className="input"
                placeholder="Memory size in bytes"
                value={memorySize}
                onChange={(e) => setMemorySize(parseInt(e.target.value) || 1024)}
                disabled={loading}
                min="1"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '💾 Create Memory'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Read/Write Operations</h3>
          <div className="form">
            <div className="form-group">
              <label className="label">Select Memory</label>
              <select
                className="input"
                value={selectedMemory?.id || ''}
                onChange={(e) => setSelectedMemory(memories.find(m => m.id === e.target.value))}
                disabled={loading}
              >
                <option value="">Choose a memory segment...</option>
                {memories.map(memory => (
                  <option key={memory.id} value={memory.id}>
                    {memory.name} - {memory.size} bytes {memory.locked ? '🔒' : '🔓'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Process ID</label>
              <input
                type="text"
                className="input"
                placeholder="Enter process ID"
                value={processId}
                onChange={(e) => setProcessId(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label">Data to Write</label>
              <textarea
                className="input textarea"
                placeholder="Enter data to write..."
                value={writeData}
                onChange={(e) => setWriteData(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleWrite}
                disabled={loading || !selectedMemory || !processId || !writeData}
              >
                📝 Write
              </button>
              <button
                className="btn btn-success"
                onClick={handleRead}
                disabled={loading || !selectedMemory || !processId}
              >
                📖 Read
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Memory Segments ({memories.length})</h3>
        <div className="memories-list">
          {memories.length === 0 ? (
            <div className="empty-state">
              No memory segments created yet. Create your first shared memory segment.
            </div>
          ) : (
            memories.map(memory => (
              <div key={memory.id} className="memory-card">
                <div className="memory-header">
                  <div className="memory-title">
                    <h4>{memory.name}</h4>
                    <div className="memory-info">
                      <span className="badge badge-info">{memory.size} bytes</span>
                      <span className={`badge ${memory.locked ? 'badge-error' : 'badge-success'}`}>
                        {memory.locked ? '🔒 Locked' : '🔓 Unlocked'}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteMemory(memory.id)}
                    disabled={loading}
                    title="Delete memory"
                  >
                    🗑️
                  </button>
                </div>

                <div className="memory-content">
                  <div className="memory-data">
                    <div className="data-header">
                      <span>Current Data</span>
                      <span className="data-size">
                        {JSON.stringify(memory.data).length} / {memory.size} bytes
                      </span>
                    </div>
                    <div className="data-content">
                      {memory.data && Object.keys(memory.data).length > 0 ? (
                        <pre>{JSON.stringify(memory.data, null, 2)}</pre>
                      ) : (
                        <div className="data-empty">No data written yet</div>
                      )}
                    </div>
                  </div>

                  {memory.locked && memory.lockedBy && (
                    <div className="lock-info">
                      <span className="lock-label">🔒 Locked by:</span>
                      <span className="lock-process">{memory.lockedBy}</span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleUnlock(memory, memory.lockedBy)}
                        disabled={loading}
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>

                <div className="memory-actions">
                  <input
                    type="text"
                    className="input input-sm"
                    placeholder="Process ID for lock..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        handleLock(memory, e.target.value)
                        e.target.value = ''
                      }
                    }}
                    disabled={loading || memory.locked}
                  />
                </div>

                <div className="memory-stats">
                  <div className="stat-item">
                    <span className="stat-label">Reads:</span>
                    <span className="stat-value">{memory.stats?.reads || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Writes:</span>
                    <span className="stat-value">{memory.stats?.writes || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Lock Acquisitions:</span>
                    <span className="stat-value">{memory.stats?.locks || 0}</span>
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

export default MemoryManager
