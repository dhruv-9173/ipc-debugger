import { useState, useEffect } from 'react'
import { pipeSimulator, queueSimulator, memorySimulator, analysisSimulator } from './simulator'

// Simple state management using React hooks with in-memory simulation
const storeData = {
  pipes: [],
  queues: [],
  memories: [],
  bottlenecks: [],
  deadlocks: [],
  notifications: [],
  metrics: {
    totalTransfers: 0,
    activeConnections: 0,
    averageLatency: 0
  }
}

const listeners = []

const notifyListeners = () => {
  listeners.forEach(listener => listener({ ...storeData }))
}

// Subscribe to simulator changes
pipeSimulator.subscribe((pipes) => {
  storeData.pipes = pipes
  notifyListeners()
})

queueSimulator.subscribe((queues) => {
  storeData.queues = queues
  notifyListeners()
})

memorySimulator.subscribe((memories) => {
  storeData.memories = memories
  notifyListeners()
})

export const useIPCStore = () => {
  const [state, setState] = useState({ ...storeData })

  useEffect(() => {
    const listener = (newState) => setState(newState)
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    ...state,
    updatePipes: (pipes) => {
      storeData.pipes = pipes
      notifyListeners()
    },
    addPipe: (pipe) => {
      storeData.pipes.push(pipe)
      notifyListeners()
    },
    removePipe: (pipeId) => {
      storeData.pipes = storeData.pipes.filter(p => p.id !== pipeId)
      notifyListeners()
    },
    updateQueues: (queues) => {
      storeData.queues = queues
      notifyListeners()
    },
    addQueue: (queue) => {
      storeData.queues.push(queue)
      notifyListeners()
    },
    removeQueue: (queueId) => {
      storeData.queues = storeData.queues.filter(q => q.id !== queueId)
      notifyListeners()
    },
    updateMemories: (memories) => {
      storeData.memories = memories
      notifyListeners()
    },
    addMemory: (memory) => {
      storeData.memories.push(memory)
      notifyListeners()
    },
    removeMemory: (memoryId) => {
      storeData.memories = storeData.memories.filter(m => m.id !== memoryId)
      notifyListeners()
    },
    updateBottlenecks: (bottlenecks) => {
      storeData.bottlenecks = bottlenecks
      notifyListeners()
    },
    updateDeadlocks: (deadlocks) => {
      storeData.deadlocks = deadlocks
      notifyListeners()
    },
    addNotification: (notification) => {
      storeData.notifications.unshift({
        ...notification,
        id: Date.now() + Math.random()
      })
      if (storeData.notifications.length > 50) {
        storeData.notifications = storeData.notifications.slice(0, 50)
      }
      notifyListeners()
    },
    clearNotifications: () => {
      storeData.notifications = []
      notifyListeners()
    },
    updateMetrics: (metrics) => {
      storeData.metrics = { ...storeData.metrics, ...metrics }
      notifyListeners()
    }
  }
}
