import unittest
from unittest.mock import MagicMock, patch
from app.services.phishing import LRUCache, DomainChecker, DomainUpdater, domain_reputation_cache

class TestLRUCache(unittest.TestCase):
    def setUp(self):
        # Clear cache before each test
        domain_reputation_cache.cache.clear()

    def test_lru_cache_basic(self):
        cache = LRUCache(capacity=2)
        cache.put("a", 1)
        cache.put("b", 2)
        self.assertEqual(cache.get("a"), 1)
        self.assertEqual(cache.get("b"), 2)

    def test_lru_cache_eviction(self):
        cache = LRUCache(capacity=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.put("c", 3) # Should evict 'a' because 'b' was accessed? No, 'a' was least recently used if we didn't access it.
        # Wait, let's check access pattern.
        # put a, put b. LRU is a.
        # put c. Evict a.
        self.assertIsNone(cache.get("a"))
        self.assertEqual(cache.get("b"), 2)
        self.assertEqual(cache.get("c"), 3)

    def test_lru_cache_access_update(self):
        cache = LRUCache(capacity=2)
        cache.put("a", 1)
        cache.put("b", 2)
        cache.get("a") # Access 'a', making 'b' LRU
        cache.put("c", 3) # Should evict 'b'
        self.assertEqual(cache.get("a"), 1)
        self.assertIsNone(cache.get("b"))
        self.assertEqual(cache.get("c"), 3)

    @patch("app.services.phishing.get_mongo_client")
    def test_domain_checker_cache_hit(self, mock_get_client):
        # Setup cache
        domain_reputation_cache.put("google.com", 1)
        
        checker = DomainChecker()
        result = checker.check_reputation("google.com")
        
        self.assertEqual(result, 1)
        mock_get_client.assert_not_called() # Should not call DB

    @patch("app.services.phishing.get_mongo_client")
    def test_domain_checker_cache_miss_db_hit(self, mock_get_client):
        # Mock DB
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db
        mock_db.__getitem__.return_value = mock_collection
        mock_collection.find_one.return_value = {"domain": "example.com", "safe": 0}
        mock_get_client.return_value = mock_client

        checker = DomainChecker()
        result = checker.check_reputation("example.com")
        
        self.assertEqual(result, 0)
        self.assertEqual(domain_reputation_cache.get("example.com"), 0) # Should be cached now

    @patch("app.services.phishing.get_mongo_client")
    def test_domain_updater_updates_cache(self, mock_get_client):
        # Mock DB
        mock_db = MagicMock()
        mock_collection = MagicMock()
        mock_client = MagicMock()
        mock_client.__getitem__.return_value = mock_db
        mock_db.__getitem__.return_value = mock_collection
        mock_get_client.return_value = mock_client

        updater = DomainUpdater()
        updater.update_map("https://new-phishing.com", 0)
        
        # Check if cache updated
        # DomainExtractor extracts domain from url
        # "https://new-phishing.com" -> "new-phishing.com"
        self.assertEqual(domain_reputation_cache.get("new-phishing.com"), 0)

if __name__ == "__main__":
    unittest.main()
