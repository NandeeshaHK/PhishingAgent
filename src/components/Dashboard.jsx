import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LogOut, RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react';
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
        human_reviewed: 0,
        reviewed_count: 0,
        pending_count: 0
    });
    const [loading, setLoading] = useState(true);
    const [isReviewsOpen, setIsReviewsOpen] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/admin/stats');
            if (res.data && typeof res.data === 'object') {
                setStats(res.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Failed to fetch stats', err);
            // Mock data for demo
            setStats({
                total_LLM_calls: 15,
                api_calls: 124,
                used_cache: 45,
                human_reviewed: 8,
                reviewed_count: 8,
                pending_count: 12
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
            <main className="flex-1 p-8 overflow-y-auto bg-black">
                <div className="max-w-7xl mx-auto w-full">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold gradient-text">Dashboard Overview</h1>
                            <p className="text-gray-500">Real-time system metrics and reviews</p>
                        </div>
                        <button onClick={fetchStats} className="btn-icon">
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </header>

                    {/* Top Section: Pie Chart (Left) and Metrics (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Left Half: Pie Chart */}
                        <div className="card flex flex-col items-center justify-center p-6 h-[400px]">
                            <h3 className="text-lg font-semibold mb-4 text-gray-300 w-full text-left">Distribution</h3>
                            <div className="w-full h-full flex items-center justify-center relative">
                                <Pie
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: {
                                                position: 'right',
                                                labels: {
                                                    color: '#fff',
                                                    padding: 20,
                                                    font: { size: 12 }
                                                }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Right Half: Metrics Grid (2x2) */}
                        <div className="h-[400px]">
                            <MetricsGrid stats={stats} />
                        </div>
                    </div>

                    {/* Bottom Section: Collapsible Reviews */}
                    <div className="card p-0 overflow-hidden border border-[#333]">
                        <button
                            onClick={() => setIsReviewsOpen(!isReviewsOpen)}
                            className="w-full flex items-center justify-between p-6 bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${isReviewsOpen ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-bold text-white">Unsafe Links Review</h3>
                                    <p className="text-sm text-gray-500">Pending manual verification required</p>
                                </div>
                            </div>
                            <ChevronDown
                                className={`text-gray-400 transition-transform duration-300 ${isReviewsOpen ? 'transform rotate-180' : ''}`}
                                size={24}
                            />
                        </button>

                        <div className={`transition-all duration-300 ease-in-out ${isReviewsOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="p-6 border-t border-[#333]">
                                <ReviewsList onReviewComplete={fetchStats} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
