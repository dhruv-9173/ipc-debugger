from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sock import Sock
import uuid
from datetime import datetime
import json
import os

from core.pipes import PipeManager
from core.message_queue import MessageQueueManager
from core.shared_memory import SharedMemoryManager
from core.deadlock_detector import DeadlockDetector
from core.bottleneck_analyzer import BottleneckAnalyzer

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')

# Initialize IPC managers
pipe_manager = PipeManager()
queue_manager = MessageQueueManager()
memory_manager = SharedMemoryManager()
deadlock_detector = DeadlockDetector()
bottleneck_analyzer = BottleneckAnalyzer()

# WebSocket clients
ws_clients = []

# Broadcast helper
def broadcast(event_type, data):
    message = json.dumps({'type': event_type, 'data': data})
    dead_clients = []
    for client in ws_clients:
        try:
            client.send(message)
        except:
            dead_clients.append(client)
    for client in dead_clients:
        ws_clients.remove(client)

# ===== PIPE ENDPOINTS =====
@app.route('/api/pipes/create', methods=['POST'])
def create_pipe():
    data = request.json
    pipe = pipe_manager.create_pipe(data['processA'], data['processB'])
    broadcast('PIPE_CREATED', pipe)
    return jsonify(pipe)

@app.route('/api/pipes/send', methods=['POST'])
def send_pipe_data():
    data = request.json
    result = pipe_manager.send_data(data['pipeId'], data['data'], data['direction'])

    # Enrich pipe transfer with buffer stats and writer info for detailed bottleneck analysis
    pipe = pipe_manager.get_pipe(data['pipeId'])
    if pipe:
        buffer_capacity = 100  # same as buffer_limit in PipeManager
        extra = {
            'bufferA_size': len(pipe['bufferA']),
            'bufferB_size': len(pipe['bufferB']),
            'buffer_capacity': buffer_capacity,
            'writer_id': data.get('writerId') or data.get('processId'),
            'direction': data['direction'],
            'last_read_timestamps': pipe_manager.read_activity.get(data['pipeId'], {})
        }
    else:
        extra = None

    bottleneck_analyzer.record_transfer(
        'pipe',
        data['pipeId'],
        len(str(data['data'])),
        latency=0
    )
    
    broadcast('PIPE_DATA_TRANSFER', {
        'pipeId': data['pipeId'],
        'data': data['data'],
        'direction': data['direction'],
        'timestamp': datetime.now().timestamp() * 1000
    })
    
    return jsonify(result)

@app.route('/api/pipes', methods=['GET'])
def get_all_pipes():
    return jsonify(pipe_manager.get_all_pipes())

@app.route('/api/pipes/<pipe_id>', methods=['DELETE'])
def delete_pipe(pipe_id):
    pipe_manager.delete_pipe(pipe_id)
    broadcast('PIPE_DELETED', {'pipeId': pipe_id})
    return jsonify({'success': True})

# ===== MESSAGE QUEUE ENDPOINTS =====
@app.route('/api/queues/create', methods=['POST'])
def create_queue():
    data = request.json
    queue = queue_manager.create_queue(data['name'], data.get('maxSize', 1000))
    broadcast('QUEUE_CREATED', queue)
    return jsonify(queue)

@app.route('/api/queues/send', methods=['POST'])
def send_queue_message():
    data = request.json
    result = queue_manager.send_message(data['queueId'], data['message'], data['sender'])

    # Enrich queue transfer with occupancy and block information
    queue = queue_manager.queues.get(data['queueId'])
    queue_size = len(queue['messages']) if queue else 0
    max_size = queue['maxSize'] if queue else 1
    extra = {
        'queue_size': queue_size,
        'queue_max': max_size,
        'blocked_send': bool(result.get('bottleneck')),
        'blocked_recv': False
    }

    bottleneck_analyzer.record_transfer(
        'queue',
        data['queueId'],
        len(str(data['message'])),
        latency=0,
        extra=extra
    )
    
    broadcast('QUEUE_MESSAGE_SENT', {
        'queueId': data['queueId'],
        'message': data['message'],
        'sender': data['sender'],
        'timestamp': datetime.now().timestamp() * 1000
    })
    
    return jsonify(result)

@app.route('/api/queues/receive', methods=['POST'])
def receive_queue_message():
    data = request.json
    message = queue_manager.receive_message(data['queueId'], data['receiver'])

    # Record queue receive characteristics for slow-producer detection
    queue = queue_manager.queues.get(data['queueId'])
    queue_size = queue['currentSize'] if queue_manager.get_queue(data['queueId']) else 0
    max_size = queue['maxSize'] if queue else 1
    blocked_recv = not message.get('success') and message.get('error') == 'Queue is empty'

    extra = {
        'queue_size': queue_size,
        'queue_max': max_size,
        'blocked_send': False,
        'blocked_recv': blocked_recv
    }

    # Use size 0 for empty receive attempts, or message size if successful
    msg_size = len(str(message.get('message', {}).get('data'))) if message.get('success') else 0
    bottleneck_analyzer.record_transfer('queue', data['queueId'], msg_size, latency=0, extra=extra)

    broadcast('QUEUE_MESSAGE_RECEIVED', {
        'queueId': data['queueId'],
        'message': message,
        'receiver': data['receiver'],
        'timestamp': datetime.now().timestamp() * 1000
    })
    
    return jsonify(message)

@app.route('/api/queues', methods=['GET'])
def get_all_queues():
    return jsonify(queue_manager.get_all_queues())

@app.route('/api/queues/<queue_id>', methods=['DELETE'])
def delete_queue(queue_id):
    queue_manager.delete_queue(queue_id)
    broadcast('QUEUE_DELETED', {'queueId': queue_id})
    return jsonify({'success': True})

# ===== SHARED MEMORY ENDPOINTS =====
@app.route('/api/shared-memory/create', methods=['POST'])
def create_memory():
    data = request.json
    memory = memory_manager.create_memory(data['name'], data.get('size', 1024))
    broadcast('MEMORY_CREATED', memory)
    return jsonify(memory)

@app.route('/api/shared-memory/write', methods=['POST'])
def write_memory():
    data = request.json
    result = memory_manager.write(data['memoryId'], data['processId'], data['data'])
    
    # Get bottleneck metrics for analysis
    metrics = memory_manager.get_bottleneck_metrics(data['memoryId'])
    if metrics:
        metrics['operation'] = 'write'
    
    bottleneck_analyzer.record_transfer(
        'memory',
        data['memoryId'],
        len(str(data['data'])),
        extra=metrics
    )
    
    # Check for deadlocks
    deadlock = deadlock_detector.check_deadlock(data['memoryId'], data['processId'], 'write')
    
    broadcast('MEMORY_WRITE', {
        'memoryId': data['memoryId'],
        'processId': data['processId'],
        'data': data['data'],
        'timestamp': datetime.now().timestamp() * 1000,
        'deadlock': deadlock
    })
    
    result['deadlock'] = deadlock
    return jsonify(result)

@app.route('/api/shared-memory/read', methods=['POST'])
def read_memory():
    data = request.json
    result = memory_manager.read(data['memoryId'], data['processId'])
    
    # Get bottleneck metrics for analysis
    metrics = memory_manager.get_bottleneck_metrics(data['memoryId'])
    if metrics:
        metrics['operation'] = 'read'
    
    bottleneck_analyzer.record_transfer(
        'memory',
        data['memoryId'],
        len(str(result.get('data', {}))),
        extra=metrics
    )
    
    # Check for deadlocks
    deadlock = deadlock_detector.check_deadlock(data['memoryId'], data['processId'], 'read')
    
    broadcast('MEMORY_READ', {
        'memoryId': data['memoryId'],
        'processId': data['processId'],
        'timestamp': datetime.now().timestamp() * 1000,
        'deadlock': deadlock
    })
    
    result['deadlock'] = deadlock
    return jsonify(result)

@app.route('/api/shared-memory/lock', methods=['POST'])
def lock_memory():
    data = request.json
    result = memory_manager.acquire_lock(data['memoryId'], data['processId'])
    
    deadlock_detector.record_lock_acquisition(data['memoryId'], data['processId'])
    
    broadcast('MEMORY_LOCKED', {
        'memoryId': data['memoryId'],
        'processId': data['processId'],
        'timestamp': datetime.now().timestamp() * 1000
    })
    
    return jsonify(result)

@app.route('/api/shared-memory/unlock', methods=['POST'])
def unlock_memory():
    data = request.json
    result = memory_manager.release_lock(data['memoryId'], data['processId'])
    
    deadlock_detector.record_lock_release(data['memoryId'], data['processId'])
    
    broadcast('MEMORY_UNLOCKED', {
        'memoryId': data['memoryId'],
        'processId': data['processId'],
        'timestamp': datetime.now().timestamp() * 1000
    })
    
    return jsonify(result)

@app.route('/api/shared-memory', methods=['GET'])
def get_all_memory():
    return jsonify(memory_manager.get_all_memory())

@app.route('/api/shared-memory/<memory_id>', methods=['DELETE'])
def delete_memory(memory_id):
    memory_manager.delete_memory(memory_id)
    broadcast('MEMORY_DELETED', {'memoryId': memory_id})
    return jsonify({'success': True})

# ===== ANALYSIS ENDPOINTS =====
@app.route('/api/analysis/bottlenecks', methods=['GET'])
def get_bottlenecks():
    return jsonify(bottleneck_analyzer.get_bottlenecks())

@app.route('/api/analysis/deadlocks', methods=['GET'])
def get_deadlocks():
    return jsonify(deadlock_detector.get_deadlocks())

@app.route('/api/analysis/reset', methods=['POST'])
def reset_analysis():
    bottleneck_analyzer.reset()
    deadlock_detector.reset()
    broadcast('ANALYSIS_RESET', {})
    return jsonify({'success': True})

# ===== PROCESS SIMULATION ENDPOINTS =====
@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    data = request.json
    scenario = data.get('scenario')
    broadcast('SIMULATION_STARTED', {'scenario': scenario})
    return jsonify({'success': True, 'scenario': scenario})

# WebSocket endpoint
# ===== FRONTEND ROUTES =====
@app.route('/')
def serve_frontend():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)

# ===== WEBSOCKET =====
# ===== WEBSOCKET =====
@sock.route('/ws')
def websocket(ws):
    ws_clients.append(ws)
    print(f'Client connected. Total clients: {len(ws_clients)}')
    
    try:
        while True:
            data = ws.receive()
            if data is None:
                break
    except Exception as e:
        print(f'WebSocket error: {e}')
    finally:
        if ws in ws_clients:
            ws_clients.remove(ws)
        print(f'Client disconnected. Total clients: {len(ws_clients)}')

if __name__ == '__main__':
    print('IPC Debugger server starting...')
    print('Server running on http://localhost:5000')
    print('WebSocket endpoint: ws://localhost:5000/ws')
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
