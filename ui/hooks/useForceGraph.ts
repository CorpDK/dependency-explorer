import { PackageLink, PackageNode } from "@/types/package";
import * as d3 from "d3";
import { useEffect, useRef } from "react";

interface UseForceGraphProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodes: PackageNode[];
  links: PackageLink[];
  onNodeClick: (node: PackageNode) => void;
  highlightedNodeId?: string;
  // Advanced options
  zoomBehaviorRef?: React.RefObject<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>;
  zoomExtent?: [number, number];
  onZoomChange?: (scale: number) => void;
  enableResize?: boolean;
  nodeRadius?: number;
  linkDistance?: number;
  chargeStrength?: number;
  collisionRadius?: number;
  performanceOptimization?: boolean;
  showNodeTitle?: boolean;
}

export function useForceGraph({
  svgRef,
  containerRef,
  nodes,
  links,
  onNodeClick,
  highlightedNodeId,
  zoomBehaviorRef,
  zoomExtent = [0.1, 10],
  onZoomChange,
  enableResize = false,
  nodeRadius = 6,
  linkDistance = 80,
  chargeStrength = -200,
  collisionRadius = 20,
  performanceOptimization = false,
  showNodeTitle = true,
}: UseForceGraphProps) {
  const simulationRef = useRef<d3.Simulation<PackageNode, PackageLink> | null>(
    null,
  );
  const onNodeClickRef = useRef(onNodeClick);
  const onZoomChangeRef = useRef(onZoomChange);

  // Keep callback refs up to date
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
    onZoomChangeRef.current = onZoomChange;
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    // Stop existing simulation
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
    let zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
    if (zoomBehaviorRef?.current) {
      zoom = zoomBehaviorRef.current;
      zoom.on("zoom", (event) => {
        g.attr("transform", event.transform);
        onZoomChangeRef.current?.(event.transform.k);
      });
    } else {
      zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent(zoomExtent)
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
          onZoomChangeRef.current?.(event.transform.k);
        });
      if (zoomBehaviorRef) {
        zoomBehaviorRef.current = zoom;
      }
    }

    svg.call(zoom);

    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("class", (d) =>
        d.type === "explicit" ? "link link-explicit" : "link link-dependency",
      );

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, PackageNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("class", (d) => (d.explicit ? "node explicit" : "node dependency"))
      .attr("r", (d) =>
        highlightedNodeId && d.id === highlightedNodeId
          ? nodeRadius * 1.67
          : nodeRadius,
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClickRef.current(d);
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

    if (showNodeTitle) {
      node.append("title").text((d) => `${d.id}\nv${d.version}`);
    }

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(linkDistance),
      )
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(collisionRadius));

    // Performance optimization for large graphs
    if (performanceOptimization && nodes.length > 500) {
      simulation.alphaDecay(0.05);
      simulation.velocityDecay(0.6);
    }

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as PackageNode).x || 0)
        .attr("y1", (d) => (d.source as PackageNode).y || 0)
        .attr("x2", (d) => (d.target as PackageNode).x || 0)
        .attr("y2", (d) => (d.target as PackageNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    });

    if (performanceOptimization) {
      simulation.on("end", () => {
        // Simulation converged and stopped
      });
    }

    simulationRef.current = simulation;

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current || !simulation) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    };

    if (enableResize) {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (enableResize) {
        window.removeEventListener("resize", handleResize);
      }
      simulation.stop();
      simulation.on("tick", null);
      svg.selectAll("*").remove();
    };
  }, [
    svgRef,
    containerRef,
    nodes,
    links,
    highlightedNodeId,
    zoomBehaviorRef,
    zoomExtent,
    enableResize,
    nodeRadius,
    linkDistance,
    chargeStrength,
    collisionRadius,
    performanceOptimization,
    showNodeTitle,
  ]);

  return simulationRef;
}
