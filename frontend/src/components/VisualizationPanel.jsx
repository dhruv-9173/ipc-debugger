import { useEffect, useRef, useState } from 'react'
import { useIPCStore } from '../services/store'
import './VisualizationPanel.css'

function VisualizationPanel() {
  const { pipes, queues, memories, bottlenecks, deadlocks } = useIPCStore()
  const canvasRef = useRef(null)
  const [viewMode, setViewMode] = useState('topology') // topology, bottlenecks, deadlocks

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'

    // Clear canvas
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, rect.width, rect.height)

    if (viewMode === 'topology') {
      drawTopology(ctx, rect.width, rect.height)
    } else if (viewMode === 'bottlenecks') {
      drawBottlenecks(ctx, rect.width, rect.height)
    } else if (viewMode === 'deadlocks') {
      drawDeadlocks(ctx, rect.width, rect.height)
    }
  }, [pipes, queues, memories, bottlenecks, deadlocks, viewMode])

  const drawTopology = (ctx, width, height) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 3

    // Draw center hub
    ctx.fillStyle = '#6366f1'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f1f5f9'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('IPC Hub', centerX, centerY + 5)

    // Draw pipes
    pipes.forEach((pipe, idx) => {
      const angle = (idx / pipes.length) * Math.PI * 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Draw connection line
      ctx.strokeStyle = pipe.status === 'active' ? '#10b981' : '#ef4444'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()

      // Draw pipe node
      ctx.fillStyle = '#1e293b'
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, y, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(pipe.processA, x, y - 5)
      ctx.fillText('↔', x, y + 7)
      ctx.fillText(pipe.processB, x, y + 18)
    })

    // Draw queues
    const queueStartAngle = Math.PI / 4
    queues.forEach((queue, idx) => {
      const angle = queueStartAngle + (idx / Math.max(queues.length, 1)) * Math.PI / 2
      const x = centerX + Math.cos(angle) * (radius + 80)
      const y = centerY + Math.sin(angle) * (radius + 80)

      // Draw connection
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw queue node
      ctx.fillStyle = '#1e293b'
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(x - 40, y - 25, 80, 50, 8)
      ctx.fill()
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(queue.name, x, y)
      ctx.font = '10px sans-serif'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(`${queue.currentSize || 0}/${queue.maxSize}`, x, y + 15)
    })

    // Draw memories
    const memStartAngle = Math.PI * 1.25
    memories.forEach((memory, idx) => {
      const angle = memStartAngle + (idx / Math.max(memories.length, 1)) * Math.PI / 2
      const x = centerX + Math.cos(angle) * (radius + 80)
      const y = centerY + Math.sin(angle) * (radius + 80)

      // Draw connection
      ctx.strokeStyle = memory.locked ? '#ef4444' : '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([2, 8])
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw memory node
      ctx.fillStyle = '#1e293b'
      ctx.strokeStyle = memory.locked ? '#ef4444' : '#3b82f6'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.rect(x - 35, y - 30, 70, 60)
      ctx.fill()
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(memory.name, x, y - 5)
      ctx.font = '10px sans-serif'
      ctx.fillText(memory.locked ? '🔒 Locked' : '🔓 Free', x, y + 10)
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(`${memory.size}B`, x, y + 23)
    })
  }

  const drawBottlenecks = (ctx, width, height) => {
    if (bottlenecks.length === 0) {
      ctx.fillStyle = '#10b981'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('✅ No Bottlenecks Detected', width / 2, height / 2)
      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText('System is performing optimally', width / 2, height / 2 + 35)
      return
    }

    const barHeight = 40
    const barSpacing = 20
    const startY = 50

    bottlenecks.slice(0, 10).forEach((bottleneck, idx) => {
      const y = startY + idx * (barHeight + barSpacing)
      
      // Severity color
      const colors = {
        critical: '#ef4444',
        high: '#f59e0b',
        medium: '#3b82f6',
        low: '#10b981'
      }
      const color = colors[bottleneck.severity] || colors.low

      // Draw bar
      ctx.fillStyle = color + '40'
      ctx.fillRect(100, y, width - 200, barHeight)
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(100, y, width - 200, barHeight)

      // Draw label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${bottleneck.type} - ${bottleneck.resourceId}`, 110, y + 15)
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(bottleneck.message, 110, y + 32)

      // Draw severity badge
      ctx.fillStyle = color
      ctx.fillRect(10, y, 80, barHeight)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(bottleneck.severity.toUpperCase(), 50, y + barHeight / 2 + 4)
    })
  }

  const drawDeadlocks = (ctx, width, height) => {
    if (deadlocks.length === 0) {
      ctx.fillStyle = '#10b981'
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('✅ No Deadlocks Detected', width / 2, height / 2)
      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText('All resources properly synchronized', width / 2, height / 2 + 35)
      return
    }

    deadlocks.forEach((deadlock, dlIdx) => {
      if (!deadlock.cycle) return

      const cycle = deadlock.cycle
      const nodeRadius = 50
      const cycleRadius = 150
      const centerX = width / 2 + (dlIdx % 2) * 200 - 100
      const centerY = height / 2 + Math.floor(dlIdx / 2) * 300 - 100

      // Draw cycle
      cycle.forEach((process, idx) => {
        const angle = (idx / cycle.length) * Math.PI * 2 - Math.PI / 2
        const x = centerX + Math.cos(angle) * cycleRadius
        const y = centerY + Math.sin(angle) * cycleRadius

        // Draw node
        ctx.fillStyle = deadlock.resolved ? '#10b981' : '#ef4444'
        ctx.beginPath()
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2)
        ctx.fill()

        // Draw label
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(process, x, y + 5)

        // Draw arrow to next
        const nextIdx = (idx + 1) % cycle.length
        const nextAngle = (nextIdx / cycle.length) * Math.PI * 2 - Math.PI / 2
        const nextX = centerX + Math.cos(nextAngle) * cycleRadius
        const nextY = centerY + Math.sin(nextAngle) * cycleRadius

        // Arrow line
        ctx.strokeStyle = deadlock.resolved ? '#10b981' : '#ef4444'
        ctx.lineWidth = 3
        ctx.beginPath()
        
        const startX = x + Math.cos(nextAngle) * (nodeRadius + 5)
        const startY = y + Math.sin(nextAngle) * (nodeRadius + 5)
        const endX = nextX - Math.cos(nextAngle) * (nodeRadius + 15)
        const endY = nextY - Math.sin(nextAngle) * (nodeRadius + 15)
        
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Arrow head
        const headlen = 15
        const angle2 = Math.atan2(endY - startY, endX - startX)
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(endX - headlen * Math.cos(angle2 - Math.PI / 6), endY - headlen * Math.sin(angle2 - Math.PI / 6))
        ctx.lineTo(endX - headlen * Math.cos(angle2 + Math.PI / 6), endY - headlen * Math.sin(angle2 + Math.PI / 6))
        ctx.closePath()
        ctx.fillStyle = deadlock.resolved ? '#10b981' : '#ef4444'
        ctx.fill()
      })

      // Draw deadlock label
      ctx.fillStyle = '#f1f5f9'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(deadlock.resolved ? '✅ Resolved' : '🔴 Deadlock', centerX, centerY - cycleRadius - 30)
    })
  }

  return (
    <div className="visualization-panel">
      <div className="visualization-header">
        <div>
          <h2>System Visualization</h2>
          <p className="visualization-subtitle">Interactive visual representation of IPC state</p>
        </div>
        <div className="view-controls">
          <button
            className={`view-btn ${viewMode === 'topology' ? 'active' : ''}`}
            onClick={() => setViewMode('topology')}
          >
            🌐 Topology
          </button>
          <button
            className={`view-btn ${viewMode === 'bottlenecks' ? 'active' : ''}`}
            onClick={() => setViewMode('bottlenecks')}
          >
            ⚠️ Bottlenecks
          </button>
          <button
            className={`view-btn ${viewMode === 'deadlocks' ? 'active' : ''}`}
            onClick={() => setViewMode('deadlocks')}
          >
            🔴 Deadlocks
          </button>
        </div>
      </div>

      <div className="visualization-canvas-container">
        <canvas ref={canvasRef} className="visualization-canvas" />
      </div>

      <div className="visualization-legend">
        {viewMode === 'topology' && (
          <>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#6366f1' }}></span>
              <span>Active Pipes</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f59e0b' }}></span>
              <span>Message Queues</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#3b82f6' }}></span>
              <span>Shared Memory</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#ef4444' }}></span>
              <span>Locked Resources</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default VisualizationPanel
