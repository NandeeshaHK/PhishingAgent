import os
import sys
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

INITIAL_DATA = {
  "google.com": 1,
}

def init_db():
    if not settings.MONGO_URI:
        print("MONGO_URI not set in environment or config.")
        return

    print(f"Connecting to MongoDB...")
    try:
        client = MongoClient(settings.MONGO_URI, server_api=ServerApi('1'))
        # Ping
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
        
        db = client[settings.MONGO_DB_NAME]
        collection = db["domain_reputation"]
        
        # Prefill data
        print("Seeding/Updating database...")
        count = 0
        for domain, safe_value in INITIAL_DATA.items():
            if not domain: continue # Skip empty strings
            
            # Upsert
            result = collection.update_one(
                {"domain": domain},
                {"$set": {"domain": domain, "safe": safe_value}},
                upsert=True
            )
            if result.upserted_id or result.modified_count > 0:
                count += 1
        
        print(f"Processed {len(INITIAL_DATA)} entries. Updated/Inserted: {count}")
        
    except Exception as e:
        print(f"Error connecting or seeding database: {e}")

if __name__ == "__main__":
    init_db()
