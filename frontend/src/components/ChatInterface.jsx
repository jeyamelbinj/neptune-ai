import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { playSound } from '../hooks/useAudioCue';
import neptuneLogo from '../assets/NEPTUNE-LOGO.png';

const TICK_COUNT = 8;
const sectionNames = ['Intro', 'Context', 'Code', 'Analysis', 'Insights', 'Summary', 'End'];
const TICK_HEIGHT = 2;
const TICK_GAP = 8;
const TRACK_HEIGHT = (TICK_COUNT * TICK_HEIGHT) + ((TICK_COUNT - 1) * TICK_GAP);

const CopyButton = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-neutral-400 hover:text-white transition-all duration-200 active:scale-95" title="Copy">
      {isCopied ? (
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
};

 const CodeBlock = ({ language, value }) => (
  <div className="relative group bg-black/40 backdrop-blur-xl border border-white/[0.08] rounded-xl my-3 overflow-hidden">
    <div className="absolute top-3 right-3 z-10"><CopyButton text={value} /></div>
    <SyntaxHighlighter 
      language={language || 'python'} 
      style={vscDarkPlus} 
      customStyle={{ 
        margin: 0, 
        padding: '20px', 
        background: 'transparent', 
        fontSize: '14px',
        border: 'none', // Removes SyntaxHighlighter's own border
        boxShadow: 'none' // Removes any weird shadows
      }} 
      codeTagProps={{ style: { fontFamily: 'ui-monospace, Consolas, monospace' } }}
    >
      {value}
    </SyntaxHighlighter>
  </div>
);

export default function ChatInterface({ messages = [], setMessages, initialPrompt, onPromptHandled, activeContext = null, onClearContext = null, onNewChat, sessionId }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [acceptedType, setAcceptedType] = useState("*");
  const [editingId, setEditingId] = useState(null);
  const [activeTick, setActiveTick] = useState(0); 

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollContentRef = useRef(null);
  const edgeProgressRef = useRef(null);
  const sectionLabelRef = useRef(null);
  const labelTimeoutRef = useRef(null);

  useEffect(() => {
    if (initialPrompt) {
      sendPromptToBackend(initialPrompt);
      if (onPromptHandled) onPromptHandled();
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (activeContext) sendPromptToBackend('', activeContext);
  }, [activeContext]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleScroll = () => {
    const content = scrollContentRef.current;
    if (!content) return;
    const scrollTop = content.scrollTop;
    const scrollHeight = content.scrollHeight - content.clientHeight;
    const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    if (edgeProgressRef.current) {
      edgeProgressRef.current.style.height = `${scrollPercent * 100}%`;
    }

    const activeIndex = Math.min(Math.floor(scrollPercent * TICK_COUNT), TICK_COUNT - 1);
    
    if (activeIndex !== activeTick) {
      setActiveTick(activeIndex); 
      if (sectionLabelRef.current) {
        sectionLabelRef.current.textContent = sectionNames[activeIndex] || '';
        const viewportCenter = window.innerHeight / 2;
        const trackStartY = viewportCenter - (TRACK_HEIGHT / 2);
        const targetY = trackStartY + (activeIndex * (TICK_HEIGHT + TICK_GAP));
        sectionLabelRef.current.style.top = `${targetY}px`;
        sectionLabelRef.current.style.opacity = '1';
        clearTimeout(labelTimeoutRef.current);
        labelTimeoutRef.current = setTimeout(() => {
          if (sectionLabelRef.current) sectionLabelRef.current.style.opacity = '0';
        }, 1500);
      }
    }
  };

  const handleTickClick = (index) => {
    const content = scrollContentRef.current;
    if (!content) return;
    const scrollTarget = (index / (TICK_COUNT - 1)) * (content.scrollHeight - content.clientHeight);
    content.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  };

  const sendPromptToBackend = async (promptText = '', contextOverride = null, historyOverride = null) => {
    const userPrompt = (promptText || input).trim();
    const contextToUse = attachedFile ? null : (contextOverride || activeContext);
    if (!userPrompt && !attachedFile && !contextToUse) return;

    let formattedContextStr = '';
    if (contextToUse) formattedContextStr = typeof contextToUse === 'object' ? JSON.stringify(contextToUse, null, 2) : String(contextToUse);

    let finalMessage = userPrompt;
    if (attachedFile) {
      if (attachedFile.uploading) { alert("Please wait for the file to finish uploading."); return; }
      if (attachedFile.content) {
        finalMessage = `The user attached a file named "${attachedFile.name}". Here is its extracted content:\n\n${attachedFile.content}\n\nUser Query: ${userPrompt || "Please analyze this file."}`;
      } else {
        finalMessage = `The user attached a binary file named "${attachedFile.name}". I cannot read its contents directly. User Query: ${userPrompt || "Please acknowledge this file."}`;
      }
    } else if (formattedContextStr) {
      finalMessage = userPrompt ? `[ATTACHED CONTEXT]:\n${formattedContextStr}\n\n[USER QUERY]:\n${userPrompt}` : `[CONTEXT ANALYSIS REQUEST]:\n${formattedContextStr}`;
    }

    const currentFile = attachedFile;
    const displayMsg = userPrompt || (formattedContextStr ? `◆ Transferred Context to NEPTUNE` : (currentFile ? `Uploaded: ${currentFile.name}` : 'File uploaded.'));
    const userMsg = { id: Date.now(), sender: 'user', content: displayMsg };
    
    let currentMessages;
    if (historyOverride !== null) currentMessages = [...historyOverride, userMsg];
    else if (editingId) {
      const editIndex = messages.findIndex(m => m.id === editingId);
      currentMessages = [...messages.slice(0, editIndex), userMsg];
      setEditingId(null);
    } else currentMessages = [...messages, userMsg];

    setMessages(currentMessages);
    setInput('');
    setAttachedFile(null);
    setLoading(true);
    playSound('send');

    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => { if (abortControllerRef.current) abortControllerRef.current.abort(); }, 120000);

    try {
      const response = await fetch('https://neptune-ai-ye1z.onrender.com/api/chat/', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          file_name: currentFile ? currentFile.name : null,
          context: formattedContextStr || null,
          temperature: parseFloat(localStorage.getItem('neptune_temp') || 0.5),
          max_tokens: parseInt(localStorage.getItem('neptune_max_tokens') || 1024),
          session_id: sessionId
        }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      
      if (response.status === 429) {
        setMessages([...currentMessages, { id: Date.now() + 1, sender: 'neptune', content: '⏳ **Rate Limit Reached.** Groq limits 6,000 tokens per minute. Please wait 30 seconds and try again.' }]);
      } else if (response.ok && data.reply) {
        playSound('receive');
        setMessages([...currentMessages, { id: Date.now() + 1, sender: 'neptune', content: data.reply, agent_used: data.routed_agent }]);
      } else {
        const errorDetail = data.detail || "Unknown backend error";
        setMessages([...currentMessages, { id: Date.now() + 1, sender: 'neptune', content: `⚠️ **System Error:** ${errorDetail}` }]);
      }
    } catch (err) {
      if (err.name === 'AbortError') setMessages([...currentMessages, { id: Date.now() + 1, sender: 'neptune', content: '⏹️ Request timed out or was stopped.' }]);
      else setMessages([...currentMessages, { id: Date.now() + 1, sender: 'neptune', content: `⚠️ **Network Error:** ${err.message}` }]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  const handleEditMessage = (msg) => { setInput(msg.content); setEditingId(msg.id); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const handleRegenerate = (neptuneMsgId) => {
    const neptuneIndex = messages.findIndex(m => m.id === neptuneMsgId);
    if (neptuneIndex === -1) return;
    let userMsgIndex = -1;
    for (let i = neptuneIndex - 1; i >= 0; i--) { if (messages[i].sender === 'user') { userMsgIndex = i; break; } }
    if (userMsgIndex !== -1) sendPromptToBackend(messages[userMsgIndex].content, null, messages.slice(0, userMsgIndex));
  };

  const scrollToBottom = () => { 
    if (localStorage.getItem('auto_scroll') !== 'false') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }
  };
  useEffect(scrollToBottom, [messages, attachedFile]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachContainerRef.current && !attachContainerRef.current.contains(event.target)) setShowAttachMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = async (e) => { 
    const file = e.target.files[0]; 
    if (!file) return;
    setAttachedFile({ name: file.name, content: null, uploading: true });
    setShowAttachMenu(false); 
    e.target.value = ''; 

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`https://neptune-ai-ye1z.onrender.com/api/chat/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setAttachedFile({ name: data.filename, content: data.content, uploading: false, isBinary: data.is_binary });
    } catch (err) {
      setAttachedFile(null);
      alert("Failed to upload file.");
    }
  };

  const triggerFileSelect = (acceptFilter) => { setAcceptedType(acceptFilter); setShowAttachMenu(false); if (fileInputRef.current) { fileInputRef.current.accept = acceptFilter; fileInputRef.current.click(); } };
  
  const handleKeyDown = (e) => {
    const enterToSend = localStorage.getItem('enter_to_send') !== 'false';
    if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPromptToBackend(input);
    }
  };

  const isCentered = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent select-text">
      <style>{`
        @keyframes fadeInUp { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
        
        :root { --travel-duration: 6s; }
        .input-wrapper {
          position: relative; width: 100%; max-width: 700px; min-height: 60px; z-index: 1;
          border-radius: 30px; filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
        }
        .input-border-glow {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 30px;
          overflow: hidden; z-index: 0; border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .input-border-glow::before {
          content: ''; position: absolute; top: 50%; left: 50%; width: 300%; height: 300%;
          background: conic-gradient(from 0deg, transparent 0%, transparent 70%, rgba(255, 255, 255, 0.1) 80%, rgba(255, 255, 255, 0.5) 90%, rgba(255, 255, 255, 1) 95%, rgba(255, 255, 255, 0.5) 98%, rgba(255, 255, 255, 0.1) 99%, transparent 100%);
          transform: translate(-50%, -50%); animation: rotateBorder var(--travel-duration) linear infinite;
        }
        .input-border-mask {
          position: absolute; top: 1px; left: 1px; right: 1px; bottom: 1px;
          background: #050505; border-radius: 29px; z-index: 1;
        }
        .input-container {
          position: relative; width: 100%; height: 100%; min-height: 58px;
          background: rgba(13, 14, 20, 0.9); border-radius: 29px; display: flex; align-items: center;
          padding: 0 1.5rem; z-index: 2; backdrop-filter: blur(20px); box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
          transition: background 0.3s;
        }
        .input-container:focus-within { background: rgba(20, 20, 25, 0.95); }
        .plus-icon {
          color: #888888; font-size: 1.5rem; margin-right: 1rem; cursor: pointer;
          transition: color 0.3s; font-weight: 300; background: none; border: none; padding: 0; outline: none; line-height: 1;
        }
        .plus-icon:hover { color: #ffffff; }
        .chat-text-area {
          flex: 1; background: transparent; border: none; outline: none; color: #ffffff;
          font-size: 1.05rem; font-family: inherit; resize: none; max-height: 120px; line-height: 1.5; padding-top: 20px; padding-bottom: 20px;
        }
        .chat-text-area::placeholder { color: #888888; }
        @keyframes rotateBorder { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }

        /* Custom Tick Scrollbar Styles */
        .custom-scroll-content {
          scrollbar-width: none; -ms-overflow-style: none;
        }
        .custom-scroll-content::-webkit-scrollbar { display: none; }
        .tick-track {
          position: fixed; right: 20px; top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 8px; z-index: 100;
        }
        .tick {
          width: 20px; height: 2px; background: #333; border-radius: 1px;
          transition: all 0.3s ease; cursor: pointer;
        }
        .tick:hover { background: #666; }
        .tick.active {
          background: #ffffff; width: 28px; box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        }
        .edge-line-container {
          position: fixed; right: 0; top: 0; width: 2px; height: 100vh; background: #111; z-index: 99;
        }
        .edge-line-progress {
          width: 100%; background: #444; transition: height 0.1s ease-out;
        }
        .section-label {
          position: fixed; right: 55px; font-size: 9px; letter-spacing: 2px; color: #888;
          text-transform: uppercase; opacity: 0; transition: opacity 0.3s ease;
          pointer-events: none; z-index: 100; transform: translateY(-50%);
        }

        /* Add these inside your existing <style> tag */

        @keyframes logoGlowPulse {
        0%, 100% { 
        filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3)) drop-shadow(0 0 30px rgba(192, 192, 192, 0.2)); 
        transform: scale(1); 
        }
        50% { 
        filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 50px rgba(100, 200, 255, 0.4)); 
        transform: scale(1.05); 
        }
        }
        .animate-logo-glow {
        animation: logoGlowPulse 3s ease-in-out infinite;
        }

        @keyframes textShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
        }
        .shimmer-text {
        background: linear-gradient(90deg, #8b8b8b 0%, #ffffff 50%, #8b8b8b 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
         animation: textShimmer 4s linear infinite;
        }
      `}</style>

      {/* Custom Scrollbar Elements */}
      <div className="edge-line-container">
        <div className="edge-line-progress" ref={edgeProgressRef} style={{ height: '0%' }}></div>
      </div>
      <div className="tick-track hidden md:flex">
        {Array.from({ length: TICK_COUNT }).map((_, i) => (
          <div key={i} className={`tick ${activeTick === i ? 'active' : ''}`} onClick={() => handleTickClick(i)}></div>
        ))}
      </div>
      <div className="section-label hidden md:block" ref={sectionLabelRef}>Intro</div>
        
      <div className={`flex-1 flex flex-col h-full overflow-hidden ${isCentered ? 'justify-center' : 'justify-end'}`}>
        
  {isCentered ? (
  <div className="flex flex-row items-center justify-center gap-5 px-4 pb-10">
    {/* Logo with breathing glow animation */}
    <img 
      src={neptuneLogo} 
      alt="NEPTUNE Logo" 
      className="w-16 h-16 object-contain animate-fadeInUp flex-shrink-0 animate-logo-glow" 
    />
    {/* Changed tracking-[0.15em] to tracking-normal to remove messy letter spacing */}
    <h2 className="text-xl font-light tracking-normal animate-fadeInUp whitespace-nowrap shimmer-text">
      NEPTUNE Is Awake. What's Next?
    </h2>
  </div>
) : (
          <div className="custom-scroll-content flex-1 overflow-y-auto py-6 relative z-10 w-full max-w-3xl mx-auto flex flex-col px-6" ref={scrollContentRef} onScroll={handleScroll}>
            {messages.map((msg, index) => (
              <div key={index} className={`w-full mb-8 flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                
                {msg.sender === 'neptune' && (
                  <div className="group flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider justify-start text-white">
                    <img src={neptuneLogo} alt="NEPTUNE Logo" className="w-8 h-8 object-contain" style={{ filter: 'invert(1) brightness(1.5)' }} />
                    <span className="text-sm">NEPTUNE</span>
                  </div>
                )}

                {msg.sender === 'user' ? (
                  <div className="max-w-[85%] flex flex-col items-end">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-3xl px-5 py-3 text-base leading-relaxed shadow-sm text-right">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <button onClick={() => handleEditMessage(msg)} className="mt-1.5 p-1.5 bg-transparent hover:bg-white/10 rounded-md text-neutral-500 hover:text-white transition-all duration-200 active:scale-90" title="Edit Message">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                  </div>
                ) : (
                    <div className="w-full max-w-[95%] text-white text-base leading-relaxed font-sans text-left">
                    <div className="prose prose-invert prose-base max-w-none prose-headings:text-white prose-headings:font-bold prose-headings:drop-shadow-none prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-base prose-p:text-neutral-200 prose-strong:text-white prose-code:text-indigo-300 prose-code:bg-black/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-transparent prose-pre:border-none prose-pre:p-0 prose-ul:text-neutral-200 prose-ol:text-neutral-200 prose-table:text-neutral-200 prose-th:text-white prose-td:text-neutral-300 prose-a:text-cyan-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code({ inline, className, children, ...props }) { const match = /language-(\w+)/.exec(className || ''); const value = String(children).replace(/\n$/, ''); return !inline && match ? <CodeBlock language={match[1]} value={value} /> : <code className={className} {...props}>{children}</code>; } }}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-3 flex justify-start items-center gap-2">
                      <CopyButton text={msg.content} />
                      {index === messages.length - 1 && !loading && (
                        <button onClick={() => handleRegenerate(msg.id)} className="p-1.5 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 rounded-md text-neutral-400 hover:text-cyan-300 transition-all duration-200 active:scale-90" title="Regenerate Response">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-base text-white font-mono px-4 mb-4">
                <img src={neptuneLogo} alt="NEPTUNE Logo" className="w-6 h-6 object-contain animate-pulse" style={{ filter: 'invert(1) brightness(1.5)' }} />
                <span>NEPTUNE</span>
                <span className="flex gap-1 ml-1">
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                  <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.15s]"></span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {attachedFile && (
          <div className="w-full max-w-3xl mx-auto px-6 mb-2 relative z-20 flex items-center">
            <div className="bg-white/[0.06] border border-white/10 backdrop-blur-xl px-4 py-2 rounded-xl flex items-center justify-between text-sm text-neutral-200 font-mono w-full">
              <span className="truncate">
                {attachedFile.uploading ? `⏳ Uploading: ${attachedFile.name}...` : `📎 Attached: ${attachedFile.name} ${attachedFile.isBinary ? '(Binary)' : '(Text Extracted)'}`}
              </span>
              <button onClick={() => setAttachedFile(null)} className="text-neutral-400 hover:text-white ml-3 px-1.5 py-0.5 rounded-md hover:bg-white/10 transition active:scale-95">✕</button>
            </div>
          </div>
        )}

        {/* PREMIUM TRAVELING LIGHT INPUT BOX */}
        <div className="pb-6 pt-2 relative z-20 w-full flex justify-center">
          <form onSubmit={(e) => { e.preventDefault(); sendPromptToBackend(input); }} className="w-full max-w-3xl px-6">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={acceptedType} />
            
            <div className="input-wrapper">
              <div className="input-border-glow"></div>
              <div className="input-border-mask"></div>
              
              <div className="input-container">
                <div ref={attachContainerRef} className="relative h-full flex items-center">
                  <button type="button" onClick={() => setShowAttachMenu(prev => !prev)} className="plus-icon" title="Attach File">+</button>
                  
                    {showAttachMenu && (
                    <div className="absolute bottom-14 left-0 bg-[#050505]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-2 shadow-2xl w-72 z-50 space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest px-3 py-1 block">Upload Attachment</span>
                      
                      <button type="button" onClick={() => triggerFileSelect('.pdf,.docx')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.05] transition text-left group">
                        <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-neutral-300 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div><span className="font-medium block text-white text-sm">Documents</span><span className="text-[10px] text-neutral-500 font-mono">.pdf, .docx</span></div>
                      </button>

                      <button type="button" onClick={() => triggerFileSelect('.csv,.txt,.json,.xlsx,.xls')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.05] transition text-left group">
                        <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-neutral-300 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        </div>
                        <div><span className="font-medium block text-white text-sm">Datasets</span><span className="text-[10px] text-neutral-500 font-mono">.csv, .txt, .json, .xlsx</span></div>
                      </button>

                      <button type="button" onClick={() => triggerFileSelect('.py,.sql,.ipynb,.js,.jsx,.ts,.html,.css,.cpp,.java')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.05] transition text-left group">
                        <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-neutral-300 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </div>
                        <div><span className="font-medium block text-white text-sm">Code & Scripts</span><span className="text-[10px] text-neutral-500 font-mono">.py, .sql, .js, etc.</span></div>
                      </button>

                      <button type="button" onClick={() => triggerFileSelect('.csv,.tsv,.xlsx,.xls,.xml')} className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.05] transition text-left group">
                        <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-neutral-300 group-hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18" /></svg>
                        </div>
                        <div><span className="font-medium block text-white text-sm">Tables</span><span className="text-[10px] text-neutral-500 font-mono">.csv, .tsv, .xml</span></div>
                      </button>
                    </div>
                  )}
                </div>

                <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message..." rows={1} className="chat-text-area" />

                <div className="flex items-center ml-4">
                  {loading ? (
                    <button type="button" onClick={handleStopGeneration} className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer flex-shrink-0" title="Stop Generation">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z" /></svg>
                    </button>
                  ) : input.trim() || editingId ? (
                    <button type="submit" className="w-10 h-10 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md cursor-pointer flex-shrink-0" title={editingId ? "Update Message" : "Send Message"}>
                      <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}