import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LogOut, RefreshCw } from 'lucide-react';
import MetricsGrid from './MetricsGrid';
import ReviewsList from './ReviewsList';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import axios from 'axios';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = ({ onLogout }) => {
    const [stats, setStats] = useState({
        total_LLM_calls: 0,
        api_calls: 0,
        used_cache: 0,
        human_reviewed: 0
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/admin/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Failed to fetch stats', err);
            // Mock data for demo
            setStats({
                total_LLM_calls: 15,
                api_calls: 124,
                used_cache: 45,
                human_reviewed: 8
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const chartData = {
        labels: ['LLM Calls', 'Cache Hits', 'Human Reviews'],
        datasets: [
            {
                data: [stats.total_LLM_calls, stats.used_cache, stats.human_reviewed],
                backgroundColor: [
                    'rgba(255, 0, 128, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                ],
                borderColor: [
                    'rgba(255, 0, 128, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-[#111] border-r border-[#222] p-6 hidden md:block">
                <div className="flex items-center space-x-2 mb-8">
                    <LayoutDashboard className="text-purple-500" />
                    <span className="font-bold text-lg">PhishingAdmin</span>
                </div>
                <nav className="space-y-2">
                    <button className="w-full flex items-center space-x-2 p-3 bg-[#222] rounded-lg text-white">
                        <LayoutDashboard size={18} />
                        <span>Overview</span>
                    </button>
                </nav>
                <div className="absolute bottom-6 left-6">
                    <button onClick={onLogout} className="flex items-center space-x-2 text-gray-400 hover:text-white">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Dashboard Overview</h1>
                        <p className="text-gray-500">Real-time system metrics and reviews</p>
                    </div>
                    <button onClick={fetchStats} className="btn-icon">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </header>

                <MetricsGrid stats={stats} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="lg:col-span-2">
                        <ReviewsList onReviewComplete={fetchStats} />
                    </div>
                    <div className="card flex flex-col items-center justify-center">
                        <h3 className="text-lg font-semibold mb-4 text-gray-300">Distribution</h3>
                        <div className="w-64 h-64">
                            <Pie data={chartData} options={{ plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } } }} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
