"""Delete the orphan block_api records."""

import logging

from plone.registry.interfaces import IRegistry
from zope.component import getUtility

from plone.blicca.auroraeditor.blockaddons import BLOCKADDON_PREFIX


logger = logging.getLogger(__name__)

RECORD_NAMES = (
    "derico.blicca.metadatablock.metadata",
    "derico.blicca.metadatablock.metadataSection",
)


def upgrade(context):
    """Delete the ``block_api`` records the retired field left, if any.

    Upgrade from profile version 1002 to 1003.
    """
    logger.info("Running upgrade step: Delete the block_api records")
    registry_records = getUtility(IRegistry).records
    for name in RECORD_NAMES:
        key = f"{BLOCKADDON_PREFIX}/{name}.block_api"
        if key in registry_records:
            del registry_records[key]
            logger.info("Deleted the %s record.", key)
