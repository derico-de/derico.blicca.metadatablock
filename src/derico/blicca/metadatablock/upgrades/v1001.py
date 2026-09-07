"""Register the Metadata block add-on records."""
import logging

from .base import reload_gs_profile

logger = logging.getLogger(__name__)


def upgrade(context):
    """Import the IAuroraBlockAddon records that make the committed metadata bundle discoverable

    Upgrade from profile version 1000 to 1001.
    """
    logger.info("Running upgrade step: Register the Metadata block add-on records")
    reload_gs_profile(context)
