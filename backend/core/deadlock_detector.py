from datetime import datetime

class DeadlockDetector:
    def __init__(self):
        self.resource_graph = {}  # Resource allocation graph
        self.process_locks = {}  # Track locks held by each process
        self.waiting_for = {}  # Track what each process is waiting for
        self.detected_deadlocks = []
    
    def record_lock_acquisition(self, resource_id, process_id):
        """Record that process has acquired lock on resource"""
        if process_id not in self.process_locks:
            self.process_locks[process_id] = set()
        self.process_locks[process_id].add(resource_id)
        
        # Remove from waiting list
        if process_id in self.waiting_for:
            del self.waiting_for[process_id]
        
        # Update resource graph
        if resource_id not in self.resource_graph:
            self.resource_graph[resource_id] = {'owner': None, 'waiters': []}
        self.resource_graph[resource_id]['owner'] = process_id
    
    def record_lock_release(self, resource_id, process_id):
        """Remove lock from process"""
        if process_id in self.process_locks:
            self.process_locks[process_id].discard(resource_id)
        
        # Update resource graph
        if resource_id in self.resource_graph:
            self.resource_graph[resource_id]['owner'] = None
    
    def record_waiting_for(self, process_id, resource_id):
        """Record that process is waiting for resource"""
        self.waiting_for[process_id] = resource_id
        
        # Add to resource waiters
        if resource_id not in self.resource_graph:
            self.resource_graph[resource_id] = {'owner': None, 'waiters': []}
        
        if process_id not in self.resource_graph[resource_id]['waiters']:
            self.resource_graph[resource_id]['waiters'].append(process_id)
    
    def check_deadlock(self, resource_id, process_id, operation):
        """Check for deadlock when a process tries to access a resource"""
        if operation in ['write', 'lock']:
            if resource_id in self.resource_graph:
                resource = self.resource_graph[resource_id]
                
                if resource['owner'] and resource['owner'] != process_id:
                    self.record_waiting_for(process_id, resource_id)
                    
                    # Detect circular wait
                    cycle = self.detect_cycle(process_id)
                    
                    if cycle:
                        deadlock = {
                            'id': f"deadlock-{int(datetime.now().timestamp() * 1000)}",
                            'timestamp': datetime.now().timestamp() * 1000,
                            'type': 'circular-wait',
                            'cycle': cycle,
                            'processes': cycle,
                            'resources': self.get_resources_in_cycle(cycle),
                            'severity': 'high'
                        }
                        
                        self.detected_deadlocks.append(deadlock)
                        
                        return {
                            'detected': True,
                            'deadlock': deadlock
                        }
        
        return {'detected': False}
    
    def detect_cycle(self, start_process):
        """Detect circular wait using DFS"""
        visited = set()
        recursion_stack = set()
        path = []
        
        def dfs(process_id):
            if process_id in recursion_stack:
                # Cycle detected - extract the cycle
                try:
                    cycle_start = path.index(process_id)
                    return path[cycle_start:]
                except ValueError:
                    return []
            
            if process_id in visited:
                return []
            
            visited.add(process_id)
            recursion_stack.add(process_id)
            path.append(process_id)
            
            # Check what resource this process is waiting for
            if process_id in self.waiting_for:
                waiting_for_resource = self.waiting_for[process_id]
                
                if waiting_for_resource in self.resource_graph:
                    resource = self.resource_graph[waiting_for_resource]
                    
                    if resource['owner']:
                        cycle = dfs(resource['owner'])
                        if cycle:
                            return cycle
            
            recursion_stack.discard(process_id)
            path.pop()
            
            return []
        
        return dfs(start_process)
    
    def get_resources_in_cycle(self, cycle):
        """Get resources involved in the deadlock cycle"""
        resources = []
        
        for process_id in cycle:
            if process_id in self.waiting_for:
                resource_id = self.waiting_for[process_id]
                owner = self.resource_graph.get(resource_id, {}).get('owner')
                
                resources.append({
                    'resourceId': resource_id,
                    'owner': owner,
                    'waitingProcess': process_id
                })
        
        return resources
    
    def get_deadlocks(self):
        """Get all detected deadlocks and potential deadlocks"""
        potential_deadlocks = self.analyze_potential_deadlocks()
        
        now = datetime.now().timestamp() * 1000
        recent = [d for d in self.detected_deadlocks if now - d['timestamp'] < 60000]
        
        return {
            'detected': self.detected_deadlocks,
            'potential': potential_deadlocks,
            'summary': {
                'total': len(self.detected_deadlocks),
                'recent': len(recent)
            }
        }
    
    def analyze_potential_deadlocks(self):
        """Analyze for potential deadlocks"""
        potential = []
        
        # Check for processes waiting too long
        for process_id, resource_id in self.waiting_for.items():
            if resource_id in self.resource_graph:
                resource = self.resource_graph[resource_id]
                
                if resource['owner']:
                    locks_held_by_owner = self.process_locks.get(resource['owner'], set())
                    locks_held_by_waiter = self.process_locks.get(process_id, set())
                    
                    # Check for potential circular dependency
                    for held_resource in locks_held_by_waiter:
                        if held_resource in self.resource_graph:
                            held = self.resource_graph[held_resource]
                            if resource['owner'] in held.get('waiters', []):
                                potential.append({
                                    'type': 'potential-circular',
                                    'processA': process_id,
                                    'processB': resource['owner'],
                                    'resourceA': resource_id,
                                    'resourceB': held_resource,
                                    'severity': 'medium',
                                    'timestamp': datetime.now().timestamp() * 1000
                                })
        
        return potential
    
    def reset(self):
        """Reset all tracking"""
        self.resource_graph = {}
        self.process_locks = {}
        self.waiting_for = {}
        self.detected_deadlocks = []
    
    def get_system_state(self):
        """Get current system state"""
        resources = [
            {
                'id': res_id,
                'owner': data['owner'],
                'waiters': data['waiters']
            }
            for res_id, data in self.resource_graph.items()
        ]
        
        processes = [
            {
                'id': proc_id,
                'holds': list(locks),
                'waiting': self.waiting_for.get(proc_id)
            }
            for proc_id, locks in self.process_locks.items()
        ]
        
        return {
            'resources': resources,
            'processes': processes
        }
