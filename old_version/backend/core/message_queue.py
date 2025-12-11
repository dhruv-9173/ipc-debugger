import uuid
from datetime import datetime
import json

class MessageQueueManager:
    def __init__(self):
        self.queues = {}
    
    def create_queue(self, name, max_size=1000):
        queue_id = str(uuid.uuid4())
        queue = {
            'id': queue_id,
            'name': name,
            'maxSize': max_size,
            'messages': [],
            'subscribers': set(),
            'status': 'active',
            'created': datetime.now().timestamp() * 1000,
            'stats': {
                'totalSent': 0,
                'totalReceived': 0,
                'averageWaitTime': 0,
                'peakSize': 0,
                'lastActivity': datetime.now().timestamp() * 1000
            }
        }
        
        self.queues[queue_id] = queue
        return self._serialize_queue(queue)
    
    def send_message(self, queue_id, message, sender):
        if queue_id not in self.queues:
            return {'success': False, 'error': 'Queue not found'}
        
        queue = self.queues[queue_id]
        
        if len(queue['messages']) >= queue['maxSize']:
            return {
                'success': False,
                'error': 'Queue is full',
                'bottleneck': True,
                'queueSize': len(queue['messages'])
            }
        
        timestamp = datetime.now().timestamp() * 1000
        queue_message = {
            'id': str(uuid.uuid4()),
            'data': message,
            'sender': sender,
            'timestamp': timestamp,
            'size': len(json.dumps(message)),
            'priority': message.get('priority', 0) if isinstance(message, dict) else 0
        }
        
        # Insert based on priority (higher priority first)
        inserted = False
        for i, msg in enumerate(queue['messages']):
            if queue_message['priority'] > msg['priority']:
                queue['messages'].insert(i, queue_message)
                inserted = True
                break
        
        if not inserted:
            queue['messages'].append(queue_message)
        
        queue['stats']['totalSent'] += 1
        queue['stats']['peakSize'] = max(queue['stats']['peakSize'], len(queue['messages']))
        queue['stats']['lastActivity'] = timestamp
        
        # Check for bottleneck warning
        utilization_percent = (len(queue['messages']) / queue['maxSize']) * 100
        warning = f"Queue {utilization_percent:.1f}% full - potential bottleneck" if utilization_percent > 80 else None
        
        return {
            'success': True,
            'message': queue_message,
            'queueSize': len(queue['messages']),
            'utilization': utilization_percent,
            'warning': warning
        }
    
    def receive_message(self, queue_id, receiver):
        if queue_id not in self.queues:
            return {'success': False, 'error': 'Queue not found'}
        
        queue = self.queues[queue_id]
        
        if len(queue['messages']) == 0:
            return {
                'success': False,
                'error': 'Queue is empty',
                'queueSize': 0
            }
        
        message = queue['messages'].pop(0)
        wait_time = datetime.now().timestamp() * 1000 - message['timestamp']
        
        queue['stats']['totalReceived'] += 1
        queue['stats']['averageWaitTime'] = \
            (queue['stats']['averageWaitTime'] * (queue['stats']['totalReceived'] - 1) + wait_time) / \
            queue['stats']['totalReceived']
        queue['stats']['lastActivity'] = datetime.now().timestamp() * 1000
        
        return {
            'success': True,
            'message': message,
            'receiver': receiver,
            'waitTime': wait_time,
            'queueSize': len(queue['messages'])
        }
    
    def subscribe(self, queue_id, process_id):
        if queue_id not in self.queues:
            return {'success': False, 'error': 'Queue not found'}
        
        self.queues[queue_id]['subscribers'].add(process_id)
        return {'success': True, 'subscribers': list(self.queues[queue_id]['subscribers'])}
    
    def unsubscribe(self, queue_id, process_id):
        if queue_id not in self.queues:
            return {'success': False, 'error': 'Queue not found'}
        
        self.queues[queue_id]['subscribers'].discard(process_id)
        return {'success': True, 'subscribers': list(self.queues[queue_id]['subscribers'])}
    
    def get_all_queues(self):
        return [self._serialize_queue(q) for q in self.queues.values()]
    
    def get_queue(self, queue_id):
        queue = self.queues.get(queue_id)
        return self._serialize_queue(queue) if queue else None
    
    def delete_queue(self, queue_id):
        if queue_id in self.queues:
            del self.queues[queue_id]
            return True
        return False
    
    def clear_queue(self, queue_id):
        if queue_id in self.queues:
            self.queues[queue_id]['messages'] = []
            return {'success': True}
        return {'success': False, 'error': 'Queue not found'}
    
    def _serialize_queue(self, queue):
        """Convert set to list for JSON serialization"""
        q = queue.copy()
        q['subscribers'] = list(q['subscribers'])
        q['currentSize'] = len(q['messages'])
        return q
