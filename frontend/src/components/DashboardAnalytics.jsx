import React, { useState, useEffect } from 'react';

export default function DashboardAnalytics({ setActiveTab }) {
  const [timeRange, setTimeRange] = useState('24h');
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/stats');
      const data = await response.json();
      setStats(data);
      setIsLoading(false);
    } catch (err) {
      setStats(null);
      setIsLoading(false);
    }
  };
F
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const agents = [
    { name: "Nexus Core", role: "Primary Orchestrator", status: "Active", latency: "112ms", load: "34%" },
    { name: "SQL Sentinel", role: "Query Generator", status: "Active", latency: "145ms", load: "62%" },
    { name: "Data Cleaner", role: "Imputation Engine", status: "Idle", latency: "88ms", load: "0%" },
    { name: "Coder Agent", role: "Python/React Sandbox", status: "Active", latency: "95ms", load: "18%" },
  ];

  const activityLogs = [
    { id: "LOG-4091", time: "10:42:15", task: "Schema Analysis: rsvp_movies.csv", agent: "SQL Sentinel", status: "Success", duration: "1.2s" },
    { id: "LOG-4090", time: "10:39:02", task: "Sandbox Execution: Factorial.py", agent: "Coder Agent", status: "Success", duration: "0.8s" },
    { id: "LOG-4089", time: "10:15:44", task: "Data Cleanse: Null Imputation", agent: "Data Cleaner", status: "Completed", duration: "2.4s" },
    { id: "LOG-4088", time: "09:58:12", task: "Agent Routing: User Query", agent: "Nexus Core", status: "Success", duration: "0.3s" }
  ];

  const memoryLoadPercent = stats ? Math.min(stats.total_messages_in_memory * 5, 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-6 max-w-[1400px] mx-auto w-full text-neutral-100 select-text">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-wide text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.05] text-neutral-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </span>
            Dashboard Analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">Pipeline Health, Agent Swarm Utilization & Real-Time Performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-1 bg-black/40 backdrop-blur-xl border border-white/[0.05] p-1 rounded-xl font-mono text-xs">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1 rounded-lg transition-all ${timeRange === range ? 'bg-white/[0.1] text-white' : 'text-neutral-400 hover:text-white'}`}>{range}</button>
            ))}
          </div>
          <button onClick={() => setActiveTab('home')} className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 px-3 py-2 rounded-lg text-xs font-mono transition active:scale-95">✕ Close</button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">Pipeline Health</span>
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : stats ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-xl font-bold font-mono text-white">{isLoading ? 'Connecting...' : stats ? '99.8%' : 'Offline'}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Optimal Operational State</span>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">Active Swarm Agents</span>
          <span className="text-xl font-bold font-mono text-neutral-200">{stats ? stats.active_sessions : 0} / 4 Online</span>
          <span className="text-[10px] text-neutral-500 font-mono mt-1 block">Concurrent RAM Contexts</span>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">Avg Execution Time</span>
          <span className="text-xl font-bold font-mono text-neutral-200">110ms</span>
          <span className="text-[10px] text-cyan-300 font-mono mt-1 block">⚡ -14ms vs last hour</span>
        </div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 shadow-lg">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block mb-1">Messages Processed</span>
          <span className="text-xl font-bold font-mono text-purple-300">{stats ? stats.total_messages_in_memory.toLocaleString() : '0'}</span>
          <span className="text-[10px] text-purple-400 font-mono mt-1 block">+ Live RAM load</span>
        </div>
      </div>

      {/* MIDDLE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agent Swarm Monitor */}
        <div className="lg:col-span-2 bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 shadow-xl font-mono text-xs">
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.05] pb-3">
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Agent Swarm Cluster Status
            </h2>
            <span className="text-[10px] text-neutral-500">Auto-balanced</span>
          </div>
          <div className="space-y-3">
            {agents.map((ag, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/[0.02] rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.04] transition">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-sm">{ag.name}</span>
                  <span className="text-[10px] text-neutral-500">{ag.role}</span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">Latency</span>
                    <span className="text-cyan-300 font-bold">{ag.latency}</span>
                  </div>
                  <div className="text-right w-20">
                    <span className="text-[10px] text-neutral-500 block">Load</span>
                    <div className="w-full bg-neutral-800 rounded-full h-1 mt-1 overflow-hidden">
                      <div className="bg-white h-full rounded-full" style={{ width: ag.load }}></div>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] border ${ag.status === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400'}`}>{ag.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure Gauges */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 shadow-xl font-mono text-xs space-y-4">
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider border-b border-white/[0.05] pb-3">Backend Infrastructure</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">FastAPI Server Load</span>
                <span className="text-emerald-400 font-bold">28%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Vector Store / Memory</span>
                <span className="text-indigo-400 font-bold">{memoryLoadPercent}%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${memoryLoadPercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">LLM Token Quota</span>
                <span className="text-purple-300 font-bold">42%</span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '42%' }}></div>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-white/[0.05] text-[10px] text-neutral-500 space-y-1">
            <p>• Host: <span className="text-white">127.0.0.1:8000</span></p>
            <p>• Creator: <span className="text-white">{stats ? stats.creator : 'JEYA MELBIN J'}</span></p>
            <p>• Status: <span className={stats ? 'text-emerald-400' : 'text-rose-400'}>{stats ? 'Online' : 'Offline'}</span></p>
          </div>
        </div>
      </div>

      {/* ACTIVITY LOGS */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 shadow-xl font-mono flex-1 min-h-0 overflow-hidden flex flex-col">
        <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider mb-3">Recent Pipeline Execution Logs</h2>
        <div className="overflow-auto rounded-xl border border-white/[0.02] flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#0a0b0f]/90 backdrop-blur-xl z-10">
              <tr className="text-neutral-500 uppercase text-[10px]">
                <th className="p-2.5">Task ID</th>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Execution Summary</th>
                <th className="p-2.5">Assigned Agent</th>
                <th className="p-2.5">Duration</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-neutral-300">
              {activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition">
                  <td className="p-2.5 text-neutral-500 font-bold">{log.id}</td>
                  <td className="p-2.5">{log.time}</td>
                  <td className="p-2.5 text-white font-medium">{log.task}</td>
                  <td className="p-2.5 text-indigo-300">{log.agent}</td>
                  <td className="p-2.5">{log.duration}</td>
                  <td className="p-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[8px]">{log.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}