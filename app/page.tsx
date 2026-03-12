'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity, Settings, FolderOpen, Save, RefreshCw,
    Bot, Server, CornerDownLeft, Send, LogOut,
    FileText, Folder, Plus, Trash2, Cpu, CheckCircle2, MessageSquare, PlusCircle, XCircle,
    Terminal, Filter, Download, Pause, Play, BarChart, FolderPlus, FilePlus, Copy, Edit2
} from 'lucide-react';

type FsItem = { name: string; type: 'file' | 'directory'; path: string };
type Config = any;

export default function Dashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'status' | 'explorer' | 'settings' | 'chat' | 'logs'>('status');

    const [daemonStatus, setDaemonStatus] = useState<'online' | 'offline' | 'loading'>('loading');
    const [config, setConfig] = useState<Config>(null);

    // File Explorer State
    const [files, setFiles] = useState<FsItem[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [activeFile, setActiveFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');

    // Chat State
    const [sessions, setSessions] = useState<{ id: string, name: string }[]>([{ id: 'default', name: 'Main Session' }]);
    const [activeSessionId, setActiveSessionId] = useState('default');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Record<string, { role: 'user' | 'assistant', content: string }[]>>({});
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Logs State
    const [rawLogs, setRawLogs] = useState<string>('');
    const [isLogsTracking, setIsLogsTracking] = useState<boolean>(true);
    const [logsSearch, setLogsSearch] = useState<string>('');
    const [logsLevel, setLogsLevel] = useState<'All' | 'Info' | 'Debug' | 'Warn' | 'Error'>('All');

    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/status');
            if (res.status === 401) { router.push('/login'); return; }
            const data = await res.json();
            setDaemonStatus(data.status);
        } catch (e) {
            setDaemonStatus('offline');
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.status === 401) return;
            const data = await res.json();
            setConfig(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFiles = async (dirPath: string = '') => {
        try {
            const res = await fetch(`/api/fs?path=${encodeURIComponent(dirPath)}`);
            if (res.status === 401) return;
            const data = await res.json();
            setFiles(data.items || []);
            setCurrentPath(dirPath);
        } catch (e) {
            console.error(e);
        }
    };

    const getFileType = (path: string) => {
        const ext = path.split('.').pop()?.toLowerCase() || '';
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) return 'image';
        if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
        if (['mp3', 'wav'].includes(ext)) return 'audio';
        if (['zip', 'rar', '7z', 'pdf', 'exe', 'bin', 'tar', 'gz'].includes(ext)) return 'binary';
        return 'text';
    };

    const openFile = async (filePath: string) => {
        try {
            setActiveFile(filePath);
            
            if (getFileType(filePath) !== 'text') {
                setFileContent('');
                return;
            }

            const res = await fetch(`/api/workspace?file=${encodeURIComponent(filePath)}&t=${Date.now()}`);
            if (res.status === 401) return;
            const data = await res.json();
            setFileContent(data.content || '');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        fetchFiles('');
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchLogs = async () => {
        if (!isLogsTracking) return;
        try {
            const res = await fetch('/api/logs?limit=1000');
            if (res.ok) {
                const data = await res.json();
                setRawLogs(data.logs || '');
            }
        } catch(e) {}
    };

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
            if (isLogsTracking) {
                const interval = setInterval(fetchLogs, 3000);
                return () => clearInterval(interval);
            }
        }
    }, [activeTab, isLogsTracking]);

    const getParsedLogs = () => {
        if (!rawLogs) return [];
        const lines = rawLogs.split('\n').filter(l => l.trim() !== '');
        return lines.map(line => {
            const upper = line.toUpperCase();
            let level: 'Info' | 'Debug' | 'Warn' | 'Error' = 'Info';
            if (upper.includes('ERROR') || upper.includes('ERR:') || upper.includes('[ERR]')) level = 'Error';
            else if (upper.includes('WARN')) level = 'Warn';
            else if (upper.includes('DEBUG')) level = 'Debug';
            return { raw: line, level };
        });
    };

    const parsedLogs = getParsedLogs();
    
    const filteredLogs = parsedLogs.filter(log => {
        if (logsLevel !== 'All' && log.level !== logsLevel) return false;
        if (logsSearch && !log.raw.toLowerCase().includes(logsSearch.toLowerCase())) return false;
        return true;
    });

    const logsStats = {
        total: parsedLogs.length,
        errors: parsedLogs.filter(l => l.level === 'Error').length,
        warnings: parsedLogs.filter(l => l.level === 'Warn').length
    };

    const handleExportLogs = () => {
        const text = filteredLogs.map(l => l.raw).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nanobot-logs-${new Date().toISOString().replace(/:/g,'-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                showToast('Configuration saved successfully', 'success');
            } else {
                showToast('Failed to save configuration', 'error');
            }
        } catch (e) {
            showToast('Error saving config', 'error');
        }
        setIsSaving(false);
    };

    const handleCreateFile = async () => {
        const name = prompt('Enter new file name:');
        if (!name) return;
        const target = currentPath ? `${currentPath}/${name}` : name;
        try {
            const res = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: target, content: '' })
            });
            if (res.ok) {
                fetchFiles(currentPath);
                openFile(target);
                showToast('File created successfully', 'success');
            } else {
                showToast('Failed to create file', 'error');
            }
        } catch (e) {
            showToast('Error creating file', 'error');
        }
    };

    const handleFsAction = async (action: 'create_dir' | 'delete' | 'rename' | 'copy', fileItem?: FsItem) => {
        let target = fileItem?.path || currentPath;
        let newPath = '';
        
        if (action === 'create_dir') {
            const name = prompt('Enter new folder name:');
            if (!name) return;
            target = currentPath ? `${currentPath}/${name}` : name;
        } else if (action === 'delete') {
            if (!confirm(`Are you sure you want to delete ${fileItem?.name}?`)) return;
        } else if (action === 'rename') {
            const name = prompt('Enter new name:', fileItem?.name);
            if (!name) return;
            newPath = fileItem?.path.replace(/[^/]+$/, name) || name;
        } else if (action === 'copy') {
            const name = prompt('Enter name for the copy:', fileItem?.name + ' (copy)');
            if (!name) return;
            newPath = fileItem?.path.replace(/[^/]+$/, name) || name;
        }
        
        try {
            const res = await fetch('/api/fs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, path: target, newPath })
            });
            if (res.ok) {
                fetchFiles(currentPath);
                if (action === 'delete' && activeFile === target) {
                    setActiveFile(null);
                    setFileContent('');
                }
                showToast('Operation successful', 'success');
            } else {
                showToast('Operation failed', 'error');
            }
        } catch (e) {
            showToast('Operation error', 'error');
        }
    };

    const handleSaveFile = async () => {
        if (!activeFile) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/workspace', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: activeFile, content: fileContent })
            });
            if (res.ok) {
                showToast('File saved successfully', 'success');
            } else {
                showToast('Failed to save file', 'error');
            }
        } catch (e) {
            showToast('Error saving file', 'error');
        }
        setIsSaving(false);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput('');
        setMessages((prev: any) => ({
            ...prev,
            [activeSessionId]: [...(prev[activeSessionId] || []), { role: 'user', content: userMsg }]
        }));

        setIsChatLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, sessionId: activeSessionId })
            });

            let assistantMsg = "Gateway Error";
            if (res.ok) {
                const data = await res.json();
                assistantMsg = data.reply || data.response || JSON.stringify(data);
            }

            setMessages((prev: any) => ({
                ...prev,
                [activeSessionId]: [...(prev[activeSessionId] || []), { role: 'assistant', content: assistantMsg }]
            }));
        } catch (err) {
            setMessages((prev: any) => ({
                ...prev,
                [activeSessionId]: [...(prev[activeSessionId] || []), { role: 'assistant', content: 'Connection to local nanobot-gateway failed.' }]
            }));
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
        } catch (err) {
            console.error('Logout failed', err);
        }
    };

    const SidebarItem = ({ icon: Icon, label, id }: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 ${activeTab === id
                ? 'bg-white/10 text-white font-medium shadow-sm border border-white/5'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
            {id === 'status' && (
                <span className="ml-auto flex items-center h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${daemonStatus === 'online' ? 'bg-green-400' : daemonStatus === 'offline' ? 'bg-red-400' : 'bg-zinc-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${daemonStatus === 'online' ? 'bg-green-500' : daemonStatus === 'offline' ? 'bg-red-500' : 'bg-zinc-500'}`}></span>
                </span>
            )}
        </button>
    );

    return (
        <div className="flex h-screen bg-black/40 backdrop-blur-xl overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-black/20 flex flex-col h-full flex-shrink-0">
                <div className="p-6">
                    <div className="flex items-center gap-3 px-2 mb-8">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg ring-1 ring-white/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Nanobot</h1>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Workspace</p>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-2">
                        <SidebarItem icon={Activity} label="Overview" id="status" />
                        <SidebarItem icon={Terminal} label="Logs" id="logs" />
                        <SidebarItem icon={MessageSquare} label="Chat Sessions" id="chat" />
                        <SidebarItem icon={FolderOpen} label="File Explorer" id="explorer" />
                        <SidebarItem icon={Settings} label="Settings" id="settings" />
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-white/10 text-xs text-zinc-500 flex flex-col gap-1">
                    <p>Target Volume: <code className="text-pink-400/80">~/.nanobot</code></p>
                    <p>Docker Service: <code className="text-blue-400/80">nanobot-gateway</code></p>
                    <button onClick={handleLogout} className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition text-zinc-300 hover:text-white">
                        <LogOut className="w-4 h-4" /> Disconnect
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 flex-shrink-0">
                    <h2 className="text-xl font-semibold capitalize bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300">
                        {activeTab} Space
                    </h2>
                    {toast && (
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium animate-in fade-in slide-in-from-top-2 ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            {toast.msg}
                        </div>
                    )}
                </header>

                {/* Dynamic Content Views */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === 'status' && (
                        <div className="p-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in run-in-from-bottom-4">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-zinc-200">Gateway Connection</h3>
                                    <Server className="text-zinc-400 w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-full ${daemonStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' : daemonStatus === 'offline' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                        <Activity className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold capitalize">
                                            {daemonStatus}
                                        </p>
                                        <p className="text-sm text-zinc-500">Inspecting Docker Container `nanobot-gateway`</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4 relative justify-between overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-zinc-200">Configuration Metrics</h3>
                                    <Cpu className="text-zinc-400 w-5 h-5" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="text-2xl font-bold text-white">{config?.providers ? Object.keys(config.providers).length : 0} <span className="text-sm font-normal text-zinc-500">Providers</span></p>
                                    <p className="text-2xl font-bold text-white">{config?.channels ? Object.keys(config.channels).length : 0} <span className="text-sm font-normal text-zinc-500">Channels</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="flex h-full animate-in fade-in">
                            {/* Session Sidebar */}
                            <div className="w-64 border-r border-white/5 h-full flex flex-col bg-black/10">
                                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                    <span className="font-medium text-sm text-zinc-300">Sessions</span>
                                    <button onClick={() => {
                                        const newId = `session-${Date.now()}`;
                                        setSessions([...sessions, { id: newId, name: `Chat ${sessions.length + 1}` }]);
                                        setActiveSessionId(newId);
                                    }} className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition">
                                        <PlusCircle className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                    {sessions.map(s => (
                                        <button key={s.id} onClick={() => setActiveSessionId(s.id)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${activeSessionId === s.id ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-zinc-400 hover:bg-white/5'}`}>
                                            <MessageSquare className="w-4 h-4 opacity-70" />
                                            <span className="truncate">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Chat Area */}
                            <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-transparent to-black/20 relative">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {(messages[activeSessionId] || []).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                                            <Bot className="w-12 h-12 opacity-20 mb-4" />
                                            <p>Start a new conversation with nanobot</p>
                                            <p className="text-xs mt-2 opacity-50">Requires the gateway to be running</p>
                                        </div>
                                    ) : (
                                        (messages[activeSessionId] || []).map((msg, i) => (
                                            <div key={i} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-pink-500/20 text-pink-300'}`}>
                                                    {msg.role === 'user' ? 'U' : <Bot className="w-4 h-4" />}
                                                </div>
                                                <div className={`px-4 py-3 rounded-2xl max-w-xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    {isChatLoading && (
                                        <div className="flex gap-4 max-w-3xl mx-auto">
                                            <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-300 flex items-center justify-center">
                                                <Bot className="w-4 h-4" />
                                            </div>
                                            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 rounded-tl-none flex gap-1 items-center">
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-100" />
                                                <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-200" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-white/5 max-w-3xl mx-auto w-full">
                                    <div className="relative flex items-center border border-white/10 rounded-xl bg-black/40 shadow-inner group focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Message nanobot gateway..."
                                            className="w-full bg-transparent px-4 py-3 text-sm text-white focus:outline-none placeholder:text-zinc-600"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!chatInput.trim() || isChatLoading}
                                            className="mr-2 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 disabled:hover:bg-indigo-600">
                                            <CornerDownLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'explorer' && (
                        <div className="flex h-full animate-in fade-in">
                            {/* File Tree Panel */}
                            <div className="w-80 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
                                <div className="p-3 border-b border-white/5 flex items-center justify-between text-xs font-mono text-zinc-400 bg-black/40 gap-2 shrink-0">
                                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                                        <FolderOpen className="w-4 h-4 shrink-0" />
                                        <span className="truncate" title={`.nanobot${currentPath ? `/${currentPath}` : ''}`}>
                                            .nanobot{currentPath ? `/${currentPath}` : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={handleCreateFile} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="New File">
                                            <FilePlus className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleFsAction('create_dir')} className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition" title="New Folder">
                                            <FolderPlus className="w-4 h-4" />
                                        </button>
                                        {currentPath !== '' && (
                                            <button onClick={() => {
                                                const parent = currentPath.split('/').slice(0, -1).join('/');
                                                fetchFiles(parent);
                                            }} className="p-1 hover:text-white bg-white/5 hover:bg-white/10 rounded transition ml-1 px-2 border border-white/5" title="Go up">
                                                Back
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 p-2 space-y-0.5 custom-scrollbar">
                                    {files.length === 0 && <p className="text-xs text-zinc-600 p-2 text-center">Directory empty</p>}
                                    {files.map((file, i) => (
                                        <div key={i} className={`group w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition ${activeFile === file.path ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}>
                                            <button onClick={() => {
                                                if (file.type === 'directory') fetchFiles(file.path);
                                                else openFile(file.path);
                                            }} className="flex items-center gap-2 flex-1 overflow-hidden text-left" title={file.name}>
                                                {file.type === 'directory' ? <Folder className="w-4 h-4 text-blue-400 shrink-0" /> : <FileText className="w-4 h-4 text-pink-400 shrink-0" />}
                                                <span className="truncate">{file.name}</span>
                                            </button>
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                                {file.type === 'file' && (
                                                    <button onClick={(e) => { e.stopPropagation(); window.open(`/api/workspace?file=${encodeURIComponent(file.path)}&raw=true&download=true`, '_blank'); }} className="p-1 hover:text-white transition" title="Download">
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); handleFsAction('copy', file); }} className="p-1 hover:text-white transition" title="Copy">
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleFsAction('rename', file); }} className="p-1 hover:text-white transition" title="Rename">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleFsAction('delete', file); }} className="p-1 hover:text-red-400 transition" title="Delete">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* File Editor Panel */}
                            <div className="flex-1 flex flex-col bg-black/40 backdrop-blur-sm relative overflow-hidden">
                                {activeFile ? (
                                    <>
                                        <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-black/20 shrink-0">
                                            <span className="text-sm font-mono text-zinc-300 flex items-center gap-2 truncate pr-4">
                                                <FileText className="w-4 h-4 shrink-0" /> {activeFile}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => window.open(`/api/workspace?file=${encodeURIComponent(activeFile)}&raw=true&download=true`, '_blank')} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-zinc-300 px-3 py-1.5 rounded-md text-sm font-medium transition shadow-sm border border-white/5">
                                                    <Download className="w-4 h-4" /> Download
                                                </button>
                                                {getFileType(activeFile) === 'text' && (
                                                    <button onClick={handleSaveFile} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium transition shadow-sm disabled:opacity-50 border border-indigo-500/50">
                                                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        Save
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 overflow-auto bg-transparent relative flex flex-col">
                                            {getFileType(activeFile) === 'image' ? (
                                                <div className="flex-1 flex items-center justify-center p-8">
                                                    <img src={`/api/workspace?file=${encodeURIComponent(activeFile)}&raw=true`} alt={activeFile} className="max-w-full max-h-full object-contain rounded drop-shadow-2xl" />
                                                </div>
                                            ) : getFileType(activeFile) === 'video' ? (
                                                <div className="flex-1 flex items-center justify-center p-8">
                                                    <video src={`/api/workspace?file=${encodeURIComponent(activeFile)}&raw=true`} controls className="max-w-full max-h-full rounded drop-shadow-2xl" />
                                                </div>
                                            ) : getFileType(activeFile) === 'audio' ? (
                                                <div className="flex-1 flex items-center justify-center p-8">
                                                    <audio src={`/api/workspace?file=${encodeURIComponent(activeFile)}&raw=true`} controls className="w-full max-w-md drop-shadow-2xl" />
                                                </div>
                                            ) : getFileType(activeFile) === 'binary' ? (
                                                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                                                    <Download className="w-16 h-16 opacity-20" />
                                                    <p>Binary format file</p>
                                                    <p className="text-sm">Click Download to save this file directly.</p>
                                                </div>
                                            ) : (
                                                <textarea
                                                    value={fileContent}
                                                    onChange={e => setFileContent(e.target.value)}
                                                    className="absolute inset-0 w-full h-full bg-transparent p-6 text-sm font-mono text-zinc-300 focus:outline-none resize-none custom-scrollbar"
                                                    spellCheck={false}
                                                />
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                                        <FileText className="w-16 h-16 opacity-20 mb-4" />
                                        <p>Select a file from the explorer to preview and edit</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="h-full overflow-y-auto p-8 animate-in fade-in">
                            <div className="max-w-4xl mx-auto flex flex-col gap-8">

                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-bold">Preferences</h3>
                                        <p className="text-sm text-zinc-400 mt-1">Manage core daemon configuration graphically.</p>
                                    </div>
                                    <button onClick={handleSaveConfig} disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Config
                                    </button>
                                </div>

                                {!config ? (
                                    <div className="animate-pulse flex flex-col gap-4">
                                        <div className="h-24 bg-white/5 rounded-2xl w-full"></div>
                                        <div className="h-64 bg-white/5 rounded-2xl w-full"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* General Settings */}
                                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                            <h4 className="text-lg font-medium text-white flex gap-2 items-center mb-6"><Settings className="w-5 h-5 text-zinc-400" /> Core Settings</h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Default Model</label>
                                                    <input
                                                        type="text"
                                                        value={config.agents?.defaults?.model || ''}
                                                        onChange={e => setConfig({
                                                            ...config,
                                                            agents: { ...(config.agents || {}), defaults: { ...((config.agents || {}).defaults || {}), model: e.target.value } }
                                                        })}
                                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                                        placeholder="anthropic/claude-opus-4-5"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Workspace Dir</label>
                                                    <input type="text" value="~/.nanobot/workspace" disabled className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Providers JSON View (Hybrid approach) */}
                                        <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 relative overflow-hidden">
                                            <div className="flex justify-between items-center mb-6 relative z-10">
                                                <h4 className="text-lg font-medium text-white flex gap-2 items-center"><Server className="w-5 h-5 text-zinc-400" /> Provider JSON</h4>
                                                <button className="text-xs bg-white/10 px-3 py-1.5 rounded-md hover:bg-white/20 transition">Add Custom</button>
                                            </div>
                                            <textarea
                                                className="w-full h-80 bg-black/60 border border-white/10 rounded-xl p-4 font-mono text-sm text-green-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 relative z-10"
                                                value={JSON.stringify(config.providers || {}, null, 2)}
                                                onChange={e => {
                                                    try {
                                                        const p = JSON.parse(e.target.value);
                                                        setConfig({ ...config, providers: p });
                                                    } catch (err) { }
                                                }}
                                                spellCheck={false}
                                            />
                                            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none -mr-48 -mt-48 mix-blend-screen" />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="flex flex-col h-full animate-in fade-in bg-black/40">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 shrink-0">
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {/* Search */}
                                    <div className="relative flex items-center max-w-sm w-full md:w-64">
                                        <Filter className="w-4 h-4 text-zinc-400 absolute left-3" />
                                        <input
                                            type="text"
                                            value={logsSearch}
                                            onChange={e => setLogsSearch(e.target.value)}
                                            placeholder="Search logs..."
                                            className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition"
                                        />
                                    </div>
                                    
                                    {/* Filter */}
                                    <div className="flex items-center bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                                        {(['All', 'Info', 'Debug', 'Warn', 'Error'] as const).map(level => (
                                            <button
                                                key={level}
                                                onClick={() => setLogsLevel(level)}
                                                className={`px-3 py-2 text-xs font-medium transition ${logsLevel === level ? 'bg-indigo-600/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                                    <button 
                                        onClick={() => setIsLogsTracking(!isLogsTracking)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition border ${isLogsTracking ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20'}`}
                                    >
                                        {isLogsTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        {isLogsTracking ? 'Tracking' : 'Paused'}
                                    </button>
                                    
                                    <button 
                                        onClick={handleExportLogs}
                                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 rounded-lg text-sm font-medium transition"
                                    >
                                        <Download className="w-4 h-4" /> Export
                                    </button>
                                </div>
                            </div>
                            
                            {/* Statistics Bar */}
                            <div className="px-4 py-2 bg-indigo-900/10 border-b border-indigo-500/10 flex items-center gap-6 text-xs shrink-0 overflow-x-auto">
                                <div className="flex items-center gap-2 text-indigo-300">
                                    <BarChart className="w-3.5 h-3.5" /> Stats:
                                </div>
                                <div className="text-zinc-400">Total Lines: <span className="text-zinc-200 font-medium">{logsStats.total}</span></div>
                                <div className="text-red-400">Errors: <span className="font-medium">{logsStats.errors}</span></div>
                                <div className="text-orange-400">Warnings: <span className="font-medium">{logsStats.warnings}</span></div>
                                <div className="ml-auto text-zinc-500 text-end">
                                    Showing {filteredLogs.length} matching entries
                                </div>
                            </div>

                            {/* Logs Display */}
                            <div className="flex-1 overflow-auto p-4 md:p-6 bg-transparent custom-scrollbar">
                                <div className="max-w-7xl mx-auto space-y-1 font-mono text-sm leading-relaxed container-log-output">
                                    {filteredLogs.length === 0 ? (
                                        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 gap-4">
                                            <Terminal className="w-12 h-12 opacity-20" />
                                            <p>No log records match the current filters.</p>
                                        </div>
                                    ) : (
                                        filteredLogs.map((log, i) => (
                                            <div 
                                                key={i} 
                                                className={`py-1 px-3 rounded break-all whitespace-pre-wrap transition-colors hover:bg-white/5 ${
                                                    log.level === 'Error' ? 'text-red-400 bg-red-500/5' : 
                                                    log.level === 'Warn' ? 'text-orange-400 bg-orange-500/5' : 
                                                    log.level === 'Debug' ? 'text-zinc-500' : 
                                                    'text-zinc-300'
                                                }`}
                                            >
                                                {log.raw}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
