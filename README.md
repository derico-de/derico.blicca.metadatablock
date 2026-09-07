# Derico Blicca Metadatablock

Aurora Metadata blocks: show the content item's own metadata fields (title, description, dates, tags, ...) as blocks, singly or as a section

## Features

- Compatible with Plone 6.0+

## Installation

Add `derico.blicca.metadatablock` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "derico.blicca.metadatablock",
    # ...
]
```

Then activate the addon in your Plone site's control panel or via GenericSetup.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/collective/derico.blicca.metadatablock.git
cd derico.blicca.metadatablock

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in development mode
pip install -e ".[test]"
```

### Running Tests

```bash
pytest
```

### Running Tests with Coverage

```bash
pytest --cov=derico.blicca.metadatablock --cov-report=html
```

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
