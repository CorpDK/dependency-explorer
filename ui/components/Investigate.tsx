"use client";

import Sidebar from "@/components/graph/Sidebar";
import GraphPanel from "@/components/investigate/GraphPanel";
import PackageListPanel from "@/components/investigate/PackageListPanel";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useForceGraph } from "@/hooks/useForceGraph";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import { ZOOM_CONFIG } from "@/lib/constants";
import { updateDualSelection } from "@/lib/d3Utils";
import { getLinkType } from "@/lib/packageTypeUtils";
import {
  collectPackageTree,
  collectReversePackageTree,
  fuzzyMatch,
  sortPackagesByName,
} from "@/lib/utils";
import {
  DependencyDirection,
  InvestigateFilterType,
  PackageLink,
  PackageNode,
  ViewProps,
} from "@/types/package";
import { useEffect, useMemo, useRef, useState } from "react";

export default function Investigate({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<InvestigateFilterType>("all");
  const [selectedPackage, setSelectedPackage] = useState<PackageNode | null>(
    null,
  );
  const [selectedGraphNode, setSelectedGraphNode] =
    useState<PackageNode | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [direction, setDirection] = useState<DependencyDirection>("forward");
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  // Memoize zoom extent to prevent unnecessary re-renders
  const zoomExtent = useMemo<[number, number]>(
    () => [ZOOM_CONFIG.MIN, ZOOM_CONFIG.MAX],
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

  // Helper to add forward dependency links
  const addForwardLinks = (
    node: PackageNode,
    treePackageIds: Set<string>,
    linkSet: Set<string>,
    subLinks: PackageLink[],
  ) => {
    node.depends_on.forEach((dep) => {
      if (treePackageIds.has(dep)) {
        const linkKey = `${node.id}->${dep}`;
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey);
          subLinks.push({
            source: node.id,
            target: dep,
            type: getLinkType(nodes.find((n) => n.id === dep)!, node),
          });
        }
      }
    });
  };

  // Helper to add reverse dependency links
  const addReverseLinks = (
    node: PackageNode,
    treePackageIds: Set<string>,
    linkSet: Set<string>,
    subLinks: PackageLink[],
  ) => {
    node.required_by.forEach((parent) => {
      if (treePackageIds.has(parent)) {
        const linkKey = `${parent}->${node.id}`;
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey);
          subLinks.push({
            source: parent,
            target: node.id,
            type: getLinkType(nodes.find((n) => n.id === parent)!, node),
          });
        }
      }
    });
  };

  // Get the sub-graph for the selected package
  const subGraphData = useMemo(() => {
    if (!selectedPackage) return { nodes: [], links: [] };

    const treePackageIds = new Set<string>();

    // Collect packages based on direction
    if (direction === "forward") {
      collectPackageTree(selectedPackage.id, nodes, treePackageIds);
    } else if (direction === "reverse") {
      collectReversePackageTree(selectedPackage.id, nodes, treePackageIds);
    } else {
      // Both directions
      collectPackageTree(selectedPackage.id, nodes, treePackageIds);
      const treePackageIdsReverse = new Set<string>();
      collectReversePackageTree(
        selectedPackage.id,
        nodes,
        treePackageIdsReverse,
      );
      treePackageIdsReverse.forEach((id) => treePackageIds.add(id));
    }

    const subNodes = nodes.filter((n) => treePackageIds.has(n.id));
    const subLinks: PackageLink[] = [];
    const linkSet = new Set<string>();

    // Build links based on direction
    subNodes.forEach((node) => {
      if (direction === "forward" || direction === "both") {
        addForwardLinks(node, treePackageIds, linkSet, subLinks);
      }

      if (direction === "reverse" || direction === "both") {
        addReverseLinks(node, treePackageIds, linkSet, subLinks);
      }
    });

    return { nodes: subNodes, links: subLinks };
  }, [selectedPackage, nodes, direction]);

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
    updateDualSelection(
      svgRef,
      selectedPackage?.id ?? null,
      selectedGraphNode?.id ?? null,
      sidebarHidden,
    );
  }, [selectedGraphNode, sidebarHidden, selectedPackage, subGraphData.nodes]);

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
      minZoom: ZOOM_CONFIG.MIN,
      maxZoom: ZOOM_CONFIG.MAX,
      zoomStep: ZOOM_CONFIG.STEP,
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
      <PackageListPanel
        nodes={nodes}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterChange={setFilterType}
        filteredPackages={filteredPackages}
        selectedPackage={selectedPackage}
        onPackageSelect={setSelectedPackage}
      />

      {/* Center Panel - Sub-Graph */}
      <GraphPanel
        selectedPackage={selectedPackage}
        subGraphData={subGraphData}
        containerRef={containerRef}
        svgRef={svgRef}
        currentZoom={currentZoom}
        minZoom={ZOOM_CONFIG.MIN}
        maxZoom={ZOOM_CONFIG.MAX}
        direction={direction}
        onDirectionChange={setDirection}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomChange={handleZoomChange}
        onZoomReset={handleZoomReset}
      />

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
