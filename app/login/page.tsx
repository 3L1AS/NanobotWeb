'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password.trim()) return;

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh(); // Force a refresh to ensure middleware picks up the new cookie strictly
            } else {
                const data = await res.json();
                setError(data.error || 'Authentication failed');
            }
        } catch (err) {
            setError('An unexpected error occurred. Is the server running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center p-4">

            <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
                {/* Logo Header */}
                <div className="flex flex-col items-center gap-4 mb-8">
                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl shadow-indigo-500/20 ring-1 ring-white/20">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Nanobot Dashboard</h1>
                        <p className="text-sm text-zinc-500 mt-1">Please enter your master password to access your workspace.</p>
                    </div>
                </div>

                {/* Login Form Card */}
                <div className="p-[1px] rounded-3xl bg-gradient-to-b from-white/20 to-transparent shadow-2xl">
                    <div className="bg-[#09090b]/90 backdrop-blur-2xl rounded-[23px] p-8">
                        <form onSubmit={handleLogin} className="flex flex-col gap-6">

                            <div className="flex flex-col gap-2 relative">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">Master Password</label>
                                <div className="relative flex items-center group">
                                    <KeyRound className="absolute left-4 w-5 h-5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-center animate-in slide-in-from-top-2">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || !password.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-white/20 disabled:opacity-50 disabled:hover:bg-white"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Unlock Gateway
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>


            </div>
        </div>
    );
}
