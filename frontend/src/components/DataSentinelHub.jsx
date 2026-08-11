import React, { useState, useEffect, useRef } from 'react';

const API_BASE = "http://localhost:8000/api/sentinel";

export default function DataSentinelHub({ onClose, onSendToChat, onSendContext }) {
  const [datasets, setDatasets] = useState({});
  const [activeKey, setActiveKey] = useState("rsvp_movies");
  const [activeTab, setActiveTab] = useState("preview");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ col: null, dir: 'asc' });
  const [showMathPanel, setShowMathPanel] = useState(false);
  const [selectedMathCol, setSelectedMathCol] = useState("");
  const [mathStats, setMathStats] = useState(null);
  
  const [showFillPanel, setShowFillPanel] = useState(false);
  const [fillStrategy, setFillStrategy] = useState("mean");
  const [selectedFillCols, setSelectedFillCols] = useState([]);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [taskNotice, setTaskNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement("script");
      script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
    fetchSummary("rsvp_movies");
  }, []);

  const activeDataset = datasets[activeKey];

  useEffect(() => {
    if (activeDataset && activeDataset.columns) {
      const firstNumCol = activeDataset.columns.find(c => c.type === "FLOAT") || activeDataset.columns[0];
      if (firstNumCol) handleMathColChange(firstNumCol.name);
    }
  }, [activeKey, activeDataset]);

  const handleMathColChange = async (colName) => {
    setSelectedMathCol(colName);
    if (!activeKey) return;
    try {
      const res = await fetch(`${API_BASE}/column-stats?dataset_key=${activeKey}&column_name=${colName}`);
      if (res.ok) setMathStats(await res.json());
    } catch (err) {}
  };

  const updateDatasetState = (key, data) => {
    setDatasets(prev => ({ ...prev, [key]: { ...prev[key], ...data } }));
  };

  const fetchSummary = async (key) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/summary?dataset_key=${key}`);
      if (response.ok) {
        const data = await response.json();
        setDatasets(prev => ({
          ...prev,
          [key]: {
            name: key === "rsvp_movies" ? "RSVP Movies" : key, filename: key === "rsvp_movies" ? "rsvp_movies.csv" : key,
            totalRows: data.total_records, totalCols: data.total_columns, nullCount: data.missing_values,
            fileSize: data.file_footprint, columns: data.columns, rows: data.sample_data
          }
        }));
      }
    } catch (err) {} finally { setLoading(false); }
  };

  const handleApiAction = async (endpoint, method = 'POST', queryParams = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dataset_key: activeKey, ...queryParams });
      const res = await fetch(`${API_BASE}/${endpoint}?${params}`, { method });
      if (res.ok) {
        const data = await res.json();
        updateDatasetState(activeKey, { rows: data.data_grid, totalRows: data.total_records || activeDataset.totalRows, nullCount: data.remaining_nulls !== undefined ? data.remaining_nulls : activeDataset.nullCount });
        setTaskNotice(`✨ ${endpoint.replace('-', ' ')} successful!`);
        await fetchSummary(activeKey);
      }
    } catch (err) {} finally { setLoading(false); setTimeout(() => setTaskNotice(""), 3000); }
  };

  const handleImputeMissing = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/impute-missing?dataset_key=${activeKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: fillStrategy, columns: selectedFillCols })
      });
      if (res.ok) {
        const data = await res.json();
        updateDatasetState(activeKey, { rows: data.data_grid, nullCount: data.remaining_nulls });
        setTaskNotice(`✨ Filled missing values using ${fillStrategy}!`);
        setShowFillPanel(false);
        await fetchSummary(activeKey);
      }
    } catch (err) {} finally { setLoading(false); setTimeout(() => setTaskNotice(""), 3000); }
  };

  const toggleFillCol = (colName) => {
    setSelectedFillCols(prev => prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true); setTaskNotice(`Uploading ${file.name}...`);
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json(); setActiveKey(data.dataset_key);
        await fetchSummary(data.dataset_key); setTaskNotice(`Ingested ${file.name}!`);
      } else { const err = await res.json(); throw new Error(err.detail); }
    } catch (err) { alert(`Error: ${err.message}`); } finally { setLoading(false); setTimeout(() => setTaskNotice(""), 3000); e.target.value = ""; }
  };

  const handleExportExcel = () => {
    if (!activeDataset?.rows?.length || !window.XLSX) return;
    const ws = window.XLSX.utils.json_to_sheet(activeDataset.rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Dataset");
    window.XLSX.writeFile(wb, `${activeDataset.name}_export.xlsx`);
  };

  // COMPRESSED CONTEXT: Send CSV string instead of JSON to save tokens
  const handleSendContextToMika = () => {
    if (!activeDataset) return;
    
    const schema = activeDataset.columns.map(c => c.name).join(",");
    const dataRows = activeDataset.rows.slice(0, 20).map(row => 
      activeDataset.columns.map(c => row[c.name] ?? "").join(",")
    );
    const contextStr = `Schema:\n${schema}\n\nData:\n${dataRows.join("\n")}`;
    
    if (onSendToChat) onSendToChat("I am analyzing the dataset from the Data Sentinel Hub. What insights can you provide?");
    if (onSendContext) onSendContext(contextStr);
    setTaskNotice("Transferred dataset to NEPTUNE!");
    setTimeout(() => setTaskNotice(""), 3000);
  };

  if (!activeDataset) return <div className="flex-1 flex items-center justify-center text-neutral-500 font-mono text-sm">Initializing Engine...</div>;

  let processedRows = activeDataset.rows?.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()))) || [];
  if (sortConfig.col) {
    processedRows.sort((a, b) => {
      const valA = a[sortConfig.col] ?? ""; const valB = b[sortConfig.col] ?? "";
      if (!isNaN(Number(valA)) && !isNaN(Number(valB))) return sortConfig.dir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      return sortConfig.dir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }

  const visibleRows = viewAll ? processedRows : processedRows.slice(0, 15);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-4 max-w-7xl mx-auto w-full text-neutral-100 select-text">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx,.xls,.json,.txt,.pdf" className="hidden" />

      {/* HEADER (Glassmorphism) */}
      <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold tracking-wide text-white flex items-center gap-2">
            <span className="p-1 rounded-md bg-white/[0.05] border border-white/[0.05] text-neutral-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
            </span>
            Data Sentinel Hub
          </h1>
          <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Pandas-powered data engineering & alignment.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-neutral-200 px-2.5 py-1 rounded-md text-[11px] font-mono transition active:scale-95">+ Add File</button>
          <button onClick={() => handleExportExcel()} className="flex items-center gap-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-neutral-200 px-2.5 py-1 rounded-md text-[11px] font-mono transition active:scale-95">◆ Export</button>
          <button onClick={onClose} className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 px-2.5 py-1 rounded-md text-[11px] font-mono transition active:scale-95">✕ Close</button>
        </div>
      </div>

      {taskNotice && <div className="bg-white/[0.05] border border-white/[0.05] text-neutral-200 px-3 py-1 rounded-md text-[11px] font-mono flex items-center justify-between flex-shrink-0">{taskNotice} <button onClick={() => setTaskNotice("")}>✕</button></div>}

      {/* KPI CARDS (Pure Glass) */}
      <div className="grid grid-cols-4 gap-2 flex-shrink-0">
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-md p-2"><span className="text-[9px] font-mono text-neutral-500 uppercase block">Records</span><span className="text-sm font-bold text-white">{activeDataset.totalRows}</span></div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-md p-2"><span className="text-[9px] font-mono text-neutral-500 uppercase block">Columns</span><span className="text-sm font-bold text-neutral-200">{activeDataset.totalCols}</span></div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-md p-2"><span className="text-[9px] font-mono text-neutral-500 uppercase block">Missing</span><span className={`text-sm font-bold ${activeDataset.nullCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{activeDataset.nullCount}</span></div>
        <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-md p-2"><span className="text-[9px] font-mono text-neutral-500 uppercase block">Footprint</span><span className="text-sm font-bold text-neutral-200">{activeDataset.fileSize}</span></div>
      </div>

      {/* TOOLBAR (Minimalist) */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/[0.05] p-1.5 rounded-lg flex items-center justify-between flex-wrap gap-1.5 font-mono text-[11px] flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => handleApiAction('detect-nulls')} className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition active:scale-95">🔍 Find Missing</button>
          <button onClick={() => { setShowFillPanel(!showFillPanel); setSelectedFillCols([]); }} className={`px-2.5 py-1 rounded border transition active:scale-95 ${showFillPanel ? 'bg-white/[0.1] border-white/20 text-white' : 'bg-white/[0.05] border-white/[0.05] text-neutral-300 hover:bg-white/[0.1]'}`}>🩹 Fill Missing</button>
          <button onClick={() => handleApiAction('delete-nulls')} className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition active:scale-95">✂️ Drop Missing</button>
          <button onClick={() => handleApiAction('deduplicate')} className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition active:scale-95">🧬 Remove Dupes</button>
          <button onClick={() => handleApiAction('auto-clean')} className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition active:scale-95 font-bold">✨ Auto-Format</button>
          <button onClick={() => setShowMathPanel(!showMathPanel)} className={`px-2.5 py-1 rounded border transition active:scale-95 ${showMathPanel ? 'bg-white/[0.1] border-white/20 text-white' : 'bg-white/[0.05] border-white/[0.05] text-neutral-300 hover:bg-white/[0.1]'}`}>📊 Statistics</button>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={handleSendContextToMika} className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] text-neutral-200 text-[11px] font-semibold transition active:scale-95 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            Send to NEPTUNE
          </button>

          <div className="relative">
            <button onClick={() => setShowSortMenu(!showSortMenu)} className="px-2.5 py-1 rounded bg-white/[0.05] border border-white/[0.05] text-neutral-300 hover:bg-white/[0.1] transition active:scale-95">🔃 Sort</button>
            {showSortMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/15 rounded-md shadow-xl z-50 p-1.5 text-[10px]">
                <select onChange={(e) => setSortConfig({ col: e.target.value, dir: sortConfig.dir })} value={sortConfig.col || ""} className="w-full bg-[#181a28] border border-white/10 rounded px-1.5 py-1 mb-1 outline-none text-[11px]">
                  <option value="">Select Column</option>
                  {activeDataset.columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <div className="flex gap-1">
                  <button onClick={() => { setSortConfig({ ...sortConfig, dir: 'asc' }); setShowSortMenu(false); }} className={`w-1/2 py-1 rounded text-[10px] ${sortConfig.dir === 'asc' ? 'bg-white/[0.1] text-white' : 'bg-white/[0.05] text-neutral-400'}`}>ASC</button>
                  <button onClick={() => { setSortConfig({ ...sortConfig, dir: 'desc' }); setShowSortMenu(false); }} className={`w-1/2 py-1 rounded text-[10px] ${sortConfig.dir === 'desc' ? 'bg-white/[0.1] text-white' : 'bg-white/[0.05] text-neutral-400'}`}>DESC</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setViewAll(!viewAll)} className={`px-2.5 py-1 rounded border transition active:scale-95 text-[11px] ${viewAll ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/[0.05] border-white/[0.05] text-neutral-300'}`}>👁️ {viewAll ? 'Sample' : 'View All'}</button>
        </div>
      </div>

      {showFillPanel && (
        <div className="bg-black/50 backdrop-blur-xl border border-white/[0.05] p-2.5 rounded-lg font-mono text-[11px] flex-shrink-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5 mb-2">
            <span className="text-neutral-200 font-bold text-xs">🩹 Fill Missing Values</span>
            <button onClick={() => setShowFillPanel(false)} className="text-neutral-500 hover:text-white">✕</button>
          </div>
          
          <div className="mb-2">
            <label className="block text-[9px] text-neutral-500 mb-1 uppercase tracking-wider">Step 1: Strategy</label>
            <div className="flex gap-1.5">
              {['mean', 'median', 'mode', 'zero'].map(s => (
                <button key={s} onClick={() => setFillStrategy(s)} className={`px-2.5 py-0.5 rounded-md capitalize transition active:scale-95 text-[10px] ${fillStrategy === s ? 'bg-white/[0.1] border border-white/20 text-white' : 'bg-white/[0.05] border border-white/[0.05] text-neutral-400 hover:bg-white/[0.1]'}`}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-neutral-500 mb-1 uppercase tracking-wider">Step 2: Select Columns ({selectedFillCols.length})</label>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-20 overflow-y-auto p-1 bg-black/30 rounded-md">
              {activeDataset.columns.map(col => (
                <button key={col.name} onClick={() => toggleFillCol(col.name)} className={`px-1.5 py-0.5 rounded-md text-left text-[10px] transition active:scale-95 truncate ${selectedFillCols.includes(col.name) ? 'bg-white/[0.1] text-white border border-white/20' : 'bg-white/[0.05] text-neutral-400 border border-white/[0.05] hover:bg-white/[0.1]'}`}>
                  {col.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button onClick={handleImputeMissing} disabled={selectedFillCols.length === 0} className="px-3 py-1 rounded-md bg-white/[0.1] hover:bg-white/[0.2] text-white text-[10px] font-semibold transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
              Execute
            </button>
          </div>
        </div>
      )}

      {showMathPanel && mathStats && (
        <div className="bg-black/50 backdrop-blur-xl border border-white/[0.05] p-2.5 rounded-lg font-mono text-[11px] flex-shrink-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-1.5 mb-2">
            <span className="text-neutral-200 font-bold text-xs">📊 Mathematical Aggregates</span>
            <select value={selectedMathCol} onChange={(e) => handleMathColChange(e.target.value)} className="bg-[#181a28] border border-white/10 text-white text-[10px] rounded px-1.5 py-0.5 outline-none">
              {activeDataset.columns.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
            </select>
          </div>
          {mathStats.is_numeric ? (
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 text-[10px]">
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Sum</span><span className="text-emerald-400 font-bold">{mathStats.sum}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Mean</span><span className="text-indigo-300 font-bold">{mathStats.mean}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Median</span><span className="text-cyan-300 font-bold">{mathStats.median}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Mode</span><span className="text-purple-300 font-bold">{mathStats.mode}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Min</span><span className="text-pink-300 font-bold">{mathStats.min}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Max</span><span className="text-rose-300 font-bold">{mathStats.max}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Range</span><span className="text-amber-300 font-bold">{mathStats.range}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Std Dev</span><span className="text-teal-300 font-bold">{mathStats.std_dev}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Variance</span><span className="text-lime-300 font-bold">{mathStats.variance}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Count</span><span className="text-white font-bold">{mathStats.count}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Missing</span><span className="text-rose-400 font-bold">{mathStats.missing}</span></div>
              <div className="bg-white/[0.02] p-1.5 rounded text-center"><span className="text-neutral-500 block uppercase text-[8px]">Unique</span><span className="text-white font-bold">{mathStats.unique}</span></div>
            </div>
          ) : (
            <div className="text-[11px] text-amber-300 py-1">⚠️ Categorical Column. <br/>Count: {mathStats.count}, Missing: {mathStats.missing}, Unique: {mathStats.unique}, Mode: {mathStats.mode}</div>
          )}
        </div>
      )}

      {/* TABLE (Glass Header, Dark Body) */}
      <div className="h-[400px] flex-shrink-0 bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-lg overflow-hidden shadow-xl">
        <div className="h-full overflow-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-[#0a0b0f]/90 backdrop-blur-xl z-10 border-b border-white/[0.05]">
              <tr className="text-neutral-400">
                {activeDataset.rows.length > 0 && Object.keys(activeDataset.rows[0]).map((col, idx) => (
                  <th key={idx} onClick={() => setSortConfig({ col, dir: sortConfig.col === col && sortConfig.dir === 'asc' ? 'desc' : 'asc' })} className="py-2 px-3 uppercase tracking-wider font-semibold text-neutral-300 text-[10px] cursor-pointer hover:text-white transition select-none">
                    {col} {sortConfig.col === col && (sortConfig.dir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-neutral-300">
              {visibleRows.length > 0 ? (
                visibleRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.03] transition-colors">
                    {Object.values(row).map((val, cIdx) => {
                      const isNull = val === null || String(val).trim() === "";
                      return <td key={cIdx} className={`py-1.5 px-3 whitespace-nowrap ${isNull ? 'text-rose-400 bg-rose-500/5 italic' : ''}`}>{isNull ? '(NaN)' : String(val)}</td>;
                    })}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={20} className="py-10 text-center text-neutral-500 italic text-sm">No matching records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="relative w-full flex-shrink-0">
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search table values..." className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.05] rounded-md pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 font-mono" />
        <svg className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
    </div>
  );
}