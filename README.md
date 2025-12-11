<div align="center">

# 🔗 IPC Debugger

### A Frontend-Only Inter-Process Communication Simulator & Debugger

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Academic-green.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

[Features](#-features) • [Quick Start](#-quick-start) • [User Guide](#-user-guide) • [Documentation](#-documentation) • [Demo](#-demo)

![IPC Debugger Dashboard](https://via.placeholder.com/800x400/1a1a2e/eee?text=IPC+Debugger+Dashboard)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [User Guide](#-user-guide)
  - [Dashboard Overview](#1-dashboard-overview)
  - [Managing Pipes](#2-managing-pipes)
  - [Managing Message Queues](#3-managing-message-queues)
  - [Managing Shared Memory](#4-managing-shared-memory)
  - [Analysis & Visualization](#5-analysis--visualization)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)

---

## 🎯 Overview

IPC Debugger is a **completely self-contained, frontend-only** web application designed for analyzing and debugging Inter-Process Communication (IPC) mechanisms in operating systems. This project was developed as part of a BTech CSE Operating Systems course project.

The tool provides real-time simulation, visualization, and analysis of various IPC components including **pipes**, **message queues**, and **shared memory**. It helps developers understand IPC behavior, identify bottlenecks, and detect deadlocks through an intuitive React-based interface - **all running entirely in your browser with no backend server required**.

### Why Frontend-Only?

✅ **Zero Setup** - No server, database, or complex configuration  
✅ **Instant Deployment** - Deploy to any static hosting service  
✅ **Offline Capable** - Works without internet after initial load  
✅ **Fast Performance** - No network latency  
✅ **Easy Sharing** - Just send the built files

---

## 💡 Problem Statement

Design a debugging tool for inter-process communication methods (pipes, message queues, shared memory) to help developers identify issues in synchronization and data sharing between processes. Include a GUI to simulate data transfer and highlight potential bottlenecks or deadlocks.

---

## ✨ Features

### ✨ Frontend-Only Architecture
- **No Backend Required**: Complete IPC simulation runs entirely in JavaScript
- **In-Memory Simulation**: All pipes, queues, and memory segments simulated in browser
- **Instant Startup**: No server setup, database, or configuration needed
- **Portable**: Works offline once loaded - no network dependencies

### 🎨 Modern UI/UX
- **React-Based Interface**: Modern, responsive design with dark theme
- **Real-time Updates**: Live state management for instant feedback
- **Interactive Dashboard**: Comprehensive system overview with statistics
- **Visual Topology**: Canvas-based interactive visualization of IPC connections

### 🔗 IPC Mechanisms
- **Bidirectional Pipes**: Create and manage communication channels with 100-message buffers
- **Message Queues**: Priority-based asynchronous messaging with capacity management
- **Shared Memory**: Lock-based synchronization with 5-second deadlock timeout detection

### 🔍 Analysis & Debugging
- **Bottleneck Detection**: Real-time identification with severity levels (low/medium/high/critical)
- **Deadlock Analysis**: Automatic detection of circular wait conditions
- **Performance Metrics**: Track transfer counts and identify high-traffic resources
- **Visual Diagnostics**: Interactive graphs and topology visualization

### 📊 Monitoring
- **Real-time Statistics**: Live tracking of all IPC operations
- **Event Notifications**: Instant alerts for critical system events
- **Historical Analysis**: Trend analysis and pattern recognition
- **Resource Status**: Monitor buffer usage, queue occupancy, and memory locks

## Technologies Used

### Frontend (100% Client-Side)
- **React 18**: Modern UI library with hooks
- **Vite**: Fast build tool and development server
- **Vanilla CSS**: Custom styling with CSS variables
- **Canvas API**: Interactive visualizations
- **In-Memory Simulators**: JavaScript classes for complete IPC simulation

### Previous Version (Preserved in old_version/)
- **Flask Backend + Vanilla JS Frontend**: Original implementation with server dependency

## Installation

### Prerequisites
- **Node.js 16+** and npm (only requirement!)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Navigate to frontend directory**:
   ```powershell
   cd frontend
   ```

2. **Install dependencies**:
   ```powershell
   npm install
   ```

3. **Start the development server**:
   ```powershell
   npm run dev
   ```

4. **Open in browser**: Navigate to `http://localhost:5173` (Vite default port)

### Production Build

To create an optimized production build:

```powershell
cd frontend
npm run build
```

The built files will be in `frontend/dist/` and can be served from any static web server.

### That's It!

No backend server, no database, no complex configuration. The entire application runs in your browser with all IPC simulation happening in JavaScript.

## Usage

### 🏠 Dashboard
- **System Overview**: Real-time statistics of all IPC resources
- **Recent Activity**: Latest pipes, queues, and memory operations
- **Health Monitoring**: Active bottlenecks and deadlocks
- **Quick Navigation**: Access all features from one place

### 🔗 Pipe Management
1. **Create Pipe**: Enter two process names (e.g., Producer, Consumer)
2. **Send Data**: Select pipe, choose direction (A→B or B→A), enter data
3. **Read Data**: Click read button on either buffer to retrieve messages
4. **Monitor**: View real-time buffer contents and transfer statistics

### 📬 Message Queues
1. **Create Queue**: Enter queue name and maximum size
2. **Send Messages**: Select queue, enter sender name and message
3. **Receive Messages**: Select queue and receiver name to consume messages
4. **Track**: Monitor queue occupancy and message flow

### 💾 Shared Memory
1. **Create Memory**: Enter segment name and size in bytes
2. **Write Data**: Select memory, enter process ID and data
3. **Read Data**: Select memory and process ID to retrieve data
4. **Lock/Unlock**: Manage synchronization with lock operations
5. **Deadlock Detection**: Automatic alerts for circular wait conditions

### 🎨 Visualization
- **Topology View**: Interactive diagram of all IPC connections
- **Bottleneck View**: Heat map of performance issues
- **Deadlock View**: Circular wait cycle visualization
- **Real-time Updates**: Automatic refresh as system changes

### 🔍 Analysis
- **Bottleneck Detection**: Identify performance issues by severity
- **Deadlock Analysis**: View circular wait cycles and involved resources
- **Recommendations**: Automated suggestions for problem resolution
- **Auto-Refresh**: Toggle continuous monitoring
- **Reset Analysis**: Clear all analysis data

## Project Structure

```
ipc_debugger/
├── README.md
├── frontend/                   # React application (Frontend-Only)
│   ├── index.html             # Entry HTML file
│   ├── package.json           # Dependencies and scripts
│   ├── vite.config.js         # Vite configuration
│   └── src/
│       ├── main.jsx           # Application entry point
│       ├── App.jsx            # Main app component
│       ├── components/        # React components
│       │   ├── Dashboard.jsx
│       │   ├── PipeManager.jsx
│       │   ├── QueueManager.jsx
│       │   ├── MemoryManager.jsx
│       │   ├── AnalysisPanel.jsx
│       │   ├── TopologyVisualization.jsx
│       │   └── NotificationCenter.jsx
│       ├── services/          # Business logic
│       │   ├── simulator.js   # IPC simulation engine
│       │   └── store.js       # State management
│       └── styles/            # CSS files
│           └── index.css
└── old_version/               # Original Flask + vanilla JS implementation
    ├── backend/               # Preserved Flask backend
    └── frontend/              # Preserved vanilla JS frontend
```

## How It Works

### In-Memory Simulation Architecture

The IPC Debugger uses a sophisticated in-memory simulation system built entirely in JavaScript:

#### **Simulator Components** (`frontend/src/services/simulator.js`)

1. **PipeSimulator**
   - Bidirectional communication buffers (100 messages per direction)
   - Automatic bottleneck detection on buffer overflow
   - Real-time transfer tracking

2. **QueueSimulator**
   - Priority-based message queuing
   - Configurable capacity management (min 5 messages)
   - FIFO message delivery with sender/receiver tracking

3. **MemorySimulator**
   - Lock-based synchronization mechanism
   - Automatic deadlock detection (5-second timeout)
   - Process-level access control
   - Lock waiting queue management

4. **AnalysisSimulator**
   - Real-time bottleneck severity calculation
   - Circular wait deadlock detection
   - Transfer statistics and pattern analysis

#### **State Management** (`frontend/src/services/store.js`)

- React hooks-based global state
- Observable pattern for real-time updates
- Automatic component re-rendering on state changes
- Centralized notification system

## Team Members

This project was developed by a team of three BTech CSE students:

1. **Dhruv Kumar** (12412009) - Project Lead & Frontend Architecture
2. **Argho Ghosh** (12400242) - UI/UX Design & Component Development
3. **Maharishi Longmailai** (12413920) - Simulation Logic & Analysis Algorithms

## Key Features of Frontend-Only Design

### Advantages
- ✅ **Zero Setup**: No server installation, configuration, or database required
- ✅ **Instant Deployment**: Deploy anywhere - GitHub Pages, Netlify, Vercel, or any static hosting
- ✅ **Offline Capable**: Works completely offline after initial load
- ✅ **Fast Performance**: No network latency, everything runs in-memory
- ✅ **Easy to Share**: Just send the built files - no server management needed
- ✅ **Cross-Platform**: Works on any device with a modern browser

### Technical Implementation
- **Pure JavaScript Simulation**: 4 simulator classes totaling ~300 lines replace entire Flask backend
- **Observable Pattern**: Store notifies components of state changes automatically
- **React Hooks**: Modern state management with `useState` and `useEffect`
- **Canvas Visualizations**: Interactive topology and deadlock graphs
- **CSS Variables**: Consistent dark theme with customizable colors

## Contributing

As this is an academic project, contributions are welcome for educational purposes. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## License

This project is developed for educational purposes as part of an academic course. All rights reserved to the development team.

## Acknowledgments

- Developed as part of Operating Systems course curriculum
- Inspired by real-world IPC debugging tools and system monitoring utilities
- Built using open-source technologies and frameworks

## Future Enhancements

- Real-time collaboration features (multiple users simulating IPC together)
- Export/import simulation scenarios for educational demonstrations
- Performance benchmarking and comparison tools
- Support for additional IPC mechanisms (semaphores, signals, sockets)
- Interactive tutorials and guided walkthroughs
- Simulation recording and playback features
- Advanced deadlock prevention algorithm demonstrations
- Mobile-responsive design improvements

## Deployment

### Deploy to GitHub Pages

```powershell
cd frontend
npm run build
# Upload the dist/ folder to GitHub Pages
```

### Deploy to Netlify/Vercel

Simply connect your repository and set:
- **Build Command**: `cd frontend && npm run build`
- **Publish Directory**: `frontend/dist`

### Local Static Server

```powershell
cd frontend/dist
npx serve
```
