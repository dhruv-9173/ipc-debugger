import { useState, useEffect } from 'react'
import { useIPCStore } from '../services/store'
import { queueSimulator, analysisSimulator } from '../services/simulator'
import './QueueManager.css'

function QueueManager() {
  const { queues, updateQueues, addQueue, removeQueue, addNotification } = useIPCStore()
  const [queueName, setQueueName] = useState('')
  const [maxSize, setMaxSize] = useState(5)
  const [selectedQueue, setSelectedQueue] = useState(null)
  const [message, setMessage] = useState('')
  const [sender, setSender] = useState('')
  const [receiver, setReceiver] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadQueues()
  }, [])

  const loadQueues = () => {
    try {
      const data = queueSimulator.getAll()
      updateQueues(data)
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to load queues: ${error.message}`,
        severity: 'error'
      })
    }
  }

  const handleCreateQueue = (e) => {
    e.preventDefault()
    if (!queueName) {
      addNotification({
        type: 'error',
        message: 'Queue name is required',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const queue = queueSimulator.create(queueName, maxSize)
      addQueue(queue)
      addNotification({
        type: 'success',
        message: `Queue "${queueName}" created successfully`,
        severity: 'success'
      })
      setQueueName('')
      setMaxSize(5)
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to create queue: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!selectedQueue || !message || !sender) {
      addNotification({
        type: 'error',
        message: 'Please select a queue and fill all fields',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const result = queueSimulator.send(selectedQueue.id, message, sender)
      if (result.success) {
        analysisSimulator.recordTransfer('queue', selectedQueue.id, message.length)
        addNotification({
          type: 'success',
          message: `Message sent to queue "${selectedQueue.name}"`,
          severity: 'success'
        })
        setMessage('')
        setSender('')
      } else {
        addNotification({
          type: result.bottleneck ? 'warning' : 'error',
          message: result.error,
          severity: result.bottleneck ? 'warning' : 'error'
        })
      }
      loadQueues()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to send message: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveMessage = (e) => {
    e.preventDefault()
    if (!selectedQueue || !receiver) {
      addNotification({
        type: 'error',
        message: 'Please select a queue and enter receiver name',
        severity: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const result = queueSimulator.receive(selectedQueue.id, receiver)
      if (result.success && result.message) {
        addNotification({
          type: 'success',
          message: `Received: ${result.message.data}`,
          severity: 'info'
        })
      } else {
        addNotification({
          type: 'warning',
          message: 'Queue is empty',
          severity: 'warning'
        })
      }
      setReceiver('')
      loadQueues()
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to receive message: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQueue = (queueId) => {
    if (!confirm('Are you sure you want to delete this queue?')) return

    setLoading(true)
    try {
      queueSimulator.delete(queueId)
      removeQueue(queueId)
      addNotification({
        type: 'success',
        message: 'Queue deleted successfully',
        severity: 'success'
      })
      if (selectedQueue?.id === queueId) {
        setSelectedQueue(null)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: `Failed to delete queue: ${error.message}`,
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="queue-manager">
      <div className="manager-header">
        <h2>Message Queue Manager</h2>
        <p className="manager-subtitle">Create and manage message queues for asynchronous communication</p>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3 className="card-title">Create Queue</h3>
          <form onSubmit={handleCreateQueue} className="form">
            <div className="form-group">
              <label className="label">Queue Name</label>
              <input
                type="text"
                className="input"
                placeholder="Enter queue name"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label">Max Size</label>
              <input
                type="number"
                className="input"
                placeholder="Maximum queue size"
                value={maxSize}
                onChange={(e) => setMaxSize(parseInt(e.target.value) || 5)}
                disabled={loading}
                min="5"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '📬 Create Queue'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Send Message</h3>
          <form onSubmit={handleSendMessage} className="form">
            <div className="form-group">
              <label className="label">Select Queue</label>
              <select
                className="input"
                value={selectedQueue?.id || ''}
                onChange={(e) => setSelectedQueue(queues.find(q => q.id === e.target.value))}
                disabled={loading}
              >
                <option value="">Choose a queue...</option>
                {queues.map(queue => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name} ({queue.currentSize || 0}/{queue.maxSize})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Sender</label>
              <input
                type="text"
                className="input"
                placeholder="Sender process name"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="label">Message</label>
              <textarea
                className="input textarea"
                placeholder="Enter message content..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading || !selectedQueue}>
              {loading ? 'Sending...' : '📤 Send Message'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title">Receive Message</h3>
          <form onSubmit={handleReceiveMessage} className="form">
            <div className="form-group">
              <label className="label">Select Queue</label>
              <select
                className="input"
                value={selectedQueue?.id || ''}
                onChange={(e) => setSelectedQueue(queues.find(q => q.id === e.target.value))}
                disabled={loading}
              >
                <option value="">Choose a queue...</option>
                {queues.map(queue => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name} ({queue.currentSize || 0}/{queue.maxSize})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Receiver</label>
              <input
                type="text"
                className="input"
                placeholder="Receiver process name"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-success" disabled={loading || !selectedQueue}>
              {loading ? 'Receiving...' : '📥 Receive Message'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Active Queues ({queues.length})</h3>
        <div className="queues-list">
          {queues.length === 0 ? (
            <div className="empty-state">
              No message queues created yet. Create your first queue to enable asynchronous messaging.
            </div>
          ) : (
            queues.map(queue => (
              <div key={queue.id} className="queue-card">
                <div className="queue-header">
                  <div className="queue-title">
                    <h4>{queue.name}</h4>
                    <div className="queue-capacity">
                      <div className="capacity-bar">
                        <div 
                          className="capacity-fill"
                          style={{
                            width: `${((queue.currentSize || 0) / queue.maxSize) * 100}%`,
                            background: (queue.currentSize || 0) / queue.maxSize > 0.8 ? 'var(--error-color)' : 'var(--primary-color)'
                          }}
                        />
                      </div>
                      <span className="capacity-text">
                        {queue.currentSize || 0} / {queue.maxSize}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteQueue(queue.id)}
                    disabled={loading}
                    title="Delete queue"
                  >
                    🗑️
                  </button>
                </div>

                <div className="queue-messages">
                  <div className="messages-header">
                    <span>Recent Messages</span>
                    <span className="badge badge-info">{queue.messages?.length || 0} messages</span>
                  </div>
                  {queue.messages && queue.messages.length > 0 ? (
                    <div className="messages-list">
                      {queue.messages.slice(-5).map((msg, idx) => (
                        <div key={idx} className="message-item">
                          <div className="message-header">
                            <span className="message-sender">From: {msg.sender}</span>
                            <span className="message-time">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="message-content">{msg.data}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="messages-empty">No messages in queue</div>
                  )}
                </div>

                <div className="queue-stats">
                  <div className="stat-item">
                    <span className="stat-label">Subscribers:</span>
                    <span className="stat-value">{queue.subscribers?.length || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Sent:</span>
                    <span className="stat-value">{queue.stats?.totalSent || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Received:</span>
                    <span className="stat-value">{queue.stats?.totalReceived || 0}</span>
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

export default QueueManager
