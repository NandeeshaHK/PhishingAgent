
import asyncio
from unittest.mock import MagicMock, AsyncMock
import sys

# Mocking modules to avoid import errors or side effects if dependencies are missing
import types
sys.modules['pymongo'] = MagicMock()
sys.modules['pymongo.server_api'] = MagicMock()
sys.modules['playwright'] = MagicMock()
sys.modules['playwright.async_api'] = MagicMock()
sys.modules['langchain_core'] = MagicMock()
sys.modules['langchain_core.messages'] = MagicMock()
sys.modules['app.services.llm'] = MagicMock()
# Mock settings to avoid Pydantic validation errors or missing env vars
mock_config = MagicMock()
mock_config.settings = MagicMock()
sys.modules['app.core.config'] = mock_config

# Now import the service (it will use the mocked modules if real ones fail or strictly for this test)
# Since I am editing the file in place, I assume the app structure exists.
from app.services.phishing import PhishingService, AdvancedURLAnalyzer

async def test_download_detection_mocked():
    print("Initializing Service...")
    service = PhishingService()
    
    # Mock the other components to ensure no side effects
    service.extractor = MagicMock()
    service.checker = MagicMock()
    service.updater = MagicMock()
    # Keep real analyzer for is_download_link logic, but mock fetch/analyze if needed
    # (Though is_download_link doesn't call them)
    
    test_cases = [
        ("https://example.com/setup.exe", True),
        ("https://example.com/archive.zip", True),
        ("https://example.com/image.png", False), 
        ("https://example.com/document.pdf", True),
        ("https://example.com/api?download=true", True),
        ("https://example.com/file?force_download=1", True),
        ("https://google.com", False)
    ]

    print(f"\n{'URL':<50} | {'Expected':<10} | {'Actual':<10} | {'Result':<10}")
    print("-" * 90)

    for url, expected in test_cases:
        # We invoke check_url. 
        # For expected=True, it should return early.
        # For expected=False, it would proceed. We just want to check if it CAUGHT the download.
        
        # We can also just test the analyzer directly for unit testing
        is_download = service.analyzer.is_download_link(service.analyzer.normalize_url(url))
        
        # Also verify check_url structure
        if is_download:
            result = await service.check_url(url)
            # Verify result format
            check_pass = (result.get("is_download") == True) and (result.get("status") == "download")
        else:
            check_pass = not is_download

        status = "PASS" if (is_download == expected) else "FAIL"
        print(f"{url:<50} | {str(expected):<10} | {str(is_download):<10} | {status:<10}")

if __name__ == "__main__":
    asyncio.run(test_download_detection_mocked())
