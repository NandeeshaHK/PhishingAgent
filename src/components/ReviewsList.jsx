import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink, AlertTriangle, Eye, Clock, ShieldAlert, Activity } from 'lucide-react';
import axios from 'axios';

const ReviewsList = ({ onReviewComplete }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedReview, setExpandedReview] = useState(null);

    const fetchReviews = async () => {
        try {
            const res = await axios.get('/api/v1/admin/reviews');
            if (Array.isArray(res.data)) {
                setReviews(res.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err) {
            console.error('Failed to fetch reviews', err);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleReview = async (rawUrl, safe) => {
        try {
            await axios.post('/api/v1/admin/review', { raw_url: rawUrl, safe });
            setReviews(prev => prev.filter(r => r.raw_url !== rawUrl));
            onReviewComplete();
        } catch (err) {
            alert('Failed to submit review (Mock mode: Action simulated)');
            setReviews(prev => prev.filter(r => r.raw_url !== rawUrl));
            onReviewComplete();
        }
    };

    const TruncatedText = ({ text, onExpand }) => {
        const maxLength = 200;
        if (!text) return <span className="text-gray-500 italic">No detailed analysis provided.</span>;
        if (text.length <= maxLength) return <p className="text-sm text-gray-300 whitespace-pre-wrap">{text}</p>;

        return (
            <div className="text-sm text-gray-300">
                <p className="whitespace-pre-wrap">{text.substring(0, maxLength)}...</p>
                <button
                    onClick={onExpand}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-xs flex items-center space-x-1 font-medium"
                >
                    <Eye size={12} />
                    <span>Read Full Analysis</span>
                </button>
            </div>
        );
    };

    const MetricsGrid = ({ analysis }) => {
        if (!analysis) return null;
        // Exclude llm_output and non-primitive values for the grid
        const metrics = Object.entries(analysis).filter(([key, value]) =>
            key !== 'llm_output' && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        );

        if (metrics.length === 0) return null;

        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {metrics.map(([key, value]) => (
                    <div key={key} className="bg-[#222] p-2 rounded border border-[#333] flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-mono text-white truncate" title={String(value)}>{String(value)}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="card h-full relative">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <ShieldAlert className="text-purple-500" />
                    Pending Reviews
                </h3>
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
                    {reviews.length} Pending
                </span>
            </div>

            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-16 text-gray-500 bg-[#1a1a1a] rounded-xl border border-[#333] border-dashed">
                        <CheckCircle className="mx-auto mb-4 text-green-500 opacity-50" size={48} />
                        <p className="text-lg font-medium text-gray-400">All caught up!</p>
                        <p className="text-sm">No suspicious links require your attention.</p>
                    </div>
                ) : (
                    reviews.map((review, idx) => (
                        <div key={idx} className="bg-[#151515] rounded-xl border border-[#333] overflow-hidden hover:border-purple-500/30 transition-colors">
                            {/* Header */}
                            <div className="bg-[#1a1a1a] p-4 border-b border-[#333] flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                                        <AlertTriangle size={20} className="text-yellow-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{review.domain}</h4>
                                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                                            {review.timestamp && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(review.timestamp).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2 w-full sm:w-auto">
                                    <button
                                        onClick={() => handleReview(review.raw_url, 1)}
                                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors border border-green-500/20"
                                    >
                                        <CheckCircle size={16} />
                                        <span className="font-medium">Safe</span>
                                    </button>
                                    <button
                                        onClick={() => handleReview(review.raw_url, 0)}
                                        className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
                                    >
                                        <XCircle size={16} />
                                        <span className="font-medium">Unsafe</span>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                {/* URL */}
                                <div className="mb-5">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Target URL</label>
                                    <a href={review.raw_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-2 break-all bg-[#111] p-3 rounded border border-[#222]">
                                        <ExternalLink size={14} className="flex-shrink-0" />
                                        <span className="font-mono text-sm">{review.raw_url}</span>
                                    </a>
                                </div>

                                {/* Metrics */}
                                <MetricsGrid analysis={review.analysis} />

                                {/* LLM Analysis */}
                                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#2a2a2a]">
                                    <div className="flex items-center gap-2 mb-2 text-purple-400">
                                        <Activity size={16} />
                                        <h5 className="text-sm font-bold uppercase tracking-wide">AI Analysis</h5>
                                    </div>
                                    <TruncatedText
                                        text={review.analysis?.llm_output}
                                        onExpand={() => setExpandedReview(review)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Full Text Modal */}
            {expandedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#151515] border border-[#333] rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-[#333] flex justify-between items-center bg-[#1a1a1a]">
                            <div className="flex items-center gap-3">
                                <Activity className="text-purple-500" />
                                <div>
                                    <h3 className="font-bold text-lg text-white">Detailed Analysis</h3>
                                    <p className="text-xs text-gray-500">{expandedReview.domain}</p>
                                </div>
                            </div>
                            <button onClick={() => setExpandedReview(null)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-[#333] rounded">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Analyzed URL</h4>
                                <div className="bg-[#111] p-3 rounded border border-[#222] font-mono text-sm text-blue-400 break-all">
                                    {expandedReview.raw_url}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                {expandedReview.analysis && Object.entries(expandedReview.analysis)
                                    .filter(([key, value]) => key !== 'llm_output' && (typeof value === 'string' || typeof value === 'number'))
                                    .map(([key, value]) => (
                                        <div key={key} className="bg-[#222] p-3 rounded border border-[#333]">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{key.replace(/_/g, ' ')}</div>
                                            <div className="text-white font-mono">{value}</div>
                                        </div>
                                    ))
                                }
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">LLM Assessment</h4>
                                <div className="bg-[#1a1a1a] p-5 rounded-lg border border-[#333] text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                                    {expandedReview.analysis?.llm_output || 'No text analysis available.'}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[#333] bg-[#1a1a1a] flex justify-end">
                            <button
                                onClick={() => setExpandedReview(null)}
                                className="px-5 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsList;
