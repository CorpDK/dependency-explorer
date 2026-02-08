# Manjaro Package Dependency Graph Explorer

## Role

You are a senior systems engineer and full-stack engineer combined.
Your task is to generate a complete, working system that extracts package
dependency data from a Manjaro (pacman-based) Linux system and presents it
as a modern, interactive, browser-based dependency graph using Next.js.

You MUST strictly follow this specification.
Do NOT simplify, omit, or replace technologies unless explicitly allowed.

---

## Problem Statement

Traditional dependency visualization tools (Graphviz / dot) are outdated,
static, and unsuitable for large-scale interactive exploration.

We need a modern, JSON-driven, browser-rendered dependency explorer that
allows deep inspection of pacman-installed packages and their relationships,
with dynamic file discovery and timestamped data snapshots.

---

## High-Level Architecture

The system MUST consist of three layers:

1. **Data Extraction Layer (Shell)**
2. **Graph Data Model (JSON)**
3. **Interactive Browser UI (Next.js + React + TypeScript)**

The application uses Next.js for server-side API routes and client-side rendering.

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

- Generate timestamped JSON files at `ui/public/data/graph-YYYY-MM-DD-HHMMSS.json`
- Include **every installed package**
- Correctly mark packages as:
  - explicitly installed
  - dependency-installed

- Include package version information
- Create output directory if it doesn't exist

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
All computation must be derived from JSON files in `ui/public/data/`.

Files are discovered dynamically via the `/api/files` endpoint, eliminating
the need for a manual manifest file.

---

## 3. Browser UI Layer

### Technology Choices (MANDATORY)

- Next.js 14+ (App Router)
- React 18+
- TypeScript 5+
- D3.js v7 (npm package, not CDN)
- CSS3 (CSS Modules or global styles)

### Code Organization

The UI follows Next.js App Router conventions:

- **app/**: Next.js App Router directory
  - **layout.tsx**: Root layout with metadata
  - **page.tsx**: Main page component
  - **globals.css**: Global styles
  - **api/files/route.ts**: API endpoint for dynamic file discovery
- **components/**: React components
  - **DependencyGraph.tsx**: Main graph visualization component
- **public/data/**: Static data files (timestamped JSON files)

### Forbidden

- Graphviz
- Cytoscape (unless explicitly requested later)
- jQuery
- Vue / Angular / Other frameworks

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
   - Data files stored in `ui/public/data/` directory
   - Files discovered dynamically via `/api/files` API endpoint
   - Files sorted by modification time (newest first)
   - Timestamped filenames for easy identification

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
├── collect-deps.sh            # Data extraction script
└── ui/                        # Next.js application directory
    ├── app/                   # Next.js App Router directory
    │   ├── layout.tsx         # Root layout
    │   ├── page.tsx           # Main page
    │   ├── globals.css        # Global styles
    │   └── api/
    │       └── files/
    │           └── route.ts   # Dynamic file listing API
    ├── components/
    │   └── DependencyGraph.tsx  # Main graph component
    ├── public/
    │   └── data/              # Generated JSON files
    │       └── graph-*.json   # Timestamped dependency data
    ├── package.json           # NPM dependencies
    ├── tsconfig.json          # TypeScript configuration
    ├── next.config.js         # Next.js configuration
    └── .gitignore             # Git ignore rules
```

Instructions for running locally MUST be included:

1. Install dependencies: `cd ui && pnpm install`
2. Generate data: `./collect-deps.sh` (from project root)
3. Start dev server: `cd ui && pnpm dev`
4. Open browser: http://localhost:3000

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

### Next.js-Specific

- Server-side rendering for initial graph state
- API routes for package search
- Static export for deployment
- Incremental Static Regeneration for data updates

---

## Output Quality Bar

- Code must be clean, readable, and commented
- No placeholders or pseudocode
- No TODOs
- Must run as-is on Manjaro
- Must strictly adhere to this document

Failure to comply with any section is considered incorrect output.
