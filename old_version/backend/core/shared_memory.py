import uuid
from datetime import datetime
import json

class SharedMemoryManager:
    def __init__(self):
        self.memories = {}
        self.locks = {}  # Track locks per memory segment
    
    def create_memory(self, name, size=1024):
        memory_id = str(uuid.uuid4())
        memory = {
            'id': memory_id,
            'name': name,
            'size': size,
            'data': {},
            'accessHistory': [],
            'created': datetime.now().timestamp() * 1000,
            'stats': {
                'reads': 0,
                'writes': 0,
                'conflicts': 0,
                'lastAccess': datetime.now().timestamp() * 1000
            }
        }
        
        self.memories[memory_id] = memory
        self.locks[memory_id] = {
            'isLocked': False,
            'owner': None,
            'queue': [],  # Processes waiting for lock
            'acquired': None
        }
        
        return memory
    
    def acquire_lock(self, memory_id, process_id):
        if memory_id not in self.memories or memory_id not in self.locks:
            return {'success': False, 'error': 'Memory segment not found'}
        
        lock = self.locks[memory_id]
        
        if not lock['isLocked']:
            # Lock is available
            lock['isLocked'] = True
            lock['owner'] = process_id
            lock['acquired'] = datetime.now().timestamp() * 1000
            
            return {
                'success': True,
                'acquired': True,
                'owner': process_id
            }
        elif lock['owner'] == process_id:
            # Already owns the lock (reentrant)
            return {
                'success': True,
                'acquired': True,
                'owner': process_id,
                'reentrant': True
            }
        else:
            # Lock is held by another process
            if process_id not in lock['queue']:
                lock['queue'].append(process_id)
            
            return {
                'success': False,
                'acquired': False,
                'waiting': True,
                'owner': lock['owner'],
                'queuePosition': lock['queue'].index(process_id),
                'queueLength': len(lock['queue']),
                'warning': 'Process waiting for lock - potential deadlock risk'
            }
    
    def release_lock(self, memory_id, process_id):
        if memory_id not in self.locks:
            return {'success': False, 'error': 'Memory segment not found'}
        
        lock = self.locks[memory_id]
        
        if not lock['isLocked']:
            return {'success': False, 'error': 'Lock is not held'}
        
        if lock['owner'] != process_id:
            return {
                'success': False,
                'error': 'Lock is held by another process',
                'owner': lock['owner']
            }
        
        # Release the lock
        hold_time = datetime.now().timestamp() * 1000 - lock['acquired']
        lock['isLocked'] = False
        previous_owner = lock['owner']
        lock['owner'] = None
        lock['acquired'] = None
        
        # Check if there are waiting processes
        next_process = lock['queue'].pop(0) if lock['queue'] else None
        
        return {
            'success': True,
            'released': True,
            'previousOwner': previous_owner,
            'holdTime': hold_time,
            'nextInQueue': next_process,
            'queueLength': len(lock['queue'])
        }
    
    def write(self, memory_id, process_id, data):
        if memory_id not in self.memories:
            return {'success': False, 'error': 'Memory segment not found'}
        
        memory = self.memories[memory_id]
        lock = self.locks[memory_id]
        
        # Check if process has lock
        has_lock = lock['isLocked'] and lock['owner'] == process_id
        
        if not has_lock:
            memory['stats']['conflicts'] += 1
            return {
                'success': False,
                'error': 'Write failed - lock not acquired',
                'conflict': True,
                'owner': lock['owner']
            }
        
        timestamp = datetime.now().timestamp() * 1000
        data_size = len(json.dumps(data))
        
        if data_size > memory['size']:
            return {
                'success': False,
                'error': 'Data size exceeds memory segment size',
                'dataSize': data_size,
                'maxSize': memory['size']
            }
        
        # Perform write
        memory['data'].update(data)
        
        memory['accessHistory'].append({
            'type': 'write',
            'processId': process_id,
            'timestamp': timestamp,
            'dataSize': data_size,
            'keys': list(data.keys())
        })
        
        memory['stats']['writes'] += 1
        memory['stats']['lastAccess'] = timestamp
        
        # Keep history limited
        if len(memory['accessHistory']) > 100:
            memory['accessHistory'] = memory['accessHistory'][-100:]
        
        return {
            'success': True,
            'written': True,
            'dataSize': data_size,
            'timestamp': timestamp,
            'currentSize': len(json.dumps(memory['data'])),
            'utilization': (len(json.dumps(memory['data'])) / memory['size']) * 100
        }
    
    def read(self, memory_id, process_id):
        if memory_id not in self.memories:
            return {'success': False, 'error': 'Memory segment not found'}
        
        memory = self.memories[memory_id]
        lock = self.locks[memory_id]
        
        # Reads can happen without lock (simulating shared read access)
        # But we track if there's a write lock to detect potential race conditions
        write_conflict = lock['isLocked'] and lock['owner'] != process_id
        
        timestamp = datetime.now().timestamp() * 1000
        
        memory['accessHistory'].append({
            'type': 'read',
            'processId': process_id,
            'timestamp': timestamp,
            'writeConflict': write_conflict
        })
        
        memory['stats']['reads'] += 1
        memory['stats']['lastAccess'] = timestamp
        
        if write_conflict:
            memory['stats']['conflicts'] += 1
        
        # Keep history limited
        if len(memory['accessHistory']) > 100:
            memory['accessHistory'] = memory['accessHistory'][-100:]
        
        return {
            'success': True,
            'data': memory['data'].copy(),
            'timestamp': timestamp,
            'warning': 'Reading while another process holds write lock - potential race condition' if write_conflict else None,
            'writeConflict': write_conflict
        }
    
    def get_all_memory(self):
        result = []
        for mem in self.memories.values():
            lock = self.locks[mem['id']]
            result.append({
                **mem,
                'lock': {
                    'isLocked': lock['isLocked'],
                    'owner': lock['owner'],
                    'queueLength': len(lock['queue']),
                    'waitingProcesses': lock['queue'].copy()
                },
                'currentSize': len(json.dumps(mem['data'])),
                'utilization': (len(json.dumps(mem['data'])) / mem['size']) * 100
            })
        return result
    
    def get_memory(self, memory_id):
        if memory_id not in self.memories:
            return None
        
        memory = self.memories[memory_id]
        lock = self.locks[memory_id]
        
        return {
            **memory,
            'lock': {
                'isLocked': lock['isLocked'],
                'owner': lock['owner'],
                'queueLength': len(lock['queue']),
                'waitingProcesses': lock['queue'].copy()
            },
            'currentSize': len(json.dumps(memory['data'])),
            'utilization': (len(json.dumps(memory['data'])) / memory['size']) * 100
        }
    
    def delete_memory(self, memory_id):
        if memory_id in self.locks:
            del self.locks[memory_id]
        if memory_id in self.memories:
            del self.memories[memory_id]
            return True
        return False
    
    def clear_memory(self, memory_id):
        if memory_id in self.memories:
            self.memories[memory_id]['data'] = {}
            return {'success': True}
        return {'success': False, 'error': 'Memory segment not found'}
    
    def get_bottleneck_metrics(self, memory_id):
        """Get metrics for bottleneck analysis"""
        if memory_id not in self.memories or memory_id not in self.locks:
            return None
        
        memory = self.memories[memory_id]
        lock = self.locks[memory_id]
        
        # Calculate lock wait time (average from queue perspective)
        lock_wait_time = 0
        if lock['isLocked'] and lock['acquired']:
            lock_wait_time = datetime.now().timestamp() * 1000 - lock['acquired']
        
        # Calculate used memory
        used_memory = len(json.dumps(memory['data']))
        
        # Estimate fragmented blocks (count unique keys as blocks)
        fragmented_blocks = len(memory['data'].keys())
        
        # Get recent access history for pattern analysis
        recent_history = memory['accessHistory'][-20:] if len(memory['accessHistory']) > 0 else []
        
        return {
            'lock_wait_time': lock_wait_time,
            'lock_queue_length': len(lock['queue']),
            'access_history': recent_history,
            'total_reads': memory['stats']['reads'],
            'total_writes': memory['stats']['writes'],
            'conflicts': memory['stats']['conflicts'],
            'memory_size': memory['size'],
            'used_memory': used_memory,
            'fragmented_blocks': fragmented_blocks
        }
