import { useState } from 'react'
import './styles/App.css'
import Dashboard from './components/Dashboard'
import PipeManager from './components/PipeManager'
import QueueManager from './components/QueueManager'
import MemoryManager from './components/MemoryManager'
import AnalysisPanel from './components/AnalysisPanel'
import VisualizationPanel from './components/VisualizationPanel'
import NotificationCenter from './components/NotificationCenter'
import { useIPCStore } from './services/store'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { notifications } = useIPCStore()

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="icon">⚡</span>
            IPC Debugger
            <span className="version-badge">Frontend Only</span>
          </h1>
        </div>
        <nav className="main-nav">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'pipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipes')}
          >
            🔗 Pipes
          </button>
          <button 
            className={`nav-btn ${activeTab === 'queues' ? 'active' : ''}`}
            onClick={() => setActiveTab('queues')}
          >
            📬 Message Queues
          </button>
          <button 
            className={`nav-btn ${activeTab === 'memory' ? 'active' : ''}`}
            onClick={() => setActiveTab('memory')}
          >
            💾 Shared Memory
          </button>
          <button 
            className={`nav-btn ${activeTab === 'visualization' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualization')}
          >
            🎨 Visualization
          </button>
          <button 
            className={`nav-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🔍 Analysis
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'pipes' && <PipeManager />}
        {activeTab === 'queues' && <QueueManager />}
        {activeTab === 'memory' && <MemoryManager />}
        {activeTab === 'visualization' && <VisualizationPanel />}
        {activeTab === 'analysis' && <AnalysisPanel />}
      </main>

      <NotificationCenter notifications={notifications} />
    </div>
  )
}

export default App
