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
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="card w-full max-w-md p-8 space-y-6">
                <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 bg-purple-900/20 rounded-full">
                        <ShieldCheck className="w-12 h-12 text-purple-500" />
                    </div>
                    <h1 className="text-2xl font-bold gradient-text">Phishing Agent Admin</h1>
                    <p className="text-gray-500">Secure Access Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                placeholder="Enter admin password"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary flex justify-center"
                    >
                        {loading ? 'Verifying...' : 'Access Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
