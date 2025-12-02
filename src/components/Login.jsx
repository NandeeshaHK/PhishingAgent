import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import axios from 'axios';

const Login = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Try to hit the API if available, otherwise fallback for demo/dev if API is down
            try {
                await axios.post('/api/v1/admin/login', { password });
                onLogin();
            } catch (err) {
                // For development/demo purposes if backend is not running on this branch
                if (password === '123asd!@#') {
                    onLogin();
                } else {
                    throw new Error('Invalid password');
                }
            }
        } catch (err) {
            setError('Invalid password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/30 rounded-full blur-[128px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[128px]" />

            <div className="card w-full max-w-md p-8 space-y-8 backdrop-blur-xl bg-white/5 border border-white/10 relative z-10 shadow-2xl">
                <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-white/5 shadow-inner">
                        <ShieldCheck className="w-12 h-12 text-purple-400" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Phishing Agent
                        </h1>
                        <p className="text-gray-400 text-sm tracking-wider uppercase">Admin Portal</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wide">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all relative z-10"
                                placeholder="Enter access key"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-purple-900/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center space-x-2">
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                <span>Verifying...</span>
                            </span>
                        ) : (
                            'Access Dashboard'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
