import uuid
from datetime import datetime
import json

class PipeManager:
    def __init__(self):
        self.pipes = {}
        # Track last read timestamps per direction to detect slow readers/writers
        # and busy polling (CPU hog) patterns
        self.read_activity = {}  # {pipe_id: {"AtoB": timestamp, "BtoA": timestamp}}
    
    def create_pipe(self, process_a, process_b):
        pipe_id = str(uuid.uuid4())
        pipe = {
            'id': pipe_id,
            'processA': process_a,
            'processB': process_b,
            'bufferA': [],  # Data from A to B
            'bufferB': [],  # Data from B to A
            'status': 'active',
            'created': datetime.now().timestamp() * 1000,
            'stats': {
                'messagesAtoB': 0,
                'messagesBtoA': 0,
                'bytesTransferred': 0,
                'lastActivity': datetime.now().timestamp() * 1000
            }
        }
        
        self.pipes[pipe_id] = pipe
        return pipe
    
    def send_data(self, pipe_id, data, direction):
        if pipe_id not in self.pipes:
            return {'success': False, 'error': 'Pipe not found'}
        
        pipe = self.pipes[pipe_id]
        timestamp = datetime.now().timestamp() * 1000
        
        message = {
            'id': str(uuid.uuid4()),
            'data': data,
            'timestamp': timestamp,
            'size': len(json.dumps(data))
        }
        
        if direction == 'AtoB':
            pipe['bufferA'].append(message)
            pipe['stats']['messagesAtoB'] += 1
        elif direction == 'BtoA':
            pipe['bufferB'].append(message)
            pipe['stats']['messagesBtoA'] += 1
        else:
            return {'success': False, 'error': 'Invalid direction'}
        
        pipe['stats']['bytesTransferred'] += message['size']
        pipe['stats']['lastActivity'] = timestamp
        
        # Simulate potential blocking on full buffer (bottleneck detection)
        buffer_limit = 100
        is_blocking = (direction == 'AtoB' and len(pipe['bufferA']) > buffer_limit) or \
                      (direction == 'BtoA' and len(pipe['bufferB']) > buffer_limit)

        # Track write activity for busy polling and slow/fast side analysis
        if pipe_id not in self.read_activity:
            self.read_activity[pipe_id] = {"AtoB": None, "BtoA": None}

        return {
            'success': True,
            'message': message,
            'bufferSize': len(pipe['bufferA']) if direction == 'AtoB' else len(pipe['bufferB']),
            'isBlocking': is_blocking,
            'warning': 'Buffer near capacity - potential bottleneck' if is_blocking else None
        }
    
    def read_data(self, pipe_id, direction):
        if pipe_id not in self.pipes:
            return {'success': False, 'error': 'Pipe not found'}
        
        pipe = self.pipes[pipe_id]
        message = None
        
        if direction == 'AtoB' and len(pipe['bufferA']) > 0:
            message = pipe['bufferA'].pop(0)
        elif direction == 'BtoA' and len(pipe['bufferB']) > 0:
            message = pipe['bufferB'].pop(0)

        # Record read activity timestamp for bottleneck patterns
        if pipe_id not in self.read_activity:
            self.read_activity[pipe_id] = {"AtoB": None, "BtoA": None}
        self.read_activity[pipe_id][direction] = datetime.now().timestamp() * 1000

        return {
            'success': True,
            'message': message,
            'bufferSize': len(pipe['bufferA']) if direction == 'AtoB' else len(pipe['bufferB'])
        }
    
    def get_all_pipes(self):
        return list(self.pipes.values())
    
    def get_pipe(self, pipe_id):
        return self.pipes.get(pipe_id)
    
    def delete_pipe(self, pipe_id):
        if pipe_id in self.pipes:
            del self.pipes[pipe_id]
            return True
        return False
    
    def clear_buffers(self, pipe_id):
        if pipe_id in self.pipes:
            self.pipes[pipe_id]['bufferA'] = []
            self.pipes[pipe_id]['bufferB'] = []
            return {'success': True}
        return {'success': False, 'error': 'Pipe not found'}
