import { useState } from 'react';
import './App.css';

// --- ALGORITHMS ---

const solveRoundRobin = (processesInput, timeQuantum) => {
  // Deep copy to avoid mutating original state
  let processes = processesInput.map(p => ({
    ...p,
    remainingTime: parseInt(p.burstTime),
    arrivalTime: parseInt(p.arrivalTime),
    burstTime: parseInt(p.burstTime),
    pid: p.id
  }));

  let tq = parseInt(timeQuantum);
  let time = 0;
  let queue = [];
  let gantt = [];
  let completed = 0;
  let n = processes.length;
  
  // Sort by Arrival Time
  processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
  
  let inQueue = new Array(n).fill(false);
  
  // Push first process
  if(n > 0) {
    queue.push(0);
    inQueue[0] = true;
  }

  while (completed < n && queue.length > 0) {
    let i = queue.shift();
    
    // If time is behind arrival, jump to arrival
    if(time < processes[i].arrivalTime) {
        time = processes[i].arrivalTime;
    }

    // Execute
    let exec = Math.min(tq, processes[i].remainingTime);
    time += exec;
    processes[i].remainingTime -= exec;
    gantt.push({ pid: processes[i].pid, time: time });

    // Check completion
    if (processes[i].remainingTime === 0) {
      processes[i].completionTime = time;
      processes[i].turnaroundTime = time - processes[i].arrivalTime;
      processes[i].waitingTime = processes[i].turnaroundTime - processes[i].burstTime;
      completed++;
    }

    // Check for new arrivals
    for (let j = 0; j < n; j++) {
      if (!inQueue[j] && processes[j].arrivalTime <= time && processes[j].remainingTime > 0) {
        queue.push(j);
        inQueue[j] = true;
      }
    }

    // If current process not finished, push back to queue
    if (processes[i].remainingTime > 0) {
      queue.push(i);
    }
    
    // Edge case: Queue is empty but processes remain (gaps in arrival times)
    if(queue.length === 0 && completed < n) {
        for(let k=0; k<n; k++) {
            if(!inQueue[k] && processes[k].remainingTime > 0) {
                queue.push(k);
                inQueue[k] = true;
                time = processes[k].arrivalTime; // Jump time
                break;
            }
        }
    }
  }

  // Sort back by PID for display
  processes.sort((a,b) => a.pid - b.pid);

  return { processes, gantt };
};

const solveLRU = (capacity, pages) => {
  let cacheMap = new Map(); 
  let hits = 0;
  let faults = 0;
  let history = []; // To store step-by-step details

  pages.forEach(page => {
    let status = "Fault";
    
    if (cacheMap.has(page)) {
      status = "Hit";
      hits++;
      // Refresh: delete and re-add to move to end (most recent)
      cacheMap.delete(page);
      cacheMap.set(page, true);
    } else {
      faults++;
      if (cacheMap.size === parseInt(capacity)) {
        // Remove the first item (least recently used)
        const firstKey = cacheMap.keys().next().value;
        cacheMap.delete(firstKey);
      }
      cacheMap.set(page, true);
    }

    // Capture state after operation
    // Array.from(cacheMap.keys()) gives [LRU, ..., MRU]
    history.push({
        step: history.length + 1,
        page: page,
        status: status,
        cacheState: Array.from(cacheMap.keys())
    });
  });

  return { hits, faults, ratio: (hits / (hits + faults)) || 0, history };
};

// --- COMPONENTS ---

function App() {
  const [activeTab, setActiveTab] = useState('rr');

  return (
    <div className="App">
      <header>
        <h1>OS Algorithms Visualizer</h1>
        <div className="tabs">
          <button className={activeTab === 'rr' ? 'active' : ''} onClick={() => setActiveTab('rr')}>Round Robin</button>
          <button className={activeTab === 'lru' ? 'active' : ''} onClick={() => setActiveTab('lru')}>LRU Cache</button>
        </div>
      </header>

      <main>
        {activeTab === 'rr' ? <RoundRobin /> : <LRUCache />}
      </main>
    </div>
  );
}

function RoundRobin() {
  const [processes, setProcesses] = useState([]);
  const [tq, setTq] = useState(2);
  const [newAt, setNewAt] = useState('');
  const [newBt, setNewBt] = useState('');
  const [result, setResult] = useState(null);

  const addProcess = () => {
    if (newAt === '' || newBt === '') return;
    setProcesses([...processes, { 
      id: processes.length + 1, 
      arrivalTime: parseInt(newAt), 
      burstTime: parseInt(newBt) 
    }]);
    setNewAt('');
    setNewBt('');
  };

  const runSimulation = () => {
    if (processes.length === 0) return;
    const res = solveRoundRobin(processes, tq);
    setResult(res);
  };

  return (
    <div className="card">
      <h2>Round Robin Scheduler</h2>
      
      <div className="input-group">
        <input type="number" placeholder="Arrival Time" value={newAt} onChange={e => setNewAt(e.target.value)} />
        <input type="number" placeholder="Burst Time" value={newBt} onChange={e => setNewBt(e.target.value)} />
        <button onClick={addProcess}>Add Process</button>
      </div>
      
      <div className="input-group" style={{marginTop: '10px'}}>
        <label>Time Quantum: </label>
        <input type="number" value={tq} onChange={e => setTq(e.target.value)} style={{width: '60px'}} />
        <button className="primary-btn" onClick={runSimulation}>Run Schedule</button>
      </div>

      <div className="process-list">
        <h3>Input Processes</h3>
        {processes.length === 0 ? <p>No processes added</p> : 
          <ul>
            {processes.map(p => <li key={p.id}>P{p.id}: AT={p.arrivalTime}, BT={p.burstTime}</li>)}
          </ul>
        }
      </div>

      {result && (
        <div className="results fade-in">
          <h3>Results</h3>
          <table>
            <thead>
              <tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Completion</th><th>Waiting</th><th>Turnaround</th></tr>
            </thead>
            <tbody>
              {result.processes.map(p => (
                <tr key={p.pid}>
                  <td>P{p.pid}</td>
                  <td>{p.arrivalTime}</td>
                  <td>{p.burstTime}</td>
                  <td>{p.completionTime}</td>
                  <td>{p.waitingTime}</td>
                  <td>{p.turnaroundTime}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Gantt Chart</h3>
          <div className="gantt">
            {result.gantt.map((g, idx) => (
              <div key={idx} className="block">
                P{g.pid}
                <span className="time-marker">{g.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LRUCache() {
  const [capacity, setCapacity] = useState(3);
  const [pagesInput, setPagesInput] = useState("");
  const [result, setResult] = useState(null);

  const runSimulation = () => {
    // Convert comma string "1, 2, 3" to array [1, 2, 3]
    const pages = pagesInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (pages.length === 0) return;
    const res = solveLRU(capacity, pages);
    setResult(res);
  };

  return (
    <div className="card">
      <h2>LRU Cache Simulation</h2>
      <div className="input-group">
        <label>Capacity:</label>
        <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
      </div>
      <div className="input-group">
        <label>Pages (comma separated):</label>
        <input 
          type="text" 
          placeholder="e.g. 1, 2, 3, 1, 4, 5" 
          value={pagesInput} 
          onChange={e => setPagesInput(e.target.value)} 
          style={{width: '250px'}}
        />
      </div>
      <button className="primary-btn" onClick={runSimulation}>Calculate Stats</button>

      {result && (
        <div className="results fade-in">
          {/* Summary Table */}
          <h3>Summary</h3>
          <table>
            <thead>
              <tr><th>Hits</th><th>Faults</th><th>Hit Ratio</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{result.hits}</td>
                <td>{result.faults}</td>
                <td>{result.ratio.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Detailed Step-by-Step Table */}
          <h3>Step-by-Step Execution</h3>
          <table className="step-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Page Accessed</th>
                <th>Status</th>
                <th>Cache Content (LRU → MRU)</th>
              </tr>
            </thead>
            <tbody>
              {result.history.map((step) => (
                <tr key={step.step}>
                  <td>{step.step}</td>
                  <td style={{fontWeight: 'bold'}}>{step.page}</td>
                  <td style={{
                    color: step.status === 'Hit' ? 'green' : 'red',
                    fontWeight: 'bold'
                  }}>
                    {step.status}
                  </td>
                  <td>
                    {/* Render cache blocks */}
                    <div style={{display: 'flex', justifyContent: 'center', gap: '5px'}}>
                      {step.cacheState.map((val, idx) => (
                        <span key={idx} style={{
                          border: '1px solid #333', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          background: val === step.page ? '#D1C4E9' : '#fff' // Highlight current page in cache
                        }}>
                          {val}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;