# IPC Debugger

## Overview

IPC Debugger is a **completely self-contained, frontend-only** web application designed for analyzing and debugging Inter-Process Communication (IPC) mechanisms in operating systems. This project was developed as part of a BTech CSE Operating Systems course project.

The tool provides real-time simulation, visualization, and analysis of various IPC components including **pipes**, **message queues**, and **shared memory**. It helps developers understand IPC behavior, identify bottlenecks, and detect deadlocks through an intuitive React-based interface - **all running entirely in your browser with no backend server required**.

## Problem Statement

Design a debugging tool for inter-process communication methods (pipes, message queues, shared memory) to help developers identify issues in synchronization and data sharing between processes. Include a GUI to simulate data transfer and highlight potential bottlenecks or deadlocks.

## Features

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
├── backend/                    # Flask backend server
│   ├── server.py              # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   └── core/                  # Core IPC modules
│       ├── pipes.py           # Pipe implementation
│       ├── message_queue.py   # Queue implementation
│       ├── shared_memory.py   # Memory implementation
│       ├── deadlock_detector.py
│       └── bottleneck_analyzer.py
├── frontend/                   # React frontend (New)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API & WebSocket
│   │   └── styles/            # CSS files
│   ├── package.json
│   └── vite.config.js
├── old_version/               # Original implementation
│   ├── backend/               # Previous backend
│   └── frontend/              # Previous vanilla JS frontend
├── README.md
└── IPC_Debugger_Project_Report.md
```

## API Endpoints

The backend provides RESTful API endpoints for programmatic access:

### Pipes
- `POST /api/pipes/create` - Create a new pipe
- `POST /api/pipes/send` - Send data through a pipe
- `GET /api/pipes` - Get all pipes
- `DELETE /api/pipes/<pipe_id>` - Delete a pipe

### Message Queues
- `POST /api/queues/create` - Create a message queue
- `POST /api/queues/send` - Send a message
- `GET /api/queues` - Get all queues
- `DELETE /api/queues/<queue_id>` - Delete a queue

### Shared Memory
- `POST /api/memory/create` - Create shared memory segment
- `POST /api/memory/write` - Write to shared memory
- `GET /api/memory` - Get all memory segments
- `DELETE /api/memory/<memory_id>` - Delete memory segment

### Analysis
- `GET /api/analysis/bottlenecks` - Get bottleneck analysis
- `GET /api/analysis/deadlocks` - Check for deadlocks

## Project Structure

```
ipc_debugger/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── server.py
│   └── core/
│       ├── __init__.py
│       ├── pipes.py
│       ├── message_queue.py
│       ├── shared_memory.py
│       ├── deadlock_detector.py
│       ├── bottleneck_analyzer.py
│       └── *bottlenecks.py
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── .dist/ (build directory)
```

## Team Members

This project was developed by a team of three BTech CSE students:

1. Dhruv Kumar(12412009) - Backend Development & API Design
2. Argho Ghosh(12400242) - Frontend Development & UI/UX
3. Maharishi Longmailai(12413920) - Core Logic & Analysis Algorithms

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

- Integration with actual system IPC calls
- Advanced deadlock prevention algorithms
- Performance profiling and optimization suggestions
- Support for additional IPC mechanisms (semaphores, signals)
- Export functionality for analysis reports
