import React from 'react';
import { Bot, Activity, Database, UserCheck } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, gradient }) => (
    <div className={`card relative overflow-hidden group`}>
        <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient}`}></div>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold mt-2">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} bg-opacity-20`}>
                <Icon className="text-white" size={24} />
            </div>
        </div>
    </div>
);

const MetricsGrid = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
            <MetricCard
                title="Pending Reviews"
                value={stats.pending_count}
                icon={Activity}
                gradient="from-yellow-500 to-orange-500"
            />
            <MetricCard
                title="Reviewed Links"
                value={stats.reviewed_count}
                icon={UserCheck}
                gradient="from-green-500 to-emerald-500"
            />
            <MetricCard
                title="Total LLM Calls"
                value={stats.total_LLM_calls}
                icon={Bot}
                gradient="from-pink-500 to-rose-500"
            />
            <MetricCard
                title="API Calls"
                value={stats.api_calls}
                icon={Activity}
                gradient="from-blue-500 to-cyan-500"
            />
            <MetricCard
                title="Cache Hits"
                value={stats.used_cache}
                icon={Database}
                gradient="from-amber-500 to-orange-500"
            />
        </div>
    );
};

export default MetricsGrid;
