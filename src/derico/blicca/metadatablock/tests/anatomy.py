"""The shared anatomy fixture and the two normalizations both suites apply.

``tests/anatomy-cases.json`` at the package root is read by this suite and
the vitest one alike (``bundle-src/test/metadata-anatomy.test.tsx``). It sits
deliberately outside both suites' trees so that neither owns it.
"""

import json
import re
from pathlib import Path


FIXTURE = Path(__file__).resolve().parents[5] / "tests" / "anatomy-cases.json"

_ALL = json.loads(FIXTURE.read_text(encoding="utf-8"))
METADATA_CASES = _ALL["metadata"]
SECTION_CASES = _ALL["metadataSection"]

_TAG = re.compile(r"<([a-z0-9]+)((?:\s+[^\s=>/]+(?:=\"[^\"]*\")?)*)\s*(/?)>", re.IGNORECASE)


def _attributes(attrs):
    return re.findall(r'[^\s=/]+(?:="[^"]*")?', attrs)


def _rewrite(html, keep):
    def replace(match):
        # The void-element slash is dropped: Chameleon emits `<img />`, the
        # DOM serializes `<img>`, and the two mean the same element.
        tag, attrs = match.group(1), match.group(2)
        kept = keep(_attributes(attrs))
        return f"<{tag}{' ' + ' '.join(kept) if kept else ''}>"

    return _TAG.sub(replace, html)


def canonical(html):
    """Attribute ORDER normalized away; everything else exact."""
    return _rewrite(html, lambda attrs: sorted(attrs))


def skeleton(html):
    """The cross-renderer contract: tags, ``class`` and text; nothing else."""
    return _rewrite(html, lambda attrs: [a for a in attrs if a.startswith("class=")])
