# Manjaro Package Dependency Explorer

A modern, interactive browser-based tool for visualizing and exploring package dependencies from pacman-managed systems.

## Features

- Interactive force-directed graph visualization using D3.js
- Visual distinction between explicitly installed and dependency packages
- Detailed package inspection with version information and dependency lists
- Clickable package names for easy navigation between dependencies
- Visual indicator (orange border) for currently selected package
- Multiple data file support with file selector dropdown
- Zoom, pan, and drag interactions
- Handles thousands of packages efficiently
- Fully static (no backend required)

## Quick Start

### 1. Generate Dependency Data

Run the collection script to extract package data from your Manjaro system:

```bash
./collect-deps.sh
```

This will create `ui/data/graph.json` containing all installed packages, their versions, and relationships. The process takes approximately 5-15 minutes depending on the number of installed packages.

**Note:** The repository includes a sample `graph.json` with 35 representative packages (including version information) for testing the UI without running the full extraction.

### 2. View the Visualization

Start a local HTTP server from the project root:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ui/ in your web browser.

### 3. Explore the Graph

- **Zoom**: Scroll with mouse wheel
- **Pan**: Click and drag the background
- **Inspect Package**: Click on any node to see details in the sidebar (selected node shows orange border)
- **Navigate Dependencies**: Click on any package name in the dependency lists to jump to that package
- **Switch Data Files**: Use the dropdown in the header to load different JSON files
- **Reposition Nodes**: Drag individual nodes to rearrange the layout

## Visual Indicators

- **Green Nodes**: Explicitly installed packages (installed by user command)
- **Blue Nodes**: Dependency packages (installed automatically as dependencies)
- **Orange Border**: Currently selected package (whose details are shown in the sidebar)

## Working with Multiple Data Files

The application supports loading different dependency graph snapshots. This is useful for:
- Comparing system states before and after package changes
- Tracking dependency evolution over time
- Analyzing different system configurations

To add a new data file:

1. Generate or copy a JSON file to `ui/data/` (e.g., `ui/data/graph-backup.json`)
2. Update `ui/data/files.json` to include the new file:
   ```json
   {
     "files": ["graph.json", "graph-backup.json", "graph-2026-01-25.json"]
   }
   ```
3. Refresh the browser and use the dropdown selector to switch between files

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
    └── data/           # Data files directory
        ├── graph.json  # Dependency data (sample included, regenerate for your system)
        └── files.json  # List of available JSON files
```

## Data Format

The `graph.json` file uses the following schema:

```json
{
  "nodes": {
    "package-name": {
      "explicit": true | false,
      "version": "1.2.3-4",
      "depends_on": ["dependency1", "dependency2"],
      "required_by": ["package1", "package2"]
    }
  }
}
```

- `explicit`: Whether the package was explicitly installed by the user
- `version`: The installed version of the package (from pacman)
- `depends_on`: Direct dependencies (depth 1) of this package
- `required_by`: Packages that directly depend on this package (depth 1)

## Usage Examples

### Export Dependency Data for Analysis

```bash
# Extract specific package information (including version)
jq '.nodes.bash' ui/data/graph.json

# List all explicitly installed packages with versions
jq '.nodes | to_entries | .[] | select(.value.explicit == true) | "\(.key) \(.value.version)"' ui/data/graph.json

# Find packages with no dependencies
jq '.nodes | to_entries | .[] | select(.value.depends_on | length == 0) | .key' ui/data/graph.json

# Find packages not required by anything (potential candidates for removal)
jq '.nodes | to_entries | .[] | select(.value.required_by | length == 0 and .value.explicit == false) | "\(.key) \(.value.version)"' ui/data/graph.json

# Check version of a specific package
jq '.nodes["glibc"].version' ui/data/graph.json
```

### Compare System States

```bash
# Save current state with timestamp
./collect-deps.sh
TIMESTAMP=$(date +%Y-%m-%d)
cp ui/data/graph.json ui/data/graph-${TIMESTAMP}.json

# Update files.json to include the new file
echo '{"files":["graph.json","graph-'${TIMESTAMP}'.json"]}' > ui/data/files.json

# Now you can use the file selector dropdown to switch between snapshots
# The UI will show version changes and package additions/removals

# Compare versions programmatically
jq -r '.nodes | to_entries | .[] | "\(.key): \(.value.version)"' ui/data/graph-${TIMESTAMP}.json > before.txt
# (after system changes)
./collect-deps.sh
jq -r '.nodes | to_entries | .[] | "\(.key): \(.value.version)"' ui/data/graph.json > after.txt
diff before.txt after.txt
```

## Performance

The visualization is optimized for large graphs:

- Tested with 2000+ packages
- Automatic force simulation tuning for >500 nodes
- Efficient rendering with D3.js v7
- Typical browser memory usage: <500MB

## Troubleshooting

### graph.json not found

Make sure you're running the HTTP server from the project root directory and accessing http://localhost:8000/ui/. The data file should be at `ui/data/graph.json`. Run `./collect-deps.sh` to generate it if missing.

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
