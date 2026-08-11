import React, { useState } from 'react';

export default function DataWorkspace({ onSendContext }) {
  const [schema, setSchema] = useState('');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!schema.trim() || !question.trim() || loading) return;

    setLoading(true);
    setAnalysis('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/data/analyze-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_description: schema, question: question })
      });
      const data = await response.json();
      if (response.ok) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis('Error generating analysis.');
      }
    } catch (err) {
      setAnalysis('Network error: Unable to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendContextClick = () => {
    const contextPayload = {
      source: "DataWorkspace",
      schema: schema.trim() || "No schema provided",
      question: question.trim() || "No question provided",
      analysis_output: analysis.trim() || "No analysis output yet"
    };

    if (onSendContext) {
      onSendContext(contextPayload);
    } else {
      console.error("onSendContext prop was not passed to DataWorkspace!");
    }
  };

  return (
    <div className="flex-1 p-6 bg-slate-950 text-slate-100 overflow-y-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 max-w-4xl">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-500 bg-clip-text text-transparent">
            Data Sentinel Workspace
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Paste database schemas or table definitions to generate optimized SQL queries.
          </p>
        </div>

        {/* Purple "Send Context to NEPTUNE" Button */}
        <button
          type="button"
          onClick={handleSendContextClick}
          className="flex items-center space-x-2 px-4 py-2 bg-[#33185a] hover:bg-[#431e78] border border-purple-500/40 rounded-xl text-purple-200 font-mono text-xs cursor-pointer shadow-lg transition-all active:scale-95 shrink-0"
        >
          <svg className="w-4 h-4 text-purple-300 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Send Context to NEPTUNE</span>
        </button>
      </div>

      <form onSubmit={handleAnalyze} className="space-y-4 max-w-4xl">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Database Schema / Context
          </label>
          <textarea
            rows="4"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="e.g. movies(id, title, year, duration, rating); ratings(movie_id, avg_rating);"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-600 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1 font-semibold">
            Analytical Question / Task
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Find the top 5 movies with highest rating."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500 text-slate-100 placeholder-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:opacity-90 px-6 py-2.5 rounded-xl font-medium text-sm transition disabled:opacity-50 shadow-lg cursor-pointer"
        >
          {loading ? 'Analyzing Schema & Generating SQL...' : 'Generate SQL & Insights'}
        </button>
      </form>

      {analysis && (
        <div className="mt-8 max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              Data Sentinel Output
            </h3>
            <button
              type="button"
              onClick={handleSendContextClick}
              className="text-xs text-purple-300 hover:text-purple-100 font-mono transition flex items-center space-x-1 cursor-pointer"
            >
              <span>Push Output to NEPTUNE ➔</span>
            </button>
          </div>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-mono bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}