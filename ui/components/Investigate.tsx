"use client";

import { PackageNode, PackageLink, ViewProps } from "@/types/package";
import { fuzzyMatch, collectPackageTree, sortPackagesByName } from "@/lib/utils";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import SearchInput from "@/components/ui/SearchInput";
import PackageItem from "@/components/ui/PackageItem";
import FilterButton from "@/components/ui/FilterButton";
import Sidebar from "@/components/graph/Sidebar";
import ZoomControls from "@/components/graph/ZoomControls";
import { useForceGraph } from "@/hooks/useForceGraph";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";

type FilterType = "all" | "explicit" | "dependency";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP = 0.2;

export default function Investigate({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedPackage, setSelectedPackage] = useState<PackageNode | null>(
    null,
  );
  const [selectedGraphNode, setSelectedGraphNode] =
    useState<PackageNode | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );

  // Memoize zoom extent to prevent unnecessary re-renders
  const zoomExtent = useMemo<[number, number]>(
    () => [MIN_ZOOM, MAX_ZOOM],
    [],
  );

  // Filter packages based on search and type filter
  const filteredPackages = useMemo(() => {
    let filtered = nodes.filter((n) => fuzzyMatch(searchQuery, n.id));

    if (filterType === "explicit") {
      filtered = filtered.filter((n) => n.explicit);
    } else if (filterType === "dependency") {
      filtered = filtered.filter((n) => !n.explicit);
    }

    return sortPackagesByName(filtered);
  }, [nodes, searchQuery, filterType]);

  // Get the sub-graph for the selected package
  const subGraphData = useMemo(() => {
    if (!selectedPackage) return { nodes: [], links: [] };

    const treePackageIds = new Set<string>();
    collectPackageTree(selectedPackage.id, nodes, treePackageIds);

    const subNodes = nodes.filter((n) => treePackageIds.has(n.id));
    const subLinks: PackageLink[] = [];

    subNodes.forEach((node) => {
      node.depends_on.forEach((dep) => {
        if (treePackageIds.has(dep)) {
          subLinks.push({
            source: node.id,
            target: dep,
            type: node.explicit ? "explicit" : "dependency",
          });
        }
      });
    });

    return { nodes: subNodes, links: subLinks };
  }, [selectedPackage, nodes]);

  // Handle node click
  const handleNodeClick = (node: PackageNode) => {
    setSelectedGraphNode(node);
    setSidebarHidden(false);
  };

  // Render D3 sub-graph using custom hook
  useForceGraph({
    svgRef,
    containerRef,
    nodes: subGraphData.nodes,
    links: subGraphData.links,
    onNodeClick: handleNodeClick,
    highlightedNodeId: selectedPackage?.id,
    zoomBehaviorRef,
    zoomExtent,
    onZoomChange: setCurrentZoom,
    enableResize: true,
    nodeRadius: 6,
    linkDistance: 50,
    chargeStrength: -100,
    collisionRadius: 15,
    performanceOptimization: true,
    showNodeTitle: true,
  });

  // Update selected node visual indicators
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear all selection classes
    svg.selectAll(".node").classed("selected", false).classed("list-selected", false);

    // Highlight the node selected from the list (root of the tree)
    if (selectedPackage) {
      svg
        .selectAll(".node")
        .filter((d: any) => d.id === selectedPackage.id)
        .classed("list-selected", true);
    }

    // Highlight the node clicked in the graph (shown in sidebar)
    if (selectedGraphNode && !sidebarHidden) {
      svg
        .selectAll(".node")
        .filter((d: any) => d.id === selectedGraphNode.id)
        .classed("selected", true);
    }
  }, [selectedGraphNode, sidebarHidden, selectedPackage]);

  const handleGraphPackageClick = (packageName: string) => {
    const node = subGraphData.nodes.find((n) => n.id === packageName);
    if (node) {
      setSelectedGraphNode(node);
      setSidebarHidden(false);
    }
  };

  const handleSidebarClose = () => {
    setSidebarHidden(true);
    setSelectedGraphNode(null);
  };

  const { handleZoomIn, handleZoomOut, handleZoomChange, handleZoomReset } =
    useZoomHandlers({
      svgRef,
      zoomBehaviorRef,
      currentZoom,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomStep: ZOOM_STEP,
    });

  if (loading) {
    return <LoadingState message="Loading packages..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (nodes.length === 0) {
    return (
      <EmptyState message="Please select a data file from the dropdown above to investigate packages." />
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      {/* Left Panel - Package List */}
      <div className="w-96 flex flex-col border-r border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="p-4 border-b border-zinc-300 dark:border-zinc-700">
          <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100">
            Investigate Packages
          </h2>

          {/* Search Input */}
          <SearchInput
            placeholder="Search packages..."
            value={searchQuery}
            onChange={setSearchQuery}
            ringColor="ring-blue-500"
          />

          {/* Filter Buttons */}
          <div className="flex gap-2 mt-3">
            <FilterButton
              active={filterType === "all"}
              onClick={() => setFilterType("all")}
            >
              All ({nodes.length})
            </FilterButton>
            <FilterButton
              active={filterType === "explicit"}
              onClick={() => setFilterType("explicit")}
            >
              Explicit ({nodes.filter((n) => n.explicit).length})
            </FilterButton>
            <FilterButton
              active={filterType === "dependency"}
              onClick={() => setFilterType("dependency")}
            >
              Dependencies ({nodes.filter((n) => !n.explicit).length})
            </FilterButton>
          </div>
        </div>

        {/* Package List */}
        <div className="flex-1 overflow-y-auto">
          {filteredPackages.length === 0 ? (
            <div className="text-center text-zinc-500 dark:text-zinc-500 italic text-sm py-8">
              No packages match your criteria
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {filteredPackages.map((pkg) => (
                <li key={pkg.id}>
                  <PackageItem
                    pkg={pkg}
                    variant={pkg.explicit ? "explicit" : "dependency"}
                    isHighlighted={selectedPackage?.id === pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    extraInfo={
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                        {pkg.depends_on.length} deps, {pkg.required_by.length}{" "}
                        parents
                      </div>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Center Panel - Sub-Graph */}
      <div className="flex-1 flex flex-col">
        {selectedPackage ? (
          <>
            <div className="p-4 border-b border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Dependency Tree: {selectedPackage.id}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Showing {subGraphData.nodes.length} packages in the tree (
                {subGraphData.links.length} connections)
              </p>
            </div>
            <div className="flex-1 relative" ref={containerRef}>
              <svg
                className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
                ref={svgRef}
              ></svg>
              <ZoomControls
                currentZoom={currentZoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomChange={handleZoomChange}
                onReset={handleZoomReset}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-zinc-500 dark:text-zinc-500">
              <p className="text-lg mb-2">Select a package to investigate</p>
              <p className="text-sm">
                The dependency tree will show all connected packages
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Sidebar */}
      {selectedPackage && (
        <Sidebar
          isHidden={sidebarHidden}
          selectedNode={selectedGraphNode}
          onClose={handleSidebarClose}
          onPackageClick={handleGraphPackageClick}
        />
      )}
    </div>
  );
}
