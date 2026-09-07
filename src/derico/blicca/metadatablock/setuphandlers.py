"""Setup handlers for derico.blicca.metadatablock."""

from Products.CMFPlone.interfaces import INonInstallable
from zope.interface import implementer


@implementer(INonInstallable)
class HiddenProfiles:
    """Hidden profiles from the Plone add-ons control panel."""

    def getNonInstallableProfiles(self):
        """Return list of profiles that should not be available for install."""
        # Every upgrade profile belongs here too, not just the uninstall
        # one: `genericsetup:registerProfile` makes them EXTENSION profiles,
        # so an unhidden one shows up in the add-ons control panel as a
        # separately installable product. Installing it there would import
        # its XML without moving the default profile's version, leaving the
        # site's recorded version behind what it actually has.
        # `test_upgrade_step_1001.py` fails if a later step forgets one.
        return [
            "derico.blicca.metadatablock:uninstall",
            "derico.blicca.metadatablock.upgrades:1001",
        ]


def uninstall(context):
    """Uninstall script."""
    # Do something on uninstall if needed
    pass
