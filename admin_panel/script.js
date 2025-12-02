const API_BASE = '/api/v1';
let chartInstance = null;

async function login() {
    const password = document.getElementById('password-input').value;
    try {
        const res = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard-screen').classList.remove('hidden');
            loadDashboard();
        } else {
            document.getElementById('login-error').textContent = 'Invalid Password';
        }
    } catch (e) {
        document.getElementById('login-error').textContent = 'Error connecting to server';
    }
}

function logout() {
    location.reload();
}

async function loadDashboard() {
    await loadStats();
    await loadReviews();
}

async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/admin/stats`);
        const stats = await res.json();

        document.getElementById('metric-llm').textContent = stats.total_LLM_calls || 0;
        document.getElementById('metric-api').textContent = stats.api_calls || 0;
        document.getElementById('metric-cache').textContent = stats.used_cache || 0;
        document.getElementById('metric-reviewed').textContent = stats.human_reviewed || 0;

        updateChart(stats);
    } catch (e) {
        console.error('Failed to load stats', e);
    }
}

function updateChart(stats) {
    const ctx = document.getElementById('reviewsChart').getContext('2d');

    // For demo purposes, we'll estimate safe/unsafe from metrics or just show placeholder
    // Ideally we'd have a separate metric for total safe/unsafe domains
    // Here we will just show a distribution of the metrics we have for visual

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['LLM Calls', 'Cache Hits', 'Human Reviews'],
            datasets: [{
                data: [
                    stats.total_LLM_calls || 0,
                    stats.used_cache || 0,
                    stats.human_reviewed || 0
                ],
                backgroundColor: ['#FF0080', '#F59E0B', '#10B981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#fff' }
                }
            }
        }
    });
}

async function loadReviews() {
    try {
        const res = await fetch(`${API_BASE}/admin/reviews`);
        const reviews = await res.json();
        const container = document.getElementById('reviews-list');
        container.innerHTML = '';

        if (reviews.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666;">No pending reviews</p>';
            return;
        }

        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-info">
                    <h4>${review.domain}</h4>
                    <p>${review.raw_url}</p>
                    <p style="font-size:0.8rem; margin-top:0.5rem; color:#888;">
                        LLM: ${review.llm_output ? review.llm_output.substring(0, 100) + '...' : 'N/A'}
                    </p>
                </div>
                <div class="review-actions">
                    <button class="btn-safe" onclick="submitReview('${review.raw_url}', 1)">Safe</button>
                    <button class="btn-unsafe" onclick="submitReview('${review.raw_url}', 0)">Unsafe</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error('Failed to load reviews', e);
    }
}

async function submitReview(rawUrl, safe) {
    if (!confirm(`Mark ${rawUrl} as ${safe ? 'SAFE' : 'UNSAFE'}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/admin/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_url: rawUrl, safe: safe })
        });

        if (res.ok) {
            loadDashboard(); // Reload stats and reviews
        } else {
            alert('Failed to submit review');
        }
    } catch (e) {
        alert('Error submitting review');
    }
}
