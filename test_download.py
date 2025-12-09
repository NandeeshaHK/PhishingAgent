
import asyncio
from app.services.phishing import PhishingService

async def test_download_detection():
    service = PhishingService()
    
    test_cases = [
        ("https://example.com/setup.exe", True),
        ("https://example.com/archive.zip", True),
        ("https://example.com/image.png", False), # Assuming png is not in BLOCK list
        ("https://example.com/document.pdf", True),
        ("https://example.com/api?download=true", True),
        ("https://example.com/file?force_download=1", True),
        ("https://google.com", False)
    ]

    print(f"{'URL':<50} | {'Expected':<10} | {'Actual':<10} | {'Result':<10}")
    print("-" * 90)

    for url, expected in test_cases:
        result = await service.check_url(url)
        is_download = result.get("is_download", False)
        status = "PASS" if is_download == expected else "FAIL"
        print(f"{url:<50} | {str(expected):<10} | {str(is_download):<10} | {status:<10}")

if __name__ == "__main__":
    asyncio.run(test_download_detection())
