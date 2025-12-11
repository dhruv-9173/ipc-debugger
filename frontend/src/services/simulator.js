// In-memory IPC simulation - No backend required

class PipeSimulator {
  constructor() {
    this.pipes = []
    this.listeners = []
  }

  subscribe(listener) {
    this.listeners.push(listener)
  }

  notify() {
    this.listeners.forEach(l => l([...this.pipes]))
  }

  create(processA, processB) {
    const pipe = {
      id: Date.now().toString() + Math.random(),
      processA,
      processB,
      bufferA: [],
      bufferB: [],
      status: 'active',
      stats: { messagesAtoB: 0, messagesBtoA: 0 },
      createdAt: Date.now()
    }
    this.pipes.push(pipe)
    this.notify()
    return pipe
  }

  send(pipeId, data, direction) {
    const pipe = this.pipes.find(p => p.id === pipeId)
    if (!pipe) return { success: false, error: 'Pipe not found' }

    if (direction === 'AtoB') {
      if (pipe.bufferA.length >= 100) {
        return { success: false, error: 'Buffer full', bottleneck: true }
      }
      pipe.bufferA.push(data)
      pipe.stats.messagesAtoB++
    } else {
      if (pipe.bufferB.length >= 100) {
        return { success: false, error: 'Buffer full', bottleneck: true }
      }
      pipe.bufferB.push(data)
      pipe.stats.messagesBtoA++
    }
    
    this.notify()
    return { success: true }
  }

  read(pipeId, direction) {
    const pipe = this.pipes.find(p => p.id === pipeId)
    if (!pipe) return { success: false, error: 'Pipe not found' }

    const buffer = direction === 'AtoB' ? pipe.bufferA : pipe.bufferB
    if (buffer.length === 0) {
      return { success: false, error: 'Buffer empty' }
    }

    const message = buffer.shift()
    this.notify()
    return { success: true, message }
  }

  delete(pipeId) {
    this.pipes = this.pipes.filter(p => p.id !== pipeId)
    this.notify()
    return true
  }

  getAll() {
    return [...this.pipes]
  }
}

class QueueSimulator {
  constructor() {
    this.queues = []
    this.listeners = []
  }

  subscribe(listener) {
    this.listeners.push(listener)
  }

  notify() {
    this.listeners.forEach(l => l([...this.queues]))
  }

  create(name, maxSize = 1000) {
    const queue = {
      id: Date.now().toString() + Math.random(),
      name,
      maxSize,
      currentSize: 0,
      messages: [],
      subscribers: [],
      stats: { totalSent: 0, totalReceived: 0 },
      createdAt: Date.now()
    }
    this.queues.push(queue)
    this.notify()
    return queue
  }

  send(queueId, message, sender) {
    const queue = this.queues.find(q => q.id === queueId)
    if (!queue) return { success: false, error: 'Queue not found' }

    if (queue.messages.length >= queue.maxSize) {
      return { success: false, error: 'Queue full', bottleneck: true }
    }

    queue.messages.push({
      data: message,
      sender,
      timestamp: Date.now()
    })
    queue.currentSize = queue.messages.length
    queue.stats.totalSent++
    
    if (!queue.subscribers.includes(sender)) {
      queue.subscribers.push(sender)
    }

    this.notify()
    return { success: true }
  }

  receive(queueId, receiver) {
    const queue = this.queues.find(q => q.id === queueId)
    if (!queue) return { success: false, error: 'Queue not found' }

    if (queue.messages.length === 0) {
      return { success: false, error: 'Queue is empty' }
    }

    const message = queue.messages.shift()
    queue.currentSize = queue.messages.length
    queue.stats.totalReceived++
    
    if (!queue.subscribers.includes(receiver)) {
      queue.subscribers.push(receiver)
    }

    this.notify()
    return { success: true, message }
  }

  delete(queueId) {
    this.queues = this.queues.filter(q => q.id !== queueId)
    this.notify()
    return true
  }

  getAll() {
    return [...this.queues]
  }
}

class MemorySimulator {
  constructor() {
    this.memories = []
    this.listeners = []
    this.lockWaitTimes = {}
  }

  subscribe(listener) {
    this.listeners.push(listener)
  }

  notify() {
    this.listeners.forEach(l => l([...this.memories]))
  }

  create(name, size = 1024) {
    const memory = {
      id: Date.now().toString() + Math.random(),
      name,
      size,
      data: {},
      locked: false,
      lockedBy: null,
      lockAcquiredAt: null,
      stats: { reads: 0, writes: 0, locks: 0 },
      createdAt: Date.now()
    }
    this.memories.push(memory)
    this.notify()
    return memory
  }

  lock(memoryId, processId) {
    const memory = this.memories.find(m => m.id === memoryId)
    if (!memory) return { success: false, error: 'Memory not found' }

    if (memory.locked) {
      // Track wait time for deadlock detection
      if (!this.lockWaitTimes[memoryId]) {
        this.lockWaitTimes[memoryId] = {}
      }
      this.lockWaitTimes[memoryId][processId] = Date.now()
      return { success: false, error: `Memory locked by ${memory.lockedBy}` }
    }

    memory.locked = true
    memory.lockedBy = processId
    memory.lockAcquiredAt = Date.now()
    memory.stats.locks++
    
    // Clear wait time
    if (this.lockWaitTimes[memoryId]) {
      delete this.lockWaitTimes[memoryId][processId]
    }

    this.notify()
    return { success: true }
  }

  unlock(memoryId, processId) {
    const memory = this.memories.find(m => m.id === memoryId)
    if (!memory) return { success: false, error: 'Memory not found' }

    if (!memory.locked) {
      return { success: false, error: 'Memory not locked' }
    }

    if (memory.lockedBy !== processId) {
      return { success: false, error: 'Memory locked by another process' }
    }

    memory.locked = false
    memory.lockedBy = null
    memory.lockAcquiredAt = null

    this.notify()
    return { success: true }
  }

  write(memoryId, processId, data) {
    const memory = this.memories.find(m => m.id === memoryId)
    if (!memory) return { success: false, error: 'Memory not found', deadlock: false }

    // Check if locked by another process
    if (memory.locked && memory.lockedBy !== processId) {
      return { 
        success: false, 
        error: `Memory locked by ${memory.lockedBy}`,
        deadlock: this.checkDeadlock(memoryId, processId)
      }
    }

    memory.data = { ...memory.data, ...data }
    memory.stats.writes++
    this.notify()
    return { success: true, deadlock: false }
  }

  read(memoryId, processId) {
    const memory = this.memories.find(m => m.id === memoryId)
    if (!memory) return { success: false, error: 'Memory not found', data: {}, deadlock: false }

    // Check if locked by another process
    if (memory.locked && memory.lockedBy !== processId) {
      return { 
        success: false, 
        error: `Memory locked by ${memory.lockedBy}`,
        data: {},
        deadlock: this.checkDeadlock(memoryId, processId)
      }
    }

    memory.stats.reads++
    this.notify()
    return { success: true, data: memory.data, deadlock: false }
  }

  checkDeadlock(memoryId, processId) {
    // Simple deadlock detection: if process waits too long
    if (this.lockWaitTimes[memoryId] && this.lockWaitTimes[memoryId][processId]) {
      const waitTime = Date.now() - this.lockWaitTimes[memoryId][processId]
      return waitTime > 5000 // 5 seconds timeout
    }
    return false
  }

  delete(memoryId) {
    this.memories = this.memories.filter(m => m.id !== memoryId)
    delete this.lockWaitTimes[memoryId]
    this.notify()
    return true
  }

  getAll() {
    return [...this.memories]
  }
}

class AnalysisSimulator {
  constructor(pipeSimulator, queueSimulator, memorySimulator) {
    this.pipes = pipeSimulator
    this.queues = queueSimulator
    this.memories = memorySimulator
    this.bottlenecks = []
    this.deadlocks = []
    this.transferHistory = []
  }

  recordTransfer(type, resourceId, size) {
    this.transferHistory.push({
      type,
      resourceId,
      size,
      timestamp: Date.now()
    })
    
    // Keep only recent history
    if (this.transferHistory.length > 1000) {
      this.transferHistory = this.transferHistory.slice(-500)
    }
  }

  detectBottlenecks() {
    this.bottlenecks = []

    // Check pipes for full buffers
    this.pipes.getAll().forEach(pipe => {
      if (pipe.bufferA.length > 80) {
        this.bottlenecks.push({
          type: 'pipe',
          resourceId: pipe.id,
          severity: pipe.bufferA.length > 95 ? 'critical' : 'high',
          message: `Buffer A→B is ${Math.round(pipe.bufferA.length)}% full`,
          timestamp: Date.now()
        })
      }
      if (pipe.bufferB.length > 80) {
        this.bottlenecks.push({
          type: 'pipe',
          resourceId: pipe.id,
          severity: pipe.bufferB.length > 95 ? 'critical' : 'high',
          message: `Buffer B→A is ${Math.round(pipe.bufferB.length)}% full`,
          timestamp: Date.now()
        })
      }
    })

    // Check queues for capacity
    this.queues.getAll().forEach(queue => {
      const usage = (queue.currentSize / queue.maxSize) * 100
      if (usage > 80) {
        this.bottlenecks.push({
          type: 'queue',
          resourceId: queue.id,
          severity: usage > 95 ? 'critical' : usage > 90 ? 'high' : 'medium',
          message: `Queue "${queue.name}" is ${Math.round(usage)}% full`,
          timestamp: Date.now()
        })
      }
    })

    // Check memory for long locks
    this.memories.getAll().forEach(memory => {
      if (memory.locked && memory.lockAcquiredAt) {
        const lockDuration = Date.now() - memory.lockAcquiredAt
        if (lockDuration > 3000) {
          this.bottlenecks.push({
            type: 'memory',
            resourceId: memory.id,
            severity: lockDuration > 10000 ? 'critical' : 'high',
            message: `Memory "${memory.name}" locked for ${Math.round(lockDuration / 1000)}s by ${memory.lockedBy}`,
            timestamp: Date.now()
          })
        }
      }
    })

    return this.bottlenecks
  }

  detectDeadlocks() {
    this.deadlocks = []

    // Simple deadlock detection: check for locked memories with waiting processes
    const lockedMemories = this.memories.getAll().filter(m => m.locked)
    const waitingProcesses = Object.entries(this.memories.lockWaitTimes || {})

    waitingProcesses.forEach(([memoryId, processes]) => {
      Object.entries(processes).forEach(([processId, waitTime]) => {
        const duration = Date.now() - waitTime
        if (duration > 5000) {
          const memory = this.memories.getAll().find(m => m.id === memoryId)
          if (memory && memory.locked) {
            this.deadlocks.push({
              type: 'memory',
              resourceId: memoryId,
              cycle: [processId, memory.lockedBy],
              resources: [memory.name],
              message: `Potential deadlock: ${processId} waiting for lock held by ${memory.lockedBy}`,
              resolved: false,
              timestamp: Date.now()
            })
          }
        }
      })
    })

    return this.deadlocks
  }

  getBottlenecks() {
    return this.detectBottlenecks()
  }

  getDeadlocks() {
    return this.detectDeadlocks()
  }

  reset() {
    this.bottlenecks = []
    this.deadlocks = []
    this.transferHistory = []
  }
}

// Export singleton instances
export const pipeSimulator = new PipeSimulator()
export const queueSimulator = new QueueSimulator()
export const memorySimulator = new MemorySimulator()
export const analysisSimulator = new AnalysisSimulator(pipeSimulator, queueSimulator, memorySimulator)
