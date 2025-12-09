import http from 'http';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB Connection
const connectDB = async () => {
    if (mongoose.connection.readyState === 0) {
        try {
            if (!process.env.MONGODB_URI) {
                console.error('MONGODB_URI is missing in .env');
                return false;
            }
            await mongoose.connect(process.env.MONGODB_URI, { dbName: 'phishing_agent_db' });
            console.log('Connected to MongoDB');
            return true;
        } catch (err) {
            console.error('MongoDB connection error:', err);
            return false;
        }
    }
    return true;
};

// Model Definition
const reviewSchema = new mongoose.Schema({
    raw_url: String,
    domain: String,
    analysis: Object,
    llm_output: String,
    timestamp: Date,
    reviewed: { type: Number, default: 0 },
    safe: Number
}, { collection: 'unsafe_reviews' });

let Review;
try {
    Review = mongoose.model('Review');
} catch {
    Review = mongoose.model('Review', reviewSchema);
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    // CORS for local dev testing if needed (optional)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    // API Routes
    if (req.url.startsWith('/api/v1/admin')) {
        await connectDB();

        // POST /login
        if (req.url === '/api/v1/admin/login' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const { password } = JSON.parse(body);
                    if (password === '123asd!@#' || password === process.env.ADMIN_PASSWORD) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, token: 'mock-token' }));
                    } else {
                        res.statusCode = 401;
                        res.end(JSON.stringify({ error: 'Invalid password' }));
                    }
                } catch (err) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                }
            });
            return;
        }

        // GET /reviews
        if (req.url === '/api/v1/admin/reviews' && req.method === 'GET') {
            try {
                const reviews = await Review.find({ reviewed: 0 }).limit(50);
                const formattedReviews = reviews.map(r => ({
                    raw_url: r.raw_url,
                    domain: r.domain || (r.raw_url ? new URL(r.raw_url).hostname : 'unknown'),
                    analysis: r.analysis || {},
                    llm_output: r.llm_output || r.analysis?.llm_output || 'No analysis available',
                    timestamp: r.timestamp
                }));

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(formattedReviews));
            } catch (err) {
                console.error('Error fetching reviews:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to fetch reviews' }));
            }
            return;
        }

        // POST /review
        if (req.url === '/api/v1/admin/review' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { raw_url, safe } = JSON.parse(body);
                    await Review.updateOne(
                        { raw_url: raw_url },
                        { $set: { reviewed: 1, safe: safe } }
                    );
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    console.error('Error updating review:', err);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to update review' }));
                }
            });
            return;
        }

        // GET /stats
        if (req.url === '/api/v1/admin/stats' && req.method === 'GET') {
            try {
                const adminCollection = mongoose.connection.collection('admin');
                const statsDocs = await adminCollection.find({}).toArray();

                const stats = statsDocs.reduce((acc, doc) => {
                    if (doc.metric && doc.value !== undefined) {
                        acc[doc.metric] = doc.value;
                    }
                    return acc;
                }, {});

                const pendingCount = await Review.countDocuments({ reviewed: 0 });
                const reviewedCount = await Review.countDocuments({ reviewed: 1 });

                const finalStats = {
                    pending_count: pendingCount,
                    reviewed_count: stats.human_reviewed || reviewedCount,
                    total_LLM_calls: stats.total_LLM_calls || 0,
                    api_calls: stats.api_calls || 0,
                    used_cache: stats.used_cache || 0,
                    human_reviewed: stats.human_reviewed || 0
                };

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(finalStats));
            } catch (err) {
                console.error('Error fetching stats:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to fetch stats' }));
            }
            return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'API Endpoint not found' }));
        return;
    }

    // Serve Static Files -> dist folder
    let filePath = path.join(__dirname, 'dist', req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath).toLowerCase();

    // SPA Fallback: if file doesn't exist and no extension, serve index.html
    // But checking extension is better to avoid serving index.html for missing js/css

    try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }
    } catch (err) {
        // If file not found
        if (!extname) {
            // It's a route, serve index.html
            filePath = path.join(__dirname, 'dist', 'index.html');
        } else {
            // It's a missing asset
            res.statusCode = 404;
            res.end();
            return;
        }
    }

    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Should have been caught above, but safety net
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
