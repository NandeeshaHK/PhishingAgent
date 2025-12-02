import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ReviewsList = ({ onReviewComplete }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await axios.get('/api/v1/admin/reviews');
            setReviews(res.data);
        } catch (err) {
            console.error('Failed to fetch reviews', err);
            // Mock data
            setReviews([
                { raw_url: 'http://suspicious-bank-login.com', domain: 'suspicious-bank-login.com', llm_output: 'SAFE: 0. Detected phishing keywords.' },
                { raw_url: 'http://free-iphone-giveaway.net', domain: 'free-iphone-giveaway.net', llm_output: 'SAFE: 0. Suspicious redirect pattern.' }
            ]);
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
            // Remove from local list immediately for UI responsiveness
            setReviews(prev => prev.filter(r => r.raw_url !== rawUrl));
            onReviewComplete();
        } catch (err) {
            alert('Failed to submit review (Mock mode: Action simulated)');
            setReviews(prev => prev.filter(r => r.raw_url !== rawUrl));
            onReviewComplete();
        }
    };

    return (
        <div className="card h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Pending Reviews</h3>
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                    {reviews.length} Pending
                </span>
            </div>

            <div className="space-y-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="mx-auto mb-3 text-green-500" size={32} />
                        <p>All caught up! No pending reviews.</p>
                    </div>
                ) : (
                    reviews.map((review, idx) => (
                        <div key={idx} className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                    <AlertTriangle size={16} className="text-yellow-500" />
                                    <h4 className="font-semibold text-white">{review.domain}</h4>
                                </div>
                                <a href={review.raw_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline flex items-center space-x-1 mb-2">
                                    <span>{review.raw_url}</span>
                                    <ExternalLink size={12} />
                                </a>
                                <p className="text-xs text-gray-400 bg-[#222] p-2 rounded">
                                    {review.llm_output ? review.llm_output.substring(0, 120) + '...' : 'No analysis available'}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleReview(review.raw_url, 1)}
                                    className="flex items-center space-x-1 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                                >
                                    <CheckCircle size={18} />
                                    <span>Safe</span>
                                </button>
                                <button
                                    onClick={() => handleReview(review.raw_url, 0)}
                                    className="flex items-center space-x-1 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                                >
                                    <XCircle size={18} />
                                    <span>Unsafe</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReviewsList;
