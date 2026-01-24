# Manjaro Package Dependency Explorer

A modern, interactive browser-based tool for visualizing and exploring package dependencies from pacman-managed systems.

## Features

- Interactive force-directed graph visualization using D3.js
- Visual distinction between explicitly installed and dependency packages
- Detailed package inspection with dependency lists
- Zoom, pan, and drag interactions
- Handles thousands of packages efficiently
- Fully static (no backend required)

## Quick Start

### 1. Generate Dependency Data

Run the collection script to extract package data from your Manjaro system:

```bash
./collect-deps.sh
```

This will create `ui/graph.json` containing all installed packages and their relationships. The process takes approximately 5-15 minutes depending on the number of installed packages.

**Note:** The repository includes a sample `graph.json` with 35 representative packages for testing the UI without running the full extraction.

### 2. View the Visualization

Start a local HTTP server from the project root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ui/ in your web browser.

### 3. Explore the Graph

- **Zoom**: Scroll with mouse wheel
- **Pan**: Click and drag the background
- **Inspect Package**: Click on any node to see details in the sidebar
- **Reposition Nodes**: Drag individual nodes to rearrange the layout

## Color Legend

- **Green Nodes**: Explicitly installed packages (installed by user command)
- **Blue Nodes**: Dependency packages (installed automatically as dependencies)

## Requirements

### For Data Collection

- Manjaro Linux (or any Arch-based distribution with pacman)
- `pacman` and `pactree` utilities (standard on Arch-based systems)
- Bash shell

### For Visualization

- Modern web browser (Chrome, Firefox, Edge, Safari)
- Local HTTP server (Python 3 recommended)

## File Structure

```
.
├── AGENTS.md           # Project specification
├── CLAUDE.md           # Development guidance for Claude Code
├── README.md           # This file
├── collect-deps.sh     # Data extraction script
└── ui/                 # Web interface directory
    ├── index.html      # Main HTML page
    ├── styles.css      # Stylesheet
    ├── app.js          # Application logic
    └── graph.json      # Dependency data (sample included, regenerate for your system)
```

## Data Format

The `graph.json` file uses the following schema:

```json
{
  "nodes": {
    "package-name": {
      "explicit": true | false,
      "depends_on": ["dependency1", "dependency2"],
      "required_by": ["package1", "package2"]
    }
  }
}
```

- `explicit`: Whether the package was explicitly installed by the user
- `depends_on`: Direct dependencies (depth 1) of this package
- `required_by`: Packages that directly depend on this package (depth 1)

## Usage Examples

### Export Dependency Data for Analysis

```bash
# Extract specific package information
jq '.nodes.bash' ui/graph.json

# List all explicitly installed packages
jq '.nodes | to_entries | .[] | select(.value.explicit == true) | .key' ui/graph.json

# Find packages with no dependencies
jq '.nodes | to_entries | .[] | select(.value.depends_on | length == 0) | .key' ui/graph.json

# Find packages not required by anything (potential candidates for removal)
jq '.nodes | to_entries | .[] | select(.value.required_by | length == 0 and .value.explicit == false) | .key' ui/graph.json
```

### Compare System States

```bash
# Save current state
./collect-deps.sh
cp ui/graph.json ui/graph-before.json

# Make system changes (install/remove packages)
# ...

# Generate new state
./collect-deps.sh
cp ui/graph.json ui/graph-after.json

# Compare (requires custom diff script or manual inspection)
```

## Performance

The visualization is optimized for large graphs:

- Tested with 2000+ packages
- Automatic force simulation tuning for >500 nodes
- Efficient rendering with D3.js v7
- Typical browser memory usage: <500MB

## Troubleshooting

### graph.json not found

Make sure you're running the HTTP server from the project root directory and accessing http://localhost:8000/ui/, or run `./collect-deps.sh` to generate the file.

### Browser shows blank page

Check the browser console (F12) for JavaScript errors. Ensure D3.js can be loaded from the CDN.

### Script fails on non-Manjaro system

The script requires `pacman` and `pactree`. It works on any Arch-based distribution but will fail on Debian, Ubuntu, Fedora, etc.

### Visualization is slow

If you have >2000 packages, consider:

- Using a more powerful computer
- Closing other browser tabs
- Trying a different browser (Chrome typically performs best)

## Future Enhancements

Potential improvements documented in `AGENTS.md` include:

- Search and filtering functionality
- Orphan package detection
- Dependency depth analysis
- Package impact simulation
- Dark mode theme

These are not implemented in the current version.

## License

This project is created as a utility tool. Feel free to use and modify as needed.

## Technical Details

- **Data Extraction**: Pure shell script using pacman/pactree
- **Visualization**: D3.js v7 force-directed graph
- **Architecture**: Three-layer design (extraction → data model → UI)
- **No backend**: Fully static, client-side application
- **Code Organization**: Modular structure with separate HTML, CSS, and JavaScript files

For detailed technical specifications, see [AGENTS.md](AGENTS.md).
