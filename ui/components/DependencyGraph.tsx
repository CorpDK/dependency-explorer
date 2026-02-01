"use client";

import Sidebar from "@/components/graph/Sidebar";
import ZoomControls from "@/components/graph/ZoomControls";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import { PackageNode, ViewProps } from "@/types/package";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

interface PackageLink extends d3.SimulationLinkDatum<PackageNode> {
  source: string | PackageNode;
  target: string | PackageNode;
}

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
  const simulationRef = useRef<d3.Simulation<PackageNode, PackageLink> | null>(
    null,
  );
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 10;
  const ZOOM_STEP = 0.2;

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
          });
        }
      });
    });

    setLinks(newLinks);
  }, [nodes]);

  // Render D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    // Stop and cleanup any existing simulation FIRST
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current.on("tick", null);
      simulationRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom behavior - create or reuse
    let zoom = zoomBehaviorRef.current;
    if (zoom) {
      // Update the zoom callback to use the new 'g' element
      zoom.on("zoom", (event) => {
        g.attr("transform", event.transform);
        setCurrentZoom(event.transform.k);
      });
    } else {
      zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([MIN_ZOOM, MAX_ZOOM])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          setCurrentZoom(event.transform.k);
        });
      zoomBehaviorRef.current = zoom;
    }

    svg.call(zoom);

    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "link");

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, PackageNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("class", (d) => (d.explicit ? "node explicit" : "node dependency"))
      .attr("r", 6)
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        setSidebarHidden(false);
      })
      .call(
        d3
          .drag<SVGCircleElement, PackageNode>()
          .on("start", (event) => {
            if (!event.active && simulationRef.current)
              simulationRef.current.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active && simulationRef.current)
              simulationRef.current.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          }),
      );

    node.append("title").text((d) => d.id);

    // Force simulation with aggressive settings for large graphs
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(50),
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(15));

    // Aggressive optimization for large graphs
    if (nodes.length > 500) {
      simulation.alphaDecay(0.05);
      simulation.velocityDecay(0.6);
    }

    const tickHandler = () => {
      link
        .attr("x1", (d) => (d.source as PackageNode).x || 0)
        .attr("y1", (d) => (d.source as PackageNode).y || 0)
        .attr("x2", (d) => (d.target as PackageNode).x || 0)
        .attr("y2", (d) => (d.target as PackageNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    };

    simulation.on("tick", tickHandler);

    simulation.on("end", () => {
      console.log("Simulation converged and stopped");
    });

    simulationRef.current = simulation;

    const handleResize = () => {
      if (!containerRef.current || !simulation) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      simulation.stop();
      simulation.on("tick", null);
      svg.selectAll("*").remove();
      // Don't remove zoom behavior - we want to keep it for the controls
    };
  }, [nodes, links]);

  // Update selected node visual indicator
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll(".node").classed("selected", false);

    if (selectedNode && !sidebarHidden) {
      svg
        .selectAll(".node")
        .filter((d: any) => d.id === selectedNode.id)
        .classed("selected", true);
    }
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
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomStep: ZOOM_STEP,
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
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
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
