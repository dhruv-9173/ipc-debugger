// API Base URL
const API_URL = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000/ws';

// State
let ws = null;
let pipes = [];
let queues = [];
let memories = [];
let notifications = [];

// WebSocket Connection
function connectWebSocket() {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
}

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (connected) {
        indicator.classList.add('connected');
        indicator.classList.remove('disconnected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        indicator.classList.add('disconnected');
        text.textContent = 'Disconnected';
    }
}

function handleWebSocketMessage(data) {
    console.log('WebSocket message:', data);
    addNotification(getNotificationMessage(data));
    
    // Refresh data based on message type
    if (data.type.includes('PIPE')) fetchPipes();
    if (data.type.includes('QUEUE')) fetchQueues();
    if (data.type.includes('MEMORY')) fetchMemories();
}

function getNotificationMessage(data) {
    const messages = {
        'PIPE_CREATED': `Pipe created between processes`,
        'PIPE_DATA_TRANSFER': `Data transferred via pipe`,
        'QUEUE_MESSAGE_SENT': `Message sent to queue`,
        'QUEUE_MESSAGE_RECEIVED': `Message received from queue`,
        'MEMORY_WRITE': data.data?.deadlock?.detected ? '⚠️ Deadlock detected!' : `Memory written`,
        'MEMORY_LOCKED': `Memory locked`,
        'MEMORY_UNLOCKED': `Memory unlocked`
    };
    return messages[data.type] || `Event: ${data.type}`;
}

function addNotification(message) {
    notifications.push({ message, id: Date.now() });
    if (notifications.length > 10) notifications.shift();
    
    updateNotifications();
    setTimeout(() => {
        notifications = notifications.filter(n => Date.now() - n.id < 5000);
        updateNotifications();
    }, 5000);
}

function updateNotifications() {
    const bar = document.getElementById('notificationsBar');
    const badge = document.getElementById('notificationBadge');
    const count = document.getElementById('notificationCount');
    
    if (notifications.length > 0) {
        badge.style.display = 'block';
        bar.style.display = 'block';
        count.textContent = notifications.length;
        
        bar.innerHTML = notifications.slice(-3).map(n => 
            `<div class="notification-item">${n.message}</div>`
        ).join('');
    } else {
        badge.style.display = 'none';
        bar.style.display = 'none';
    }
}

// Tab Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        
        item.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// API Helpers
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_URL}${endpoint}`, options);
    return response.json();
}

// ===== PIPES =====
async function fetchPipes() {
    pipes = await apiCall('/pipes');
    renderPipes();
    updatePipeSelect();
}

function renderPipes() {
    const list = document.getElementById('pipesList');
    const count = document.getElementById('pipesCount');
    count.textContent = pipes.length;
    
    if (pipes.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔗</div>
                <div>No pipes created yet</div>
                <p>Create your first pipe to start debugging IPC</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = pipes.map(pipe => `
        <div class="card" style="background: #f8f9fa;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600;">${pipe.processA}</span>
                    <span style="font-size: 1.5rem; color: #667eea;">↔</span>
                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600;">${pipe.processB}</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deletePipe('${pipe.id}')">Delete</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; padding: 15px; background: white; border-radius: 8px; margin-bottom: 15px;">
                <div><small style="color: #666;">A→B Messages</small><br><strong>${pipe.stats.messagesAtoB}</strong></div>
                <div><small style="color: #666;">B→A Messages</small><br><strong>${pipe.stats.messagesBtoA}</strong></div>
                <div><small style="color: #666;">Total Bytes</small><br><strong>${pipe.stats.bytesTransferred}</strong></div>
                <div><small style="color: #666;">Buffer A</small><br><strong>${pipe.bufferA.length}</strong></div>
                <div><small style="color: #666;">Buffer B</small><br><strong>${pipe.bufferB.length}</strong></div>
            </div>
            <div style="background: #e0e0e0; height: 25px; border-radius: 20px; margin-bottom: 8px; position: relative; overflow: hidden;">
                <div style="position: absolute; left: 10px; top: 5px; font-size: 0.85rem; font-weight: 600; z-index: 1;">Buffer A→B</div>
                <div style="background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%); height: 100%; width: ${Math.min(pipe.bufferA.length, 100)}%; color: white; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; font-weight: 700;">${pipe.bufferA.length}</div>
            </div>
            <div style="background: #e0e0e0; height: 25px; border-radius: 20px; position: relative; overflow: hidden;">
                <div style="position: absolute; left: 10px; top: 5px; font-size: 0.85rem; font-weight: 600; z-index: 1;">Buffer B→A</div>
                <div style="background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%); height: 100%; width: ${Math.min(pipe.bufferB.length, 100)}%; color: white; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; font-weight: 700;">${pipe.bufferB.length}</div>
            </div>
        </div>
    `).join('');
}

function updatePipeSelect() {
    const select = document.getElementById('pipeSelect');
    const currentValue = select.value; // Save current selection
    select.innerHTML = '<option value="">-- Select a pipe --</option>' + 
        pipes.map(p => `<option value="${p.id}">${p.processA} ↔ ${p.processB}</option>`).join('');
    
    // Restore selection if it still exists
    if (currentValue && pipes.find(p => p.id === currentValue)) {
        select.value = currentValue;
    }
}

document.getElementById('createPipeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const processA = document.getElementById('processA').value;
    const processB = document.getElementById('processB').value;
    
    await apiCall('/pipes/create', 'POST', { processA, processB });
    document.getElementById('createPipeForm').reset();
    fetchPipes();
});

document.getElementById('sendPipeDataForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pipeId = document.getElementById('pipeSelect').value;
    const direction = document.getElementById('pipeDirection').value;
    const data = document.getElementById('pipeMessage').value;
    
    if (!pipeId) return alert('Please select a pipe');
    
    await apiCall('/pipes/send', 'POST', { pipeId, direction, data });
    document.getElementById('pipeMessage').value = '';
    fetchPipes();
});

async function deletePipe(id) {
    if (confirm('Delete this pipe?')) {
        await apiCall(`/pipes/${id}`, 'DELETE');
        fetchPipes();
    }
}

// ===== QUEUES =====
async function fetchQueues() {
    queues = await apiCall('/queues');
    renderQueues();
    updateQueueSelect();
}

function renderQueues() {
    const list = document.getElementById('queuesList');
    const count = document.getElementById('queuesCount');
    count.textContent = queues.length;
    
    if (queues.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📬</div>
                <div>No queues created yet</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = queues.map(queue => {
        const utilization = (queue.currentSize / queue.maxSize) * 100;
        return `
            <div class="card" style="background: #f8f9fa;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <h4>${queue.name}</h4>
                    <button class="btn btn-danger btn-sm" onclick="deleteQueue('${queue.id}')">Delete</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
                    <div class="stat-card"><div class="stat-value">${queue.currentSize}</div><div class="stat-label">Messages</div></div>
                    <div class="stat-card"><div class="stat-value">${queue.stats.totalSent}</div><div class="stat-label">Sent</div></div>
                    <div class="stat-card"><div class="stat-value">${queue.stats.totalReceived}</div><div class="stat-label">Received</div></div>
                    <div class="stat-card"><div class="stat-value">${queue.stats.averageWaitTime.toFixed(0)}ms</div><div class="stat-label">Avg Wait</div></div>
                </div>
                <div><small style="color: #666;">Utilization: ${utilization.toFixed(1)}% (${queue.currentSize}/${queue.maxSize})</small></div>
                <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; margin-top: 8px;">
                    <div style="background: ${utilization > 80 ? 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)' : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'}; height: 100%; width: ${utilization}%; transition: width 0.3s;"></div>
                </div>
                ${queue.subscribers.length > 0 ? `<div style="margin-top: 10px; font-size: 0.9rem; color: #666;"><strong>Subscribers:</strong> ${queue.subscribers.join(', ')}</div>` : ''}
            </div>
        `;
    }).join('');
}

function updateQueueSelect() {
    const select = document.getElementById('queueSelect');
    const currentValue = select.value; // Save current selection
    select.innerHTML = '<option value="">-- Select a queue --</option>' + 
        queues.map(q => `<option value="${q.id}">${q.name} (${q.currentSize}/${q.maxSize})</option>`).join('');
    
    // Restore selection if it still exists
    if (currentValue && queues.find(q => q.id === currentValue)) {
        select.value = currentValue;
    }
}

document.getElementById('createQueueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('queueName').value;
    const maxSize = parseInt(document.getElementById('queueMaxSize').value);
    
    await apiCall('/queues/create', 'POST', { name, maxSize });
    document.getElementById('createQueueForm').reset();
    fetchQueues();
});

document.getElementById('sendQueueMessageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const queueId = document.getElementById('queueSelect').value;
    const sender = document.getElementById('queueSender').value;
    const message = document.getElementById('queueMessage').value;
    const priority = parseInt(document.getElementById('queuePriority').value);
    
    if (!queueId) return alert('Please select a queue');
    
    const result = await apiCall('/queues/send', 'POST', { 
        queueId, 
        sender, 
        message: { content: message, priority } 
    });
    
    if (!result.success) alert(result.error);
    
    document.getElementById('queueSender').value = '';
    document.getElementById('queueMessage').value = '';
    document.getElementById('queuePriority').value = '0';
    fetchQueues();
});

document.getElementById('receiveMessageBtn').addEventListener('click', async () => {
    const queueId = document.getElementById('queueSelect').value;
    const receiver = document.getElementById('queueReceiver').value;
    
    if (!queueId || !receiver) return alert('Please select queue and enter receiver');
    
    const result = await apiCall('/queues/receive', 'POST', { queueId, receiver });
    
    if (result.success) {
        alert(`Received: ${JSON.stringify(result.message.data)}\nWait time: ${result.waitTime.toFixed(2)}ms`);
    } else {
        alert(result.error);
    }
    
    fetchQueues();
});

async function deleteQueue(id) {
    if (confirm('Delete this queue?')) {
        await apiCall(`/queues/${id}`, 'DELETE');
        fetchQueues();
    }
}

// ===== SHARED MEMORY =====
async function fetchMemories() {
    memories = await apiCall('/shared-memory');
    renderMemories();
    updateMemorySelect();
}

function renderMemories() {
    const list = document.getElementById('memoriesList');
    const count = document.getElementById('memoriesCount');
    count.textContent = memories.length;
    
    if (memories.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💾</div>
                <div>No memory segments created</div>
            </div>
        `;
        return;
    }
    
    list.innerHTML = memories.map(mem => `
        <div class="card" style="background: #f8f9fa;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <h4>${mem.name}</h4>
                <button class="btn btn-danger btn-sm" onclick="deleteMemory('${mem.id}')">Delete</button>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-weight: 600; color: #666;">Size:</span><span>${mem.size} bytes</span></div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-weight: 600; color: #666;">Utilization:</span><span>${mem.utilization.toFixed(1)}%</span></div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;"><span style="font-weight: 600; color: #666;">Lock Status:</span><span class="badge ${mem.lock.isLocked ? 'badge-danger' : 'badge-success'}">${mem.lock.isLocked ? '🔒 Locked by ' + mem.lock.owner : '🔓 Unlocked'}</span></div>
            </div>
            ${mem.lock.waitingProcesses.length > 0 ? `<div style="background: #fff3cd; color: #856404; padding: 10px 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #ffc107;"><strong>⏳ Waiting:</strong> ${mem.lock.waitingProcesses.join(', ')}</div>` : ''}
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
                <div class="stat-card"><div class="stat-value">${mem.stats.reads}</div><div class="stat-label">Reads</div></div>
                <div class="stat-card"><div class="stat-value">${mem.stats.writes}</div><div class="stat-label">Writes</div></div>
                <div class="stat-card"><div class="stat-value">${mem.stats.conflicts}</div><div class="stat-label">Conflicts</div></div>
                <div class="stat-card"><div class="stat-value">${mem.currentSize}</div><div class="stat-label">Size</div></div>
            </div>
            <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: #ecf0f1;">
                <strong style="color: #3498db; display: block; margin-bottom: 10px;">Current Data:</strong>
                <pre style="margin: 0; font-family: monospace; font-size: 0.9rem; color: #2ecc71; overflow-x: auto;">${JSON.stringify(mem.data, null, 2) || '{}'}</pre>
            </div>
        </div>
    `).join('');
}

function updateMemorySelect() {
    const select = document.getElementById('memorySelect');
    const currentValue = select.value; // Save current selection
    select.innerHTML = '<option value="">-- Select memory --</option>' + 
        memories.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    
    // Restore selection if it still exists
    if (currentValue && memories.find(m => m.id === currentValue)) {
        select.value = currentValue;
    }
}

document.getElementById('createMemoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('memoryName').value;
    const size = parseInt(document.getElementById('memorySize').value);
    
    await apiCall('/shared-memory/create', 'POST', { name, size });
    document.getElementById('createMemoryForm').reset();
    fetchMemories();
});

document.getElementById('acquireLockBtn').addEventListener('click', async () => {
    const memoryId = document.getElementById('memorySelect').value;
    const processId = document.getElementById('lockProcessId').value;
    
    if (!memoryId || !processId) return alert('Please select memory and enter process ID');
    
    const result = await apiCall('/shared-memory/lock', 'POST', { memoryId, processId });
    
    if (result.success) {
        alert(result.acquired ? 'Lock acquired!' : 'Waiting for lock...');
    } else {
        alert(result.error);
    }
    
    fetchMemories();
});

document.getElementById('releaseLockBtn').addEventListener('click', async () => {
    const memoryId = document.getElementById('memorySelect').value;
    const processId = document.getElementById('lockProcessId').value;
    
    if (!memoryId || !processId) return alert('Please select memory and enter process ID');
    
    const result = await apiCall('/shared-memory/unlock', 'POST', { memoryId, processId });
    
    if (result.success) {
        alert('Lock released!');
    } else {
        alert(result.error);
    }
    
    fetchMemories();
});

document.getElementById('writeMemoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memoryId = document.getElementById('memorySelect').value;
    const processId = document.getElementById('lockProcessId').value;
    const writeData = document.getElementById('memoryWriteData').value;
    
    if (!memoryId || !processId) return alert('Please select memory and enter process ID');
    
    try {
        const data = JSON.parse(writeData);
        const result = await apiCall('/shared-memory/write', 'POST', { memoryId, processId, data });
        
        if (result.success) {
            alert('Data written successfully!');
            document.getElementById('memoryWriteData').value = '';
        } else {
            alert(result.error);
        }
        
        if (result.deadlock?.detected) {
            alert('⚠️ DEADLOCK DETECTED!\n' + JSON.stringify(result.deadlock.deadlock, null, 2));
        }
        
        fetchMemories();
    } catch (err) {
        alert('Invalid JSON format');
    }
});

document.getElementById('readMemoryBtn').addEventListener('click', async () => {
    const memoryId = document.getElementById('memorySelect').value;
    const processId = document.getElementById('readProcessId').value;
    
    if (!memoryId || !processId) return alert('Please select memory and enter process ID');
    
    const result = await apiCall('/shared-memory/read', 'POST', { memoryId, processId });
    
    if (result.success) {
        alert(`Read data:\n${JSON.stringify(result.data, null, 2)}\n\n${result.warning || ''}`);
    }
    
    fetchMemories();
});

async function deleteMemory(id) {
    if (confirm('Delete this memory segment?')) {
        await apiCall(`/shared-memory/${id}`, 'DELETE');
        fetchMemories();
    }
}

// ===== ANALYSIS =====
async function fetchAnalysis() {
    const bottlenecks = await apiCall('/analysis/bottlenecks');
    const deadlocks = await apiCall('/analysis/deadlocks');
    
    renderSystemMetrics(bottlenecks.systemMetrics);
    renderBottlenecks(bottlenecks);
    renderDeadlocks(deadlocks);
}

function renderSystemMetrics(metrics) {
    document.getElementById('systemMetrics').innerHTML = `
        <div class="stat-card"><div class="stat-value">${metrics.totalTransfers}</div><div class="stat-label">Total Transfers</div></div>
        <div class="stat-card"><div class="stat-value">${(metrics.totalBytes / 1024).toFixed(2)} KB</div><div class="stat-label">Total Data</div></div>
        <div class="stat-card"><div class="stat-value">${metrics.avgTransferSize.toFixed(0)} B</div><div class="stat-label">Avg Size</div></div>
        <div class="stat-card"><div class="stat-value">${metrics.transferRate.toFixed(0)} B/s</div><div class="stat-label">Transfer Rate</div></div>
    `;
}

function renderBottlenecks(data) {
    const container = document.getElementById('bottlenecksContent');
    const hasLive = data.bottlenecks.length > 0;
    const hasHistory = data.history && data.history.items && data.history.items.length > 0;

    if (!hasLive && !hasHistory) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; background: #f0f9ff; border-radius: 8px; color: #0c5460;"><div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 10px;">✅ No bottlenecks detected</div><p style="margin: 0;">System is running smoothly</p></div>';
        return;
    }

    const liveSummary = data.summary;
    const historySummary = data.history?.summary || { total: 0, highSeverity: 0, mediumSeverity: 0 };
    const historyItems = data.history?.items || [];

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div><strong>Live High Severity:</strong> <span style="color: ${liveSummary.highSeverity > 0 ? '#f44336' : '#333'}; font-size: 1.1rem; font-weight: 700;">${liveSummary.highSeverity}</span></div>
            <div><strong>Live Medium Severity:</strong> <span style="color: ${liveSummary.mediumSeverity > 0 ? '#ff9800' : '#333'}; font-size: 1.1rem; font-weight: 700;">${liveSummary.mediumSeverity}</span></div>
            <div><strong>History Total:</strong> <span style="font-size: 1.1rem; font-weight: 700;">${historySummary.total}</span></div>
            <div><strong>History High Severity:</strong> <span style="color: ${historySummary.highSeverity > 0 ? '#f44336' : '#333'}; font-size: 1.1rem; font-weight: 700;">${historySummary.highSeverity}</span></div>
        </div>
        ${data.bottlenecks.map(b => `
            <div style="background: #fff; border: 2px solid #e0e0e0; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">${b.type.toUpperCase()}</span>
                    <span style="color: #666; font-size: 0.9rem;">Resource: ${b.resourceId}</span>
                </div>
                ${b.issues.map(issue => `
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px 15px; border-radius: 8px; background: ${issue.severity === 'high' ? '#ffebee' : '#fff3e0'}; border-left: 4px solid ${issue.severity === 'high' ? '#f44336' : '#ff9800'}; margin-bottom: 8px;">
                        <span>${issue.severity === 'high' ? '🔴' : '🟡'}</span>
                        <span style="font-size: 0.9rem;">${issue.message}</span>
                    </div>
                `).join('')}
            </div>
        `).join('')}
        ${historyItems.length > 0 ? `
            <h4 style="font-size: 1.05rem; font-weight: 600; margin: 15px 0 10px;">📚 Bottleneck History (last ${historyItems.length} events)</h4>
            ${historyItems.slice(-10).reverse().map(b => `
                <div style="background: #fafafa; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; border-left: 3px solid ${b.issues.some(i => i.severity === 'high') ? '#f44336' : '#ff9800'};">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                        <span><strong>${b.type.toUpperCase()}</strong> • ${b.resourceId}</span>
                        <span style="color: #777;">${new Date(b.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #555;">${b.issues[0]?.message || 'Bottleneck detected'}</div>
                </div>
            `).join('')}
        ` : ''}
    `;
}

function renderDeadlocks(data) {
    const container = document.getElementById('deadlocksContent');
    
    if (data.detected.length === 0 && data.potential.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; background: #f0f9ff; border-radius: 8px; color: #0c5460;"><div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 10px;">✅ No deadlocks detected</div><p style="margin: 0;">No circular wait conditions found</p></div>';
        return;
    }
    
    let html = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <div><strong>Total:</strong> <span style="color: ${data.summary.total > 0 ? '#f44336' : '#333'}; font-size: 1.3rem; font-weight: 700;">${data.summary.total}</span></div>
            <div><strong>Recent:</strong> <span style="color: ${data.summary.recent > 0 ? '#f44336' : '#333'}; font-size: 1.3rem; font-weight: 700;">${data.summary.recent}</span></div>
            <div><strong>Potential:</strong> <span style="color: ${data.potential.length > 0 ? '#ff9800' : '#333'}; font-size: 1.3rem; font-weight: 700;">${data.potential.length}</span></div>
        </div>
    `;
    
    if (data.detected.length > 0) {
        html += '<h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">🔴 Detected Deadlocks</h4>';
        html += data.detected.slice(-5).map(d => `
            <div style="background: #ffebee; border: 2px solid #e0e0e0; border-left: 4px solid #f44336; border-radius: 10px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <strong>${d.type}</strong>
                    <span style="color: #666; font-size: 0.85rem;">${new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style="margin-bottom: 10px;"><strong>Cycle:</strong> ${d.processes.join(' → ')} → ${d.processes[0]}</div>
                <div><strong>Resources:</strong>${d.resources.map(r => `<div style="padding: 5px 0; color: #666;">• ${r.resourceId} (Owner: ${r.owner}, Waiting: ${r.waitingProcess})</div>`).join('')}</div>
            </div>
        `).join('');
    }
    
    container.innerHTML = html;
}

document.getElementById('resetAnalysisBtn').addEventListener('click', async () => {
    if (confirm('Reset all analysis data?')) {
        await apiCall('/analysis/reset', 'POST');
        fetchAnalysis();
    }
});

// ===== SIMULATOR =====
async function runProducerConsumer() {
    addNotification('🔄 Starting Producer-Consumer simulation...');
    
    // Create a pipe
    const pipe = await apiCall('/pipes/create', 'POST', { 
        processA: 'Producer', 
        processB: 'Consumer' 
    });
    
    // Create a queue
    const queue = await apiCall('/queues/create', 'POST', { 
        name: 'WorkQueue', 
        maxSize: 50 
    });
    
    // Simulate data transfer
    for (let i = 1; i <= 10; i++) {
        await apiCall('/pipes/send', 'POST', { 
            pipeId: pipe.id, 
            direction: 'AtoB', 
            data: `Product ${i}` 
        });
        
        await apiCall('/queues/send', 'POST', { 
            queueId: queue.id, 
            sender: 'Producer', 
            message: { content: `Task ${i}`, priority: Math.floor(Math.random() * 3) } 
        });
        
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    addNotification('✅ Producer-Consumer simulation completed!');
    fetchPipes();
    fetchQueues();
}

async function runDataSharing() {
    addNotification('📊 Starting Data Sharing simulation...');
    
    // Create shared memory
    const memory = await apiCall('/shared-memory/create', 'POST', { 
        name: 'SharedData', 
        size: 1024 
    });
    
    const processes = ['ProcessA', 'ProcessB', 'ProcessC'];
    
    for (let i = 0; i < 5; i++) {
        for (const proc of processes) {
            // Acquire lock
            await apiCall('/shared-memory/lock', 'POST', { 
                memoryId: memory.id, 
                processId: proc 
            });
            
            // Write data
            await apiCall('/shared-memory/write', 'POST', { 
                memoryId: memory.id, 
                processId: proc, 
                data: { counter: i, process: proc, timestamp: Date.now() } 
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Release lock
            await apiCall('/shared-memory/unlock', 'POST', { 
                memoryId: memory.id, 
                processId: proc 
            });
        }
    }
    
    addNotification('✅ Data Sharing simulation completed!');
    fetchMemories();
}

async function runDeadlockScenario() {
    addNotification('⚠️ Starting Deadlock scenario...');
    
    // Create two memory segments
    const mem1 = await apiCall('/shared-memory/create', 'POST', { 
        name: 'Resource1', 
        size: 512 
    });
    
    const mem2 = await apiCall('/shared-memory/create', 'POST', { 
        name: 'Resource2', 
        size: 512 
    });
    
    // Process A locks mem1
    await apiCall('/shared-memory/lock', 'POST', { 
        memoryId: mem1.id, 
        processId: 'ProcessA' 
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Process B locks mem2
    await apiCall('/shared-memory/lock', 'POST', { 
        memoryId: mem2.id, 
        processId: 'ProcessB' 
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Process A tries to write to mem2 (needs lock held by B)
    await apiCall('/shared-memory/write', 'POST', { 
        memoryId: mem2.id, 
        processId: 'ProcessA', 
        data: { message: 'From A' } 
    });
    
    // Process B tries to write to mem1 (needs lock held by A)
    await apiCall('/shared-memory/write', 'POST', { 
        memoryId: mem1.id, 
        processId: 'ProcessB', 
        data: { message: 'From B' } 
    });
    
    addNotification('⚠️ Deadlock scenario executed! Check Analysis tab.');
    fetchMemories();
    fetchAnalysis();
}

async function runHighTraffic() {
    addNotification('🚦 Starting High Traffic simulation...');
    
    // Create multiple pipes
    const pipes = [];
    for (let i = 1; i <= 5; i++) {
        const pipe = await apiCall('/pipes/create', 'POST', { 
            processA: `Node${i}`, 
            processB: `Node${i+1}` 
        });
        pipes.push(pipe);
    }
    
    // Create multiple queues
    const queues = [];
    for (let i = 1; i <= 3; i++) {
        const queue = await apiCall('/queues/create', 'POST', { 
            name: `HighTrafficQueue${i}`, 
            maxSize: 100 
        });
        queues.push(queue);
    }
    
    // Send lots of data
    const promises = [];
    for (let i = 0; i < 50; i++) {
        const pipe = pipes[i % pipes.length];
        const queue = queues[i % queues.length];
        
        promises.push(
            apiCall('/pipes/send', 'POST', { 
                pipeId: pipe.id, 
                direction: Math.random() > 0.5 ? 'AtoB' : 'BtoA', 
                data: `Packet ${i}` 
            })
        );
        
        promises.push(
            apiCall('/queues/send', 'POST', { 
                queueId: queue.id, 
                sender: `Sender${i % 3}`, 
                message: { content: `Message ${i}`, priority: i % 3 } 
            })
        );
        
        // Batch every 10 requests
        if (promises.length >= 20) {
            await Promise.all(promises);
            promises.length = 0;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    await Promise.all(promises);
    addNotification('✅ High Traffic simulation completed!');
    fetchPipes();
    fetchQueues();
    fetchAnalysis();
}

// Attach simulator event listeners
document.addEventListener('DOMContentLoaded', () => {
    const scenarioButtons = document.querySelectorAll('.scenario-card button');
    scenarioButtons[0].onclick = () => runProducerConsumer();
    scenarioButtons[1].onclick = () => runDataSharing();
    scenarioButtons[2].onclick = () => runDeadlockScenario();
    scenarioButtons[3].onclick = () => runHighTraffic();
});

// Initialize
connectWebSocket();
fetchPipes();
fetchQueues();
fetchMemories();
fetchAnalysis();

// Auto-refresh
setInterval(() => {
    fetchPipes();
    fetchQueues();
    fetchMemories();
    fetchAnalysis();
}, 3000);
