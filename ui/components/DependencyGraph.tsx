"use client";

import Sidebar from "@/components/graph/Sidebar";
import ZoomControls from "@/components/graph/ZoomControls";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useForceGraph } from "@/hooks/useForceGraph";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import { ZOOM_CONFIG } from "@/lib/constants";
import { updateNodeSelection } from "@/lib/d3Utils";
import { getLinkType } from "@/lib/packageTypeUtils";
import { PackageLink, PackageNode, ViewProps } from "@/types/package";
import { useEffect, useMemo, useRef, useState } from "react";

export default function DependencyGraph({
  nodes,
  loading,
  error,
}: Readonly<ViewProps>) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<PackageLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<PackageNode | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  // Memoize zoom extent to prevent unnecessary re-renders
  const zoomExtent = useMemo<[number, number]>(
    () => [ZOOM_CONFIG.MIN, ZOOM_CONFIG.MAX],
    [],
  );

  // Transform nodes to links when nodes change
  useEffect(() => {
    if (nodes.length === 0) {
      setLinks([]);
      return;
    }

    const newLinks: PackageLink[] = [];
    const nodeMap = new Map<string, number>();

    nodes.forEach((node, index) => {
      nodeMap.set(node.id, index);
    });

    nodes.forEach((node) => {
      node.depends_on.forEach((dep) => {
        if (nodeMap.has(dep)) {
          newLinks.push({
            source: node.id,
            target: dep,
            type: getLinkType(node),
          });
        }
      });
    });

    setLinks(newLinks);
  }, [nodes]);

  // Handle node click
  const handleNodeClick = (node: PackageNode) => {
    setSelectedNode(node);
    setSidebarHidden(false);
  };

  // Render D3 visualization using extended hook
  useForceGraph({
    svgRef,
    containerRef,
    nodes,
    links,
    onNodeClick: handleNodeClick,
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

  // Update selected node visual indicator
  useEffect(() => {
    updateNodeSelection(svgRef, selectedNode?.id ?? null, sidebarHidden);
  }, [selectedNode, sidebarHidden]);

  const handlePackageClick = (packageName: string) => {
    const node = nodes.find((n) => n.id === packageName);
    if (node) {
      setSelectedNode(node);
      setSidebarHidden(false);
    }
  };

  const handleSidebarClose = () => {
    setSidebarHidden(true);
    setSelectedNode(null);
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
    return <LoadingState message="Loading dependency graph..." />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (nodes.length === 0) {
    return (
      <EmptyState message="Please select a data file from the dropdown above to visualize the dependency graph." />
    );
  }

  return (
    <div className="h-full w-full flex overflow-hidden relative bg-zinc-50 dark:bg-zinc-900">
      <div className="flex-1 relative" ref={containerRef}>
        <svg
          className="w-full h-full cursor-grab active:cursor-grabbing pointer-events-auto"
          ref={svgRef}
        ></svg>
        <ZoomControls
          currentZoom={currentZoom}
          minZoom={ZOOM_CONFIG.MIN}
          maxZoom={ZOOM_CONFIG.MAX}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomChange={handleZoomChange}
          onReset={handleZoomReset}
        />
      </div>
      <Sidebar
        isHidden={sidebarHidden}
        selectedNode={selectedNode}
        onClose={handleSidebarClose}
        onPackageClick={handlePackageClick}
      />
    </div>
  );
}
