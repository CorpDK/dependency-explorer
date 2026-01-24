# Manjaro Package Dependency Graph Explorer

## Role

You are a senior systems engineer and frontend engineer combined.
Your task is to generate a complete, working system that extracts package
dependency data from a Manjaro (pacman-based) Linux system and presents it
as a modern, interactive, browser-based dependency graph.

You MUST strictly follow this specification.
Do NOT simplify, omit, or replace technologies unless explicitly allowed.

---

## Problem Statement

Traditional dependency visualization tools (Graphviz / dot) are outdated,
static, and unsuitable for large-scale interactive exploration.

We need a modern, JSON-driven, browser-rendered dependency explorer that
allows deep inspection of pacman-installed packages and their relationships.

---

## High-Level Architecture

The system MUST consist of three layers:

1. **Data Extraction Layer (Shell)**
2. **Graph Data Model (JSON)**
3. **Interactive Browser UI (HTML + JS)**

The output must be fully static and runnable locally without a backend server.

---

## 1. Data Extraction Layer

### Environment

- OS: Manjaro Linux
- Package manager: pacman
- Tools available:

  - pacman
  - pactree
  - bash
  - coreutils

### Responsibilities

- Extract ALL installed packages
- Identify explicitly installed packages
- Identify dependency-installed packages
- Extract:

  - Direct dependencies
  - Direct reverse dependencies

### Constraints

- Do NOT use Graphviz
- Do NOT use Python, Go, or Node for extraction
- Use ONLY shell scripting + pacman tooling

---

### Required Script: `collect-deps.sh`

The script MUST:

- Generate a single JSON file at `ui/data/graph.json`
- Include **every installed package**
- Correctly mark packages as:

  - explicitly installed
  - dependency-installed
- Include package version information

#### JSON Schema (MANDATORY)

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

Rules:

- `explicit` = true if package was explicitly installed, false if dependency
- `version` = package version string from pacman (e.g., "1.2.3-4")
- `depends_on` = direct dependencies only (depth 1)
- `required_by` = direct reverse dependencies only (depth 1)
- Missing relationships MUST be empty arrays, not null
- JSON must be valid and deterministic

---

## 2. Graph Data Model

The JSON output MUST support computation of:

- Explicit vs dependency-installed packages
- Number of dependencies per package
- Number of reverse dependencies per package
- Full graph traversal in both directions

The frontend MUST NOT re-run pacman commands.
All computation must be derived from `ui/graph.json`.

---

## 3. Browser UI Layer

### Technology Choices (MANDATORY)

- HTML5
- CSS3
- JavaScript (ES6+)
- D3.js v7 (or newer)

### Code Organization

The UI should be organized in a modular fashion:

- **Separate files recommended**: Split HTML, CSS, and JavaScript for better maintainability
- **All files in `ui/` directory**: Keep web interface files organized together
- **index.html**: Main entry point that loads styles and scripts
- **styles.css**: All styling, layout, animations, and responsive design
- **app.js**: Application logic including D3.js visualization and interactions

### Forbidden

- Graphviz
- Cytoscape (unless explicitly requested later)
- jQuery
- React / Vue / Angular

---

## UI Requirements

### Core Features (MANDATORY)

1. **Graph Visualization**

   - Force-directed graph
   - Zoom and pan
   - Clickable nodes
   - Smooth interaction for large graphs

2. **Node Classification**

   - Explicit packages: visually distinct (e.g. green)
   - Dependency packages: visually distinct (e.g. blue)

3. **Sidebar / Inspector Panel**
   On node click, show:

   - Package name
   - Package version
   - Explicit or dependency-installed
   - Number of dependencies
   - Number of reverse dependencies
   - List of dependencies (clickable for navigation)
   - List of reverse dependencies (clickable for navigation)

4. **Graph Browsing**

   - Navigate the entire dependency graph
   - Drag nodes
   - Explore relationships interactively
   - Visual indicator (orange border) for currently selected node
   - Click package names in dependency lists to navigate between packages

5. **Multiple Data Files**

   - File selector dropdown to switch between different JSON data files
   - Data files stored in `ui/data/` directory
   - Manifest file (`ui/data/files.json`) lists available data files

---

## Performance Constraints

- Must handle thousands of nodes
- Must not freeze the browser on load
- Should degrade gracefully on weaker machines

---

## Deliverables

The agent MUST generate:

```
.
├── collect-deps.sh   # Data extraction script
└── ui/               # Web interface directory
    ├── index.html    # Main HTML page
    ├── styles.css    # Stylesheet
    ├── app.js        # Application logic
    └── data/         # Data files directory
        ├── graph.json   # Generated dependency data (sample included)
        └── files.json   # List of available JSON files
```

**Note**: While the specification originally called for a single `index.html` file,
the implementation uses a modular structure with separate HTML, CSS, and JavaScript
files for better maintainability. The data files are organized in a `ui/data/`
subdirectory to support multiple graph snapshots. This does not change the core
functionality or requirements.

Instructions for running locally MUST be included:

1. Generate data: `./collect-deps.sh`
2. Start HTTP server: `python3 -m http.server 8000`
3. Open browser: http://localhost:8000/ui/

---

## Explicit Non-Goals (DO NOT IMPLEMENT)

- Package installation or removal
- Modifying pacman databases
- Live system monitoring
- Network services or APIs
- Authentication
- Cloud deployment

---

## Scope for Future Improvements

The agent MUST include a section describing **possible future upgrades**,
but MUST NOT implement them unless explicitly requested.

### Graph & UI Enhancements

- Search / fuzzy search
- Node filtering (explicit only, leaf nodes, etc.)
- Collapsing dependency subtrees
- Highlight orphaned dependency chains
- Visual clustering (desktop / dev / system)

### Data & Analysis

- Dependency depth calculation
- Orphan detection
- “Safe to remove” simulations
- Package impact analysis

### Performance

- WebGL rendering (e.g. PixiJS)
- Virtualized rendering
- Progressive graph loading

### Export & Interop

- JSON schema versioning
- CSV export
- Subgraph export
- Integration with other package managers

---

## Output Quality Bar

- Code must be clean, readable, and commented
- No placeholders or pseudocode
- No TODOs
- Must run as-is on Manjaro
- Must strictly adhere to this document

Failure to comply with any section is considered incorrect output.
