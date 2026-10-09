# conftest.py
import pytest

# Make all async tests work without event loop issues
pytest_plugins = ["pytest_asyncio"]
