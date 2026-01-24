# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Manjaro Package Dependency Graph Explorer** - a Next.js-based web application for visualizing and exploring package dependencies from pacman-managed systems with dynamic file discovery and timestamped data snapshots.

**CRITICAL**: The complete project specification is in [AGENTS.md](AGENTS.md). All implementation decisions MUST strictly follow that specification. Read it thoroughly before making any changes.

## Architecture

The system has three mandatory layers:

1. **Data Extraction Layer** - Shell script (`collect-deps.sh`) that queries pacman and generates timestamped JSON files
2. **Graph Data Model** - JSON structure containing all packages, dependencies, and metadata
3. **Browser UI** - Next.js + React + TypeScript application using D3.js for interactive force-directed graph visualization

## Mandatory Technology Stack

### Required

- Shell scripting (bash + pacman/pactree) for data extraction
- Next.js 14+ with App Router
- React 18+
- TypeScript 5+
- D3.js v7+ (npm package) for graph visualization

### Forbidden

- Graphviz/dot (outdated static visualization)
- Python/Go/Node for extraction layer
- Vue/Angular
- jQuery
- Cytoscape (unless explicitly requested)

## File Structure

```
.
├── AGENTS.md                  # Project specification (source of truth)
├── CLAUDE.md                  # This file
├── README.md                  # User documentation
├── collect-deps.sh            # Shell script for extracting package data
└── ui/                        # Next.js application directory
    ├── app/                   # Next.js App Router directory
    │   ├── layout.tsx         # Root layout with metadata
    │   ├── page.tsx           # Main page (renders DependencyGraph)
    │   ├── globals.css        # Global styles
    │   └── api/
    │       └── files/
    │           └── route.ts   # Dynamic file listing API
    ├── components/
    │   └── DependencyGraph.tsx  # Main graph visualization component
    ├── public/
    │   └── data/              # Static data files
    │       └── *.json         # Timestamped dependency data
    ├── package.json           # NPM dependencies and scripts
    ├── tsconfig.json          # TypeScript configuration
    ├── next.config.js         # Next.js configuration
    ├── next-env.d.ts          # Next.js TypeScript declarations
    ├── pnpm-lock.yaml         # pnpm lockfile
    └── .gitignore             # Git ignore rules
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
- Output to `ui/public/data/graph-YYYY-MM-DD-HHMMSS.json` with timestamp
- Create output directory if it doesn't exist

### Next.js Application (`ui/` directory)

The application follows Next.js App Router conventions:

#### API Routes
- **app/api/files/route.ts**: Server-side endpoint that reads `public/data/` directory and returns list of JSON files sorted by modification time

#### React Components
- **components/DependencyGraph.tsx**: Client-side React component ("use client") containing:
  - D3.js force-directed graph visualization
  - React hooks for state management (useState, useEffect, useRef)
  - Data fetching from `/api/files` and `/data/{filename}`
  - All visualization and interaction logic

#### Styling
- **app/globals.css**: Global CSS with all styling for graph, nodes, sidebar, etc.

Must implement:

- Force-directed graph with zoom/pan using D3.js
- Visual distinction between explicit (green #4CAF50) and dependency (blue #2196F3) packages
- Clickable nodes that show detailed info in a sidebar
- Package name, version, type, dependency counts, and full dependency/reverse-dependency lists
- Clickable package names in dependency lists for easy navigation
- Visual indicator (orange border #FF9800) for currently selected node
- File selector dropdown that fetches files dynamically from API
- Smooth performance with thousands of nodes
- TypeScript type safety for all data structures

### Performance Considerations

- Must handle large graphs (1000+ nodes) without freezing
- Consider throttling/debouncing for interactive updates
- D3 force simulation should use appropriate alpha decay for large datasets

## Development Workflow

Since this targets Manjaro Linux with pacman:

- Test `collect-deps.sh` on actual Manjaro system or use sample data
- The Next.js application works on any system with Node.js and a modern browser
- Uses pnpm for package management

To test the complete system:

1. Install dependencies: `cd ui && pnpm install`
2. Run `./collect-deps.sh` from project root to generate timestamped JSON file
3. Start dev server: `cd ui && pnpm dev`
4. Open http://localhost:3000 in a browser
5. Verify graph renders and interactions work
6. Test file selector - it automatically discovers all JSON files in `public/data/`

To build for production:

```bash
cd ui && pnpm build
cd ui && pnpm start  # Production server on port 3000
```

### Key Implementation Details

**Visual Feedback:**
- Selected nodes show an orange border (4px, #FF9800)
- Closing the sidebar clears the selected node indicator
- Hover states provide immediate feedback

**Navigation:**
- Clicking package names in dependency/required-by lists navigates to that package
- Updates sidebar content and selected node indicator
- Enables quick exploration of dependency chains

**Dynamic File Discovery:**
- `/api/files` endpoint reads `public/data/` directory at runtime
- Files sorted by modification time (newest first)
- No manual manifest file needed
- File selector dropdown populated automatically on page load
- Timestamped filenames make it easy to identify when data was collected

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
