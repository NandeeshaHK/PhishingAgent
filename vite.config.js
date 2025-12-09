import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import mongoose from 'mongoose';

// Define Schema outside to avoid recompilation issues in dev
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'configure-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url.startsWith('/api/v1/admin')) {
              // Connect to DB if not connected
              if (mongoose.connection.readyState === 0) {
                try {
                  if (!env.MONGODB_URI) {
                    console.error('MONGODB_URI is missing in .env');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Server configuration error' }));
                    return;
                  }
                  await mongoose.connect(env.MONGODB_URI, { dbName: 'phishing_agent_db' });
                  console.log('Connected to MongoDB via Vite Middleware');
                } catch (err) {
                  console.error('MongoDB connection error:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: 'Database connection failed' }));
                  return;
                }
              }

              // POST /login - Simple auth check
              if (req.url === '/api/v1/admin/login' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                  try {
                    const { password } = JSON.parse(body);
                    if (password === '123asd!@#' || password === env.ADMIN_PASSWORD) {
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

              // GET /reviews - Fetch pending reviews
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

              // POST /review - Update review status
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

              // GET /stats - Fetch dashboard stats from admin collection
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
            }
            next();
          });
        },
      },
    ],
  };
});
