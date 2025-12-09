# IPC Debugger

## Overview

IPC Debugger is a comprehensive web-based tool designed for analyzing and debugging Inter-Process Communication (IPC) mechanisms in operating systems. This project was developed as part of a BTech CSE Operating Systems course project by a team of three students.

The tool provides real-time monitoring, visualization, and analysis of various IPC components including pipes, message queues, and shared memory. It helps developers identify bottlenecks, detect deadlocks, and understand IPC behavior in multi-process applications.

## Features

### Core Functionality
- **Real-time IPC Monitoring**: Live tracking of data transfers between processes
- **Multiple IPC Mechanisms**: Support for pipes, message queues, and shared memory
- **Deadlock Detection**: Automatic detection of potential deadlock situations
- **Bottleneck Analysis**: Performance analysis to identify communication bottlenecks
- **WebSocket Integration**: Real-time updates and notifications

### User Interface
- **Interactive Dashboard**: Clean, intuitive web interface
- **Visual Representations**: Graphical display of IPC connections and data flow
- **Process Management**: Create, monitor, and manage virtual processes
- **Data Transfer Simulation**: Simulate IPC operations for testing and analysis

### Analysis Tools
- **Performance Metrics**: Track latency, throughput, and buffer utilization
- **Event Logging**: Comprehensive logging of all IPC operations
- **Statistics Dashboard**: Visual analytics and performance insights

## Technologies Used

### Backend
- **Python 3.x**: Core programming language
- **Flask**: Web framework for REST API
- **Flask-SocketIO**: Real-time WebSocket communication
- **Flask-CORS**: Cross-origin resource sharing support

### Frontend
- **HTML5**: Structure and markup
- **CSS3**: Styling and responsive design
- **JavaScript (ES6+)**: Client-side logic and interactivity

## Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup Instructions

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd ipc_debugger
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Start the server**:
   ```bash
   python server.py
   ```

4. **Open your web browser** and navigate to:
   ```
   http://localhost:5000
   ```

## Usage

### Getting Started
1. Launch the application using the installation steps above
2. The web interface will load with the main dashboard
3. Use the sidebar navigation to switch between different IPC mechanisms

### Working with Pipes
- Create pipes between virtual processes
- Send and receive data through pipes
- Monitor buffer status and data flow
- Analyze pipe performance metrics

### Message Queues
- Create message queues for inter-process communication
- Send messages with priorities
- Monitor queue status and message processing
- Track queue performance and bottlenecks

### Shared Memory
- Allocate shared memory segments
- Read and write data to shared memory
- Monitor memory access patterns
- Detect potential race conditions

### Analysis Features
- View real-time statistics and metrics
- Check for deadlock conditions
- Analyze performance bottlenecks
- Review event logs and history

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

1. **[Student Name 1]** - Backend Development & API Design
2. **[Student Name 2]** - Frontend Development & UI/UX
3. **[Student Name 3]** - Core Logic & Analysis Algorithms

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
