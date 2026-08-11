import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import ChatInterface from './components/ChatInterface';
import SystemSettings from './components/SystemSettings';
import DataSentinelHub from './components/DataSentinelHub';
import DashboardAnalytics from './components/DashboardAnalytics';
import { playSound } from './hooks/useAudioCue';
import neptuneLogo from './assets/NEPTUNE-LOGO.png';

const SciFiBackground = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x171717);
    scene.fog = new THREE.Fog(0x171717, 12, 26);
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9.5);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1); keyLight.position.set(4, 6, 8); scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5); rimLight.position.set(-6, 4, -6); scene.add(rimLight);
    const faceGlow = new THREE.PointLight(0xff4433, 0.5, 7); faceGlow.position.set(0, 0, 2.6); scene.add(faceGlow);
    const blackGloss = new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.25, envMapIntensity: 0.7 });
    const blackMatte = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.6, metalness: 0.4, envMapIntensity: 0.4 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.42, metalness: 0.5, envMapIntensity: 0.5 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe0403a, emissive: 0xb3271f, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.1 });
    const robot = new THREE.Group(); scene.add(robot);
    const head = new THREE.Mesh(new RoundedBoxGeometry(3.4, 2.5, 1.3, 6, 0.55), blackGloss); robot.add(head);
    const facePlate = new THREE.Mesh(new RoundedBoxGeometry(2.95, 2.05, 0.35, 6, 0.45), blackMatte); facePlate.position.z = 0.62; robot.add(facePlate);
    const eyeGeo = new THREE.SphereGeometry(0.34, 32, 32);
    const eyeL = new THREE.Mesh(eyeGeo, redMat); eyeL.position.set(-0.72, 0.32, 0.78); eyeL.scale.set(1, 1, 0.45);
    const eyeR = new THREE.Mesh(eyeGeo, redMat); eyeR.position.set(0.72, 0.32, 0.78); eyeR.scale.set(1, 1, 0.45);
    robot.add(eyeL, eyeR);
    const mouthShape = new THREE.Shape();
    mouthShape.absarc(0, 0, 0.55, Math.PI, 0, true); mouthShape.absarc(0, -0.48, 0.73, 0.718, 2.424, false);
    const mouthGeo = new THREE.ExtrudeGeometry(mouthShape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 48 });
    const mouth = new THREE.Mesh(mouthGeo, redMat); mouth.position.set(0, -0.62, 0.72); robot.add(mouth);
    const antenna = new THREE.Group(); antenna.position.y = 1.25;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.0, 12), blackGloss); rod.position.y = 0.5;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), blackGloss); ball.position.y = 1.05;
    antenna.add(rod, ball); robot.add(antenna);
    const earGeo = new THREE.BoxGeometry(0.35, 0.6, 0.5);
    const earL = new THREE.Mesh(earGeo, blackGloss); earL.position.x = -1.8;
    const earR = new THREE.Mesh(earGeo, blackGloss); earR.position.x =  1.8;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 0.9), blackGloss); neck.position.y = -1.5;
    robot.add(earL, earR, neck);
    const ringPivot = new THREE.Group();
    const gyroRing = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.17, 32, 140), blackGloss); gyroRing.rotation.y = 0.8;
    ringPivot.add(gyroRing); ringPivot.rotation.z = 0.28; scene.add(ringPivot);
    const bgRings = [];
    [4.6, 6.4, 8.2].forEach((radius, idx) => {
      const holder = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.32, 32, 180), ringMat);
      ring.position.z = -2.2 - idx * 0.5; ring.rotation.x = 0.10; ring.rotation.y = 0.06;
      holder.add(ring); scene.add(holder);
      bgRings.push({ ring, speed: 0.005 + idx * 0.002, dir: idx % 2 === 0 ? 1 : -1 });
    });
    const mouse = new THREE.Vector2(0, 0); let startle = 0;
    const onPointerMove = (e) => { mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = (e.clientY / window.innerHeight) * 2 - 1; };
    const onPointerDown = () => { startle = 1; playSound('tap'); };
    window.addEventListener('pointermove', onPointerMove); window.addEventListener('pointerdown', onPointerDown);
    const startupTimeout = setTimeout(() => playSound('startup'), 500);
    let nextBlink = 1.6; let blinkT = -1; const clock = new THREE.Clock(); let reqId;
    function tick() {
      const dt = Math.min(clock.getDelta(), 0.05); const t = clock.elapsedTime;
      robot.position.y = Math.sin(t * 1.3) * 0.09; robot.rotation.z = Math.sin(t * 0.6) * 0.02;
      robot.rotation.y += ((mouse.x * 0.28) - robot.rotation.y) * 0.06; robot.rotation.x += ((-mouse.y * 0.18) - robot.rotation.x) * 0.06;
      eyeL.position.x = -0.72 + mouse.x * 0.07; eyeR.position.x =  0.72 + mouse.x * 0.07; eyeL.position.y = eyeR.position.y = 0.32 - mouse.y * 0.05;
      if (blinkT < 0 && t > nextBlink) blinkT = 0;
      if (blinkT >= 0) { blinkT += dt; const p = blinkT / 0.22; if (p >= 1) { blinkT = -1; nextBlink = t + 1.8 + Math.random() * 3; } const k = 1 - Math.sin(Math.min(p, 1) * Math.PI) * 0.92; eyeL.scale.y = eyeR.scale.y = k; } else { eyeL.scale.y = eyeR.scale.y = 1; }
      antenna.rotation.z = Math.sin(t * 2.2) * 0.06 + mouse.x * 0.05; antenna.rotation.x = Math.cos(t * 1.7) * 0.05;
      startle *= Math.exp(-dt * 2.5); robot.scale.setScalar(1 + startle * 0.07);
      redMat.emissiveIntensity = 0.55 + startle * 0.9 + Math.sin(t * 2.0) * 0.08; faceGlow.intensity = 0.5 + startle * 1.6;
      ringPivot.rotation.y += dt * 0.02; ringPivot.rotation.x += dt * 0.01; bgRings.forEach((o) => { o.ring.rotation.z = t * o.speed * o.dir; });
      camera.position.x += (mouse.x * 0.6 - camera.position.x) * 0.03; camera.position.y += (-mouse.y * 0.4 - camera.position.y) * 0.03; camera.lookAt(0, 0, 0);
      renderer.render(scene, camera); reqId = requestAnimationFrame(tick);
    }
    tick();
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(reqId); clearTimeout(startupTimeout); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener('resize', onResize); mount.removeChild(renderer.domElement); renderer.dispose(); };
  }, []);
  return (<><div ref={mountRef} className="absolute inset-0 z-0" style={{ cursor: 'pointer' }}></div><div className="fixed inset-0 z-1 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,.5) 100%)' }}></div></>);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [activeContext, setActiveContext] = useState(null);
  
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('neptune_chats');
    if (saved) { const parsed = JSON.parse(saved); return parsed.length > 0 ? parsed : [{ id: Date.now(), title: 'New Chat', messages: [], sessionId: `session-${Date.now()}` }]; }
    return [{ id: Date.now(), title: 'New Chat', messages: [], sessionId: `session-${Date.now()}` }];
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    const saved = localStorage.getItem('neptune_chats');
    if (saved) { const parsed = JSON.parse(saved); return parsed.length > 0 ? parsed[0].id : Date.now(); }
    return Date.now();
  });

  useEffect(() => { localStorage.setItem('neptune_chats', JSON.stringify(chats)); }, [chats]);
  const activeChat = chats.find(c => c.id === activeChatId);

  const handleNewChat = () => {
    const newChatId = Date.now(); const newSessionId = `session-${newChatId}`;
    const newChat = { id: newChatId, title: 'New Chat', messages: [], sessionId: newSessionId };
    setChats(prev => [newChat, ...prev]); setActiveChatId(newChat.id); setActiveTab('chat'); setInitialPrompt(""); setActiveContext(null);
  };
  const handleDeleteChat = (id, e) => {
    e.stopPropagation(); const updatedChats = chats.filter(c => c.id !== id); setChats(updatedChats);
    if (activeChatId === id && updatedChats.length > 0) { setActiveChatId(updatedChats[0].id); } else if (updatedChats.length === 0) { handleNewChat(); }
  };
  const handleUpdateMessages = (newMessages) => {
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) { const userMsg = newMessages.find(m => m.sender === 'user'); return { ...c, messages: newMessages, title: c.title === 'New Chat' && userMsg ? userMsg.content.substring(0, 30) + '...' : c.title }; }
      return c;
    }));
  };
  const handleSendToChat = (promptText) => { setInitialPrompt(promptText); setActiveTab('chat'); };
  const handleSendContextToNeptune = (contextData) => { setActiveContext(contextData); setActiveTab('chat'); };

  const OrbitalTag = ({ onClick, title }) => (
    <button onClick={onClick} className="flex items-center gap-3 px-5 py-2.5 bg-black/60 backdrop-blur-md border border-rose-500/30 rounded-full text-left transition-all duration-300 hover:bg-rose-900/20 hover:border-rose-400 hover:scale-105 group shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_20px_rgba(255,0,0,0.2)] pointer-events-auto">
      <span className="w-2 h-2 rounded-full bg-rose-500 group-hover:animate-pulse"></span>
      <span className="text-[11px] font-mono font-semibold text-neutral-100 uppercase tracking-widest whitespace-nowrap">{title}</span>
    </button>
  );

  return (
    <div className="h-screen w-screen bg-[#171717] text-neutral-100 flex overflow-hidden font-sans select-none relative">
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        @keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbit-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .orbit-wheel { animation: orbit-spin 120s linear infinite; }
        .orbit-tag-wrapper { animation: orbit-counter 120s linear infinite; }
      `}</style>

      <SciFiBackground />

      <aside className={`fixed h-full z-50 w-64 transform transition-transform duration-300 ease-in-out bg-[#050505]/80 backdrop-blur-xl border-r border-white/[0.05] flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between pt-4 pb-3 px-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <img src={neptuneLogo} alt="NEPTUNE Logo" className="w-7 h-7 object-contain" style={{ filter: 'invert(1) brightness(1.5)' }} />
            <span className="text-sm font-semibold tracking-wide text-neutral-200">NEPTUNE</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-neutral-500 hover:text-white transition-all rounded-md hover:bg-white/5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>
        <div className="p-3">
          <button onClick={handleNewChat} className="w-full flex items-center justify-center space-x-2 text-neutral-300 hover:text-white border border-white/10 hover:border-rose-500/30 bg-white/[0.02] py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 group">
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
            <span>New Chat</span>
          </button>
        </div>
        <nav className="px-3 space-y-1">
          <button onClick={() => { setActiveTab('home'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${activeTab === 'home' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            <svg className="w-4 h-4 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Core Reactor</span>
          </button>
          <button onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${activeTab === 'chat' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            <svg className="w-4 h-4 flex-shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span>Agent Swarm Chat</span>
          </button>
          <button onClick={() => { setActiveTab('data'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${activeTab === 'data' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            <svg className="w-4 h-4 flex-shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            <span>Data Sentinel Hub</span>
          </button>
          <button onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${activeTab === 'dashboard' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            <svg className="w-4 h-4 flex-shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>Dashboard Analytics</span>
          </button>
          <button onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 group ${activeTab === 'settings' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02] hover:text-neutral-200'}`}>
            <svg className="w-4 h-4 flex-shrink-0 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>System Settings</span>
          </button>
        </nav>
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
          <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest px-2 mb-1 block">Recent Chats</span>
          {chats.map((chat) => (
            <div key={chat.id} onClick={() => { setActiveTab('chat'); setActiveChatId(chat.id); setIsSidebarOpen(false); }} className={`group flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs cursor-pointer ${activeChatId === chat.id && activeTab === 'chat' ? 'bg-white/[0.05] text-white' : 'text-neutral-400 hover:bg-white/[0.02]'}`}>
              <span className="truncate flex-1">{chat.title}</span>
              <button onClick={(e) => handleDeleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 rounded">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center space-x-2.5 border-t border-white/[0.05] px-4 py-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500/20 to-black border border-white/10 flex items-center justify-center text-neutral-200 flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-neutral-200 tracking-wide">CREATOR</span>
            <span className="text-[9px] text-neutral-500 font-mono uppercase">JEYA MELBIN J</span>
          </div>
        </div>
      </aside>

      {activeTab === 'home' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="relative w-[700px] h-[700px] orbit-wheel">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 orbit-tag-wrapper">
              <OrbitalTag onClick={() => { handleNewChat(); setActiveTab('chat'); setIsSidebarOpen(false); }} title="CHAT" />
            </div>
            <div className="absolute top-[20%] right-0 translate-x-1/2 -translate-y-1/2 orbit-tag-wrapper">
              <OrbitalTag onClick={() => { setActiveTab('data'); setIsSidebarOpen(false); }} title="DATA SENTINEL HUB" />
            </div>
            <div className="absolute bottom-[20%] right-0 translate-x-1/2 translate-y-1/2 orbit-tag-wrapper">
              <OrbitalTag onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} title="DASHBOARD ANALYTICS" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 orbit-tag-wrapper">
              <OrbitalTag onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} title="SYSTEM SETTINGS" />
            </div>
            <div className="absolute bottom-[20%] left-0 -translate-x-1/2 translate-y-1/2 orbit-tag-wrapper">
              <OrbitalTag onClick={() => setIsSidebarOpen(true)} title="SIDE BAR" />
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN GLASSMORPHISM CONTENT AREA */}
      {activeTab !== 'home' && (
        <main className="absolute inset-0 z-10 flex flex-col bg-[#050505]/70 backdrop-blur-xl">
          {/* Universal Top Bar */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-white/[0.05] bg-[#050505]/50 backdrop-blur-md flex-shrink-0 z-20">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('home')} className="p-2 text-neutral-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-xs font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" /></svg>
                NEPTUNE
              </button>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-300 hover:bg-white/5 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {activeTab === 'chat' && 'Agent Swarm Chat'}
              {activeTab === 'data' && 'Data Sentinel Hub'}
              {activeTab === 'dashboard' && 'Dashboard Analytics'}
              {activeTab === 'settings' && 'System Settings'}
            </span>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' && (
              <ChatInterface 
                key={activeChatId}
                messages={activeChat.messages}
                setMessages={handleUpdateMessages}
                initialPrompt={initialPrompt} 
                onPromptHandled={() => setInitialPrompt("")} 
                activeContext={activeContext}
                onClearContext={() => setActiveContext(null)}
                onNewChat={handleNewChat}
                sessionId={activeChat.sessionId}
              />
            )}
            {activeTab === 'dashboard' && <DashboardAnalytics setActiveTab={setActiveTab} />}
            {activeTab === 'data' && <DataSentinelHub onClose={() => setActiveTab('home')} onSendToChat={handleSendToChat} onSendContext={handleSendContextToNeptune} />}
            {activeTab === 'settings' && <SystemSettings setActiveTab={setActiveTab} />}
          </div>
        </main>
      )}
          {/* FULL SCREEN GLASSMORPHISM CONTENT AREA */}
      {activeTab !== 'home' && (
        <main className="absolute inset-0 z-10 flex flex-col bg-[#050505]/70 backdrop-blur-xl">
          {/* Universal Top Bar */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-white/[0.05] bg-[#050505]/50 backdrop-blur-md flex-shrink-0 z-20">
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('home')} className="p-2 text-neutral-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-xs font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7" /></svg>
                NEPTUNE
              </button>
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-300 hover:bg-white/5 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {activeTab === 'chat' && 'Agent Swarm Chat'}
              {activeTab === 'data' && 'Data Sentinel Hub'}
              {activeTab === 'dashboard' && 'Dashboard Analytics'}
              {activeTab === 'settings' && 'System Settings'}
            </span>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' && (
              <ChatInterface 
                key={activeChatId}
                messages={activeChat.messages}
                setMessages={handleUpdateMessages}
                initialPrompt={initialPrompt} 
                onPromptHandled={() => setInitialPrompt("")} 
                activeContext={activeContext}
                onClearContext={() => setActiveContext(null)}
                onNewChat={handleNewChat}
                sessionId={activeChat.sessionId}
              />
            )}
            {activeTab === 'dashboard' && <DashboardAnalytics setActiveTab={setActiveTab} />}
            {activeTab === 'data' && <DataSentinelHub onClose={() => setActiveTab('home')} onSendToChat={handleSendToChat} onSendContext={handleSendContextToNeptune} />}
            {activeTab === 'settings' && <SystemSettings setActiveTab={setActiveTab} />}
          </div>
        </main>
      )}
    </div>
  );
}