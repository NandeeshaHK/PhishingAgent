import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is missing in .env');
            return;
        }
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'phishing_agent_db' });
        console.log('Connected!');
        console.log('Database Name:', mongoose.connection.db.databaseName);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        // Check unsafe_reviews
        const unsafeReviews = mongoose.connection.collection('unsafe_reviews');
        const reviewCount = await unsafeReviews.countDocuments();
        console.log('unsafe_reviews count:', reviewCount);
        const reviews = await unsafeReviews.find({}).limit(5).toArray();
        console.log('First 5 reviews:', JSON.stringify(reviews, null, 2));

        // Check admin
        const admin = mongoose.connection.collection('admin');
        const adminCount = await admin.countDocuments();
        console.log('admin count:', adminCount);
        const adminDocs = await admin.find({}).toArray();
        console.log('admin docs:', JSON.stringify(adminDocs, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkDb();
