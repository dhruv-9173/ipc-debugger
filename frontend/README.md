# IPC Debugger - React Frontend

Modern React-based frontend for the Inter-Process Communication Debugger.

## Features

- 🎨 **Modern UI/UX** - Clean, intuitive interface with dark theme
- ⚡ **Real-time Updates** - WebSocket integration for live monitoring
- 📊 **Interactive Dashboard** - Comprehensive system overview
- 🔗 **Pipe Management** - Create and manage bidirectional pipes
- 📬 **Message Queues** - Asynchronous messaging system
- 💾 **Shared Memory** - Lock-based synchronization
- 🎨 **Visual Topology** - Interactive system visualization
- 🔍 **Analysis Tools** - Bottleneck and deadlock detection
- 📱 **Responsive Design** - Works on all screen sizes

## Tech Stack

- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **Vanilla CSS** - Custom styling with CSS variables
- **Canvas API** - Interactive visualizations
- **WebSocket** - Real-time communication
- **Fetch API** - REST API integration

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

Build output will be in the `dist` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML entry point
├── src/
│   ├── components/         # React components
│   │   ├── Dashboard.jsx
│   │   ├── PipeManager.jsx
│   │   ├── QueueManager.jsx
│   │   ├── MemoryManager.jsx
│   │   ├── AnalysisPanel.jsx
│   │   ├── VisualizationPanel.jsx
│   │   └── NotificationCenter.jsx
│   ├── services/           # API and WebSocket services
│   │   ├── api.js
│   │   ├── websocket.js
│   │   └── store.js
│   ├── styles/             # CSS files
│   │   ├── index.css
│   │   └── App.css
│   ├── App.jsx             # Main app component
│   └── main.jsx            # Entry point
├── package.json
└── vite.config.js
```

## Components

### Dashboard
- System overview with statistics
- Recent activity monitoring
- Quick access to all resources

### PipeManager
- Create bidirectional pipes between processes
- Send/receive data in both directions
- View buffer contents and statistics

### QueueManager
- Create message queues with capacity limits
- Send/receive messages with priority
- Monitor queue occupancy

### MemoryManager
- Create shared memory segments
- Lock-based synchronization
- Read/write operations with deadlock detection

### AnalysisPanel
- Real-time bottleneck detection
- Deadlock analysis and recommendations
- Configurable severity thresholds

### VisualizationPanel
- Interactive topology visualization
- Bottleneck heat maps
- Deadlock cycle diagrams

## API Integration

The frontend connects to the Flask backend at `http://localhost:5000`:

- REST API for CRUD operations
- WebSocket at `ws://localhost:5000/ws` for real-time updates

## Configuration

Proxy settings in `vite.config.js` route API calls to the backend:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
  '/ws': {
    target: 'ws://localhost:5000',
    ws: true,
  }
}
```

## Development

The app uses hot module replacement (HMR) for instant updates during development.

## Styling

Custom CSS with CSS variables for theming:
- Dark theme optimized for extended use
- Consistent color palette
- Smooth animations and transitions
- Responsive breakpoints

## State Management

Simple React hooks-based state management:
- `useIPCStore` - Global state hook
- Real-time synchronization with backend
- Event-driven updates

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT
