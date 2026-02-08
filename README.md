# Manjaro Package Dependency Explorer

A modern, interactive Next.js-based web application for visualizing and exploring package dependencies from pacman-managed systems with dynamic file discovery and timestamped data snapshots.

## Features

- Interactive force-directed graph visualization using D3.js
- Visual distinction between explicitly installed and dependency packages
- Detailed package inspection with version information and dependency lists
- Clickable package names for easy navigation between dependencies
- Visual indicator (orange border) for currently selected package
- Dynamic file discovery with automatic sorting by modification time
- Timestamped JSON files for tracking system changes over time
- Zoom, pan, and drag interactions
- Handles thousands of packages efficiently
- Built with Next.js, React, and TypeScript for type safety and modern development

## Quick Start

### 1. Install Dependencies

First, install the required npm packages:

```bash
cd ui
pnpm install
```

### 2. Generate Dependency Data

Run the collection script to extract package data from your Manjaro system:

```bash
# From project root
./collect-deps.sh
```

This will create a timestamped JSON file like `ui/public/data/graph-2026-01-25-143022.json` containing all installed packages, their versions, and relationships. The process takes approximately 5-15 minutes depending on the number of installed packages.

**Note:** The repository includes a sample `graph.json` for testing the UI without running the full extraction.

### 3. Start the Development Server

```bash
cd ui
pnpm dev
```

Then open http://localhost:3000 in your web browser.

### 4. Explore the Graph

- **Zoom**: Scroll with mouse wheel
- **Pan**: Click and drag the background
- **Inspect Package**: Click on any node to see details in the sidebar (selected node shows orange border)
- **Navigate Dependencies**: Click on any package name in the dependency lists to jump to that package
- **Switch Data Files**: Use the dropdown in the header to load different JSON files (automatically sorted by date, newest first)
- **Reposition Nodes**: Drag individual nodes to rearrange the layout

## Visual Indicators

- **Green Nodes**: Explicitly installed packages (installed by user command)
- **Blue Nodes**: Dependency packages (installed automatically as dependencies)
- **Orange Border**: Currently selected package (whose details are shown in the sidebar)

## Working with Multiple Data Files

The application supports loading different dependency graph snapshots with automatic discovery. This is useful for:

- Comparing system states before and after package changes
- Tracking dependency evolution over time
- Analyzing different system configurations

**Automatic File Discovery:**

Files in `ui/public/data/` are automatically discovered and listed in the dropdown selector. The script generates timestamped filenames, making it easy to track when data was collected:

1. Each time you run `./collect-deps.sh`, a new timestamped file is created (e.g., `graph-2026-01-25-143022.json`)
2. Files are automatically sorted by modification time (newest first)
3. Simply refresh the browser to see new files in the dropdown
4. No manual configuration needed!

## Requirements

### For Data Collection

- Manjaro Linux (or any Arch-based distribution with pacman)
- `pacman` and `pactree` utilities (standard on Arch-based systems)
- Bash shell

### For Development

- Node.js 18+ (for Next.js)
- pnpm (package manager)
- Modern web browser (Chrome, Firefox, Edge, Safari)

## File Structure

```
.
├── AGENTS.md                  # Project specification
├── CLAUDE.md                  # Development guidance for Claude Code
├── README.md                  # This file
├── collect-deps.sh            # Data extraction script
└── ui/                        # Next.js application directory
    ├── app/                   # Next.js App Router
    │   ├── layout.tsx         # Root layout
    │   ├── page.tsx           # Main page
    │   ├── globals.css        # Global styles
    │   └── api/
    │       └── files/
    │           └── route.ts   # API for file discovery
    ├── components/
    │   └── DependencyGraph.tsx  # Graph visualization
    ├── public/
    │   └── data/              # Generated JSON files
    │       └── *.json         # Timestamped dependency data
    ├── package.json           # Dependencies and scripts
    ├── tsconfig.json          # TypeScript config
    └── next.config.js         # Next.js config
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
# Get the most recent data file
LATEST=$(ls -t ui/public/data/graph-*.json | head -1)

# Extract specific package information (including version)
jq '.nodes.bash' "$LATEST"

# List all explicitly installed packages with versions
jq '.nodes | to_entries | .[] | select(.value.explicit == true) | "\(.key) \(.value.version)"' "$LATEST"

# Find packages with no dependencies
jq '.nodes | to_entries | .[] | select(.value.depends_on | length == 0) | .key' "$LATEST"

# Find packages not required by anything (potential candidates for removal)
jq '.nodes | to_entries | .[] | select(.value.required_by | length == 0 and .value.explicit == false) | "\(.key) \(.value.version)"' "$LATEST"

# Check version of a specific package
jq '.nodes["glibc"].version' "$LATEST"
```

### Compare System States

```bash
# Save current state (automatically timestamped)
./collect-deps.sh
# Output: ui/public/data/graph-2026-01-25-143022.json

# Make system changes (install/remove packages)
# ...

# Generate new snapshot
./collect-deps.sh
# Output: ui/public/data/graph-2026-01-25-150530.json

# Files are automatically available in the dropdown selector (sorted by date)
# Compare versions programmatically
OLD=$(ls -t ui/public/data/graph-*.json | tail -2 | head -1)
NEW=$(ls -t ui/public/data/graph-*.json | head -1)

jq -r '.nodes | to_entries | .[] | "\(.key): \(.value.version)"' "$OLD" > before.txt
jq -r '.nodes | to_entries | .[] | "\(.key): \(.value.version)"' "$NEW" > after.txt
diff before.txt after.txt
```

## Performance

The visualization is optimized for large graphs:

- Tested with 2000+ packages
- Automatic force simulation tuning for >500 nodes
- Efficient rendering with D3.js v7
- Typical browser memory usage: <500MB

## Troubleshooting

### No JSON files found

Run `./collect-deps.sh` from the project root to generate a timestamped data file. Make sure it's being created in `ui/public/data/`.

### Cannot find module 'd3' or other dependencies

Make sure you've run `pnpm install` in the `ui/` directory:

```bash
cd ui && pnpm install
```

### Port 3000 already in use

Kill the process using port 3000 or use a different port:

```bash
pnpm dev -- -p 3001
```

### Browser shows blank page

Check the browser console (F12) for errors. Make sure:

1. The dev server is running (`pnpm dev`)
2. You're accessing http://localhost:3000 (not a different port)
3. At least one JSON file exists in `ui/public/data/`

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

- **Data Extraction**: Pure shell script using pacman/pactree with timestamped output
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript 5
- **Visualization**: D3.js v7 force-directed graph
- **API**: Server-side route for dynamic file discovery
- **Architecture**: Three-layer design (extraction → data model → UI)
- **Development**: Hot reload with Next.js dev server, type-safe with TypeScript
- **Package Manager**: pnpm for fast, efficient dependency management

For detailed technical specifications, see [AGENTS.md](AGENTS.md).
