"""
Shared pytest fixtures for the unified test suite.
"""

import pytest
from pathlib import Path

from app.services.data_loader import DataLoader


@pytest.fixture(scope="session")
def loader():
    """Session-scoped DataLoader using real CSV files."""
    return DataLoader()


@pytest.fixture(scope="session")
def actuals_norm(loader):
    """Session-scoped normalised actuals DataFrame."""
    return loader.get_normalized_actuals()


@pytest.fixture(scope="session")
def forecasts_norm(loader):
    """Session-scoped normalised forecasts DataFrame."""
    return loader.get_normalized_forecasts()
