import React, { useState } from 'react';

export default function SystemSettings({ setActiveTab }) {
  const [activeSection, setActiveSection] = useState('general');
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem('neptune_temp') || 0.5));
  const [maxTokens, setMaxTokens] = useState(() => parseInt(localStorage.getItem('neptune_max_tokens') || 2048));
  const [isClearing, setIsClearing] = useState(false);
  const [clearStatus, setClearStatus] = useState("");

  // New General Settings (Working)
  const [enterToSend, setEnterToSend] = useState(() => localStorage.getItem('enter_to_send') !== 'false');
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('auto_scroll') !== 'false');
  const [soundEffects, setSoundEffects] = useState(() => localStorage.getItem('sound_effects') === 'true');

  const handleTempChange = (e) => { const newTemp = e.target.value; setTemperature(newTemp); localStorage.setItem('neptune_temp', newTemp); };
  const handleMaxTokensChange = (e) => { const newTokens = e.target.value; setMaxTokens(newTokens); localStorage.setItem('neptune_max_tokens', newTokens); };
  
  const toggleEnterToSend = () => { const v = !enterToSend; setEnterToSend(v); localStorage.setItem('enter_to_send', v); };
  const toggleAutoScroll = () => { const v = !autoScroll; setAutoScroll(v); localStorage.setItem('auto_scroll', v); };
  const toggleSoundEffects = () => { const v = !soundEffects; setSoundEffects(v); localStorage.setItem('sound_effects', v); };

  const handleClearMemory = async () => {
    setIsClearing(true); setClearStatus("");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat/clear-memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: "default-session" }) });
      if (response.ok) setClearStatus("NEPTUNE's memory cleared successfully.");
      else setClearStatus("No active memory found to clear.");
    } catch (err) { setClearStatus("Failed to connect to backend."); } finally { setIsClearing(false); setTimeout(() => setClearStatus(""), 4000); }
  };

  const Toggle = ({ enabled, onClick }) => (
    <button onClick={onClick} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${enabled ? 'bg-white' : 'bg-neutral-700'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
  const navItems = [ { id: 'general', label: 'General' }, { id: 'ai', label: 'AI Behavior' }, { id: 'tools', label: 'Tools & Agents' }, { id: 'system', label: 'System' } ];

  return (
    <div className="flex-1 flex h-full overflow-hidden p-6 max-w-6xl mx-auto w-full text-neutral-100 select-text">
      <style>{`
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-runnable-track { background: rgba(255,255,255,0.1); height: 4px; border-radius: 2px; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -6px; background-color: #ffffff; height: 16px; width: 16px; border-radius: 50%; box-shadow: 0 0 10px rgba(255,255,255,0.5); }
      `}</style>
      <aside className="w-48 h-full bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-4 flex flex-col gap-1 flex-shrink-0">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4 px-2">Settings</h2>
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${activeSection === item.id ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            {item.label}
          </button>
        ))}
      </aside>
      <div className="flex-1 pl-8 overflow-y-auto pr-2">
        {activeSection === 'general' && (
          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold text-white mb-1">General</h3><p className="text-xs text-neutral-500 mb-6">Manage your interface and input preferences.</p></div>
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Enter to Send</span><span className="text-xs text-neutral-500">If enabled, pressing Enter sends the message. Press Shift+Enter for a new line.</span></div>
              <Toggle enabled={enterToSend} onClick={toggleEnterToSend} />
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Auto-Scroll Chat</span><span className="text-xs text-neutral-500">Automatically scroll to the latest message when NEPTUNE replies.</span></div>
              <Toggle enabled={autoScroll} onClick={toggleAutoScroll} />
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">System Sound Effects</span><span className="text-xs text-neutral-500">Play subtle audio cues for message sent and received events.</span></div>
              <Toggle enabled={soundEffects} onClick={toggleSoundEffects} />
            </div>
          </div>
        )}
        {activeSection === 'ai' && (
          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold text-white mb-1">AI Behavior</h3><p className="text-xs text-neutral-500 mb-6">Configure NEPTUNE's core processing parameters.</p></div>
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5">
              <div className="flex justify-between items-center mb-3"><span className="text-sm font-medium text-white">Creativity (Temperature)</span><span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded-md border border-white/[0.05] text-white">{parseFloat(temperature).toFixed(1)}</span></div>
              <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={handleTempChange} className="w-full" />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-2"><span>0.0 (Strictly Logical)</span><span>0.5 (Balanced)</span><span>1.0 (Highly Creative)</span></div>
            </div>
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5">
              <div className="flex justify-between items-center mb-3"><span className="text-sm font-medium text-white">Max Output Tokens</span><span className="text-xs font-mono bg-white/[0.05] px-2 py-1 rounded-md border border-white/[0.05] text-white">{maxTokens}</span></div>
              <input type="range" min="512" max="8192" step="512" value={maxTokens} onChange={handleMaxTokensChange} className="w-full" />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-2"><span>512 (Short)</span><span>4096 (Standard)</span><span>8192 (Max Length)</span></div>
            </div>
          </div>
        )}
        {activeSection === 'tools' && (
          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold text-white mb-1">Tools & Agents</h3><p className="text-xs text-neutral-500 mb-6">View active backend tools, modules, and swarm agents.</p></div>
            
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Data Sentinel Hub</span><span className="text-xs text-neutral-500">Pandas-powered engine for data cleaning, imputation, and analysis.</span></div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Dashboard Analytics</span><span className="text-xs text-neutral-500">Real-time monitoring of pipeline health and system metrics.</span></div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Python Sandbox Execution</span><span className="text-xs text-neutral-500">Allows NEPTUNE to execute and verify Python code locally.</span></div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Real-Time Weather API</span><span className="text-xs text-neutral-500">Fetches live meteorological data for location-based queries.</span></div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
            </div>

            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">ATS Resume Scoring</span><span className="text-xs text-neutral-500">Evaluates uploaded resumes against Applicant Tracking System criteria.</span></div>
              <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
            </div>
          </div>
        )}
        {activeSection === 'system' && (
          <div className="space-y-6">
            <div><h3 className="text-lg font-semibold text-white mb-1">System</h3><p className="text-xs text-neutral-500 mb-6">Manage memory and view system information.</p></div>
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5 flex items-center justify-between">
              <div><span className="text-sm font-medium text-white block">Clear Conversation Memory</span><span className="text-xs text-neutral-500">Wipes NEPTUNE's RAM short-term memory for the current session.</span></div>
              <button onClick={handleClearMemory} disabled={isClearing} className="px-4 py-2 text-xs font-medium text-white bg-rose-600/80 hover:bg-rose-600 rounded-lg transition-colors active:scale-95 disabled:opacity-50">{isClearing ? "Clearing..." : "Clear Memory"}</button>
            </div>
            {clearStatus && <p className="text-xs text-emerald-400 font-mono">{clearStatus}</p>}
            <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-xl p-5">
              <h4 className="text-sm font-medium text-white mb-3">System Information</h4>
              <div className="space-y-2 text-xs font-mono text-neutral-400">
                <div className="flex justify-between"><span>System Name :</span> <span className="text-white">NEPTUNE</span></div>
                <div className="flex justify-between"><span>LLM Engine :</span> <span className="text-white">Groq (Llama 3.1 8B Instant)</span></div>
                <div className="flex justify-between"><span>Backend Infrastructure :</span> <span className="text-white">FastAPI + Pandas</span></div>
                <div className="flex justify-between"><span>Frontend Framework :</span> <span className="text-white">React + Three.js</span></div>
                <div className="flex justify-between"><span>Architect :</span> <span className="text-white">JEYA MELBIN J</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}