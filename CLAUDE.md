# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Manjaro Package Dependency Graph Explorer** - a static, browser-based tool for visualizing and exploring package dependencies from pacman-managed systems.

**CRITICAL**: The complete project specification is in [AGENTS.md](AGENTS.md). All implementation decisions MUST strictly follow that specification. Read it thoroughly before making any changes.

## Architecture

The system has three mandatory layers:

1. **Data Extraction Layer** - Shell script (`collect-deps.sh`) that queries pacman and generates `graph.json`
2. **Graph Data Model** - JSON structure containing all packages, dependencies, and metadata
3. **Browser UI** - Static HTML/CSS/JS using D3.js for interactive force-directed graph visualization

## Mandatory Technology Stack

### Required

- Shell scripting (bash + pacman/pactree) for data extraction
- D3.js v7+ for graph visualization
- Vanilla JavaScript (ES6+)
- HTML5 + CSS3

### Forbidden

- Graphviz/dot (outdated static visualization)
- Backend servers (must be fully static)
- Python/Go/Node for extraction layer
- React/Vue/Angular
- jQuery
- Cytoscape (unless explicitly requested)

## File Structure

```
.
├── AGENTS.md           # Project specification (source of truth)
├── CLAUDE.md          # This file
├── README.md          # User documentation
├── collect-deps.sh    # Shell script for extracting package data
└── ui/                # Web interface directory
    ├── index.html     # Main HTML page
    ├── styles.css     # Stylesheet
    ├── app.js         # Application logic (DependencyGraph class)
    └── data/          # Data files directory
        ├── graph.json # Generated dependency data
        └── files.json # List of available JSON files
```

## JSON Schema

The `ui/data/graph.json` file MUST follow this exact structure:

```json
{
  "nodes": {
    "package-name": {
      "explicit": true | false,
      "version": "1.2.3-4",
      "depends_on": ["pkg1", "pkg2"],
      "required_by": ["pkg3", "pkg4"]
    }
  }
}
```

**Critical Rules:**

- `explicit` = true if package was explicitly installed, false if dependency
- `version` = package version string from pacman (format: "epoch:version-release" or "version-release")
- `depends_on` = direct dependencies only (depth 1, not transitive)
- `required_by` = direct reverse dependencies only (depth 1)
- Empty relationships must be `[]`, never `null`
- All installed packages must be included

## Implementation Guidance

### Data Extraction (`collect-deps.sh`)

- Use `pacman -Qq` to list all installed packages
- Use `pacman -Q` to get package versions
- Use `pacman -Qe` to identify explicitly installed packages
- Use `pactree -d1` for direct dependencies
- Use `pactree -r -d1` for reverse dependencies
- Generate valid, deterministic JSON
- Output to `ui/data/graph.json`

### Browser UI (`ui/` directory)

The UI is split into separate files for better maintainability:

- **index.html**: Main HTML structure with header, graph container, and sidebar
- **styles.css**: All styling including layout, colors, animations, and responsive design
- **app.js**: DependencyGraph class with data loading, D3.js visualization, and interaction logic

Must implement:

- Force-directed graph with zoom/pan
- Visual distinction between explicit (green #4CAF50) and dependency (blue #2196F3) packages
- Clickable nodes that show detailed info in a sidebar/inspector
- Package name, version, type, dependency counts, and full dependency/reverse-dependency lists
- Clickable package names in dependency lists for easy navigation
- Visual indicator (orange border #FF9800) for currently selected node
- File selector dropdown to switch between different data files
- Smooth performance with thousands of nodes

### Performance Considerations

- Must handle large graphs (1000+ nodes) without freezing
- Consider throttling/debouncing for interactive updates
- D3 force simulation should use appropriate alpha decay for large datasets

## Development Workflow

Since this targets Manjaro Linux with pacman:

- Test `collect-deps.sh` on actual Manjaro system or use sample data
- The browser UI should work on any system with a modern browser
- No build tools required (static HTML/CSS/JS)

To test the complete system:

1. Run `./collect-deps.sh` to generate `ui/data/graph.json`
2. Start HTTP server: `python3 -m http.server 8000`
3. Open http://localhost:8000/ui/ in a browser
4. Verify graph renders and interactions work
5. Test file selector by creating additional JSON files in `ui/data/` and updating `ui/data/files.json`

**Note**: The UI files must be served via HTTP server (not file://) for fetch() to work correctly.

### Key Implementation Details

**Visual Feedback:**
- Selected nodes show an orange border (4px, #FF9800)
- Closing the sidebar clears the selected node indicator
- Hover states provide immediate feedback

**Navigation:**
- Clicking package names in dependency/required-by lists navigates to that package
- Updates sidebar content and selected node indicator
- Enables quick exploration of dependency chains

**Multiple Data Files:**
- `ui/data/files.json` acts as a manifest listing available JSON files
- File selector dropdown dynamically populated from this manifest
- Switching files clears and re-renders the entire graph

## Scope Boundaries

**DO NOT implement these** unless explicitly requested:

- Package installation/removal functionality
- Modifying pacman databases
- Live system monitoring
- Network services/APIs
- Authentication
- Cloud deployment

**Future enhancements are documented in AGENTS.md** but should not be implemented proactively.

## Code Quality Requirements

- No placeholders or pseudocode
- No TODO comments
- Must be production-ready and runnable as-is
- Clean, readable code with appropriate comments
- Strict adherence to the specification in AGENTS.md
