"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Type definitions for package data
interface PackageInfo {
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

interface RawGraphData {
  nodes: {
    [packageName: string]: PackageInfo;
  };
}

interface PackageNode extends d3.SimulationNodeDatum {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

interface PackageLink extends d3.SimulationLinkDatum<PackageNode> {
  source: string | PackageNode;
  target: string | PackageNode;
}

interface GraphData {
  nodes: PackageNode[];
  links: PackageLink[];
}

export default function DependencyGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [nodes, setNodes] = useState<PackageNode[]>([]);
  const [links, setLinks] = useState<PackageLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<PackageNode | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const simulationRef = useRef<d3.Simulation<PackageNode, PackageLink> | null>(null);

  // Fetch available JSON files
  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch("/api/files");
        const data = await response.json();
        setFiles(data.files || []);
      } catch (err) {
        console.error("Error fetching files:", err);
        setError("Failed to load available files");
      }
    }
    fetchFiles();
  }, []);

  // Load data when selected file changes
  useEffect(() => {
    if (!selectedFile) return;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/data/${selectedFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${selectedFile}`);
        }
        const rawData: RawGraphData = await response.json();
        const graphData = transformData(rawData);
        setNodes(graphData.nodes);
        setLinks(graphData.links);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFile]);

  // Transform raw data to graph format
  function transformData(rawData: RawGraphData): GraphData {
    const nodes: PackageNode[] = [];
    const links: PackageLink[] = [];
    const nodeMap = new Map<string, number>();

    if (!rawData.nodes || typeof rawData.nodes !== "object") {
      throw new Error("Invalid graph.json format: missing nodes object");
    }

    Object.entries(rawData.nodes).forEach(([name, info]) => {
      const node: PackageNode = {
        id: name,
        explicit: info.explicit || false,
        version: info.version || "unknown",
        depends_on: info.depends_on || [],
        required_by: info.required_by || [],
      };
      nodes.push(node);
      nodeMap.set(name, nodes.length - 1);
    });

    nodes.forEach((node) => {
      node.depends_on.forEach((dep) => {
        if (nodeMap.has(dep)) {
          links.push({
            source: node.id,
            target: dep,
          });
        }
      });
    });

    return { nodes, links };
  }

  // Render D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    // Stop and cleanup any existing simulation FIRST
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current.on("tick", null); // Remove all tick listeners
      simulationRef.current = null;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear DOM
    svg.on(".zoom", null); // Remove zoom handlers

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

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
        d3.drag<SVGCircleElement, PackageNode>()
          .on("start", (event) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active && simulationRef.current) simulationRef.current.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          })
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
          .distance(50)
      )
      .force("charge", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(15));

    // Aggressive optimization for large graphs
    if (nodes.length > 500) {
      simulation.alphaDecay(0.05); // Faster convergence
      simulation.velocityDecay(0.6); // More damping
    }

    // Use a single tick handler reference
    const tickHandler = () => {
      link
        .attr("x1", (d) => (d.source as PackageNode).x || 0)
        .attr("y1", (d) => (d.source as PackageNode).y || 0)
        .attr("x2", (d) => (d.target as PackageNode).x || 0)
        .attr("y2", (d) => (d.target as PackageNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);
    };

    simulation.on("tick", tickHandler);

    // Auto-stop simulation when it converges (critical for memory)
    simulation.on("end", () => {
      console.log("Simulation converged and stopped");
    });

    simulationRef.current = simulation;

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !simulation) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      simulation.stop();
      simulation.on("tick", null); // Remove tick listener
      // Clear D3 selections to release DOM references
      svg.selectAll("*").remove();
      svg.on(".zoom", null);
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

  const explicitCount = nodes.filter((n) => n.explicit).length;
  const dependencyCount = nodes.length - explicitCount;

  return (
    <div id="app">
      <header>
        <h1>Manjaro Package Dependency Graph</h1>
        <div id="stats">
          <span>
            <select
              className="file-selector"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              <option value="">Select a data file...</option>
              {files.map((file) => (
                <option key={file} value={file}>
                  {file}
                </option>
              ))}
            </select>
          </span>
          <span id="package-count">
            {nodes.length} packages ({explicitCount} explicit, {dependencyCount} dependencies)
          </span>
          <span className="legend">
            <span className="legend-dot explicit"></span> Explicit
          </span>
          <span className="legend">
            <span className="legend-dot dependency"></span> Dependency
          </span>
        </div>
      </header>

      <main>
        <div id="graph-container" ref={containerRef}>
          {!selectedFile && !loading && !error && (
            <div id="loading">
              <div>Please select a data file from the dropdown above to visualize the dependency graph.</div>
            </div>
          )}
          {loading && (
            <div id="loading">
              <div className="spinner"></div>
              <div>Loading dependency graph...</div>
            </div>
          )}
          {error && (
            <div id="loading">
              <div className="error">
                <strong>Error loading graph</strong>
                <br />
                {error}
                <br />
                <br />
                <small>Make sure JSON files exist in the data directory.</small>
              </div>
            </div>
          )}
          {selectedFile && !loading && !error && <svg id="graph" ref={svgRef}></svg>}
        </div>

        <div id="sidebar" className={sidebarHidden ? "hidden" : ""}>
          <button
            className="close-sidebar"
            onClick={() => {
              setSidebarHidden(true);
              setSelectedNode(null);
            }}
          >
            ×
          </button>
          {selectedNode && (
            <div className="package-details">
              <h2>{selectedNode.id}</h2>
              <div className="detail-section">
                <strong>Version</strong>
                <span className="version">{selectedNode.version}</span>
              </div>
              <div className="detail-section">
                <strong>Package Type</strong>
                <span className={`badge ${selectedNode.explicit ? "explicit" : "dependency"}`}>
                  {selectedNode.explicit ? "Explicitly Installed" : "Dependency"}
                </span>
              </div>
              <div className="detail-section">
                <strong>Dependencies ({selectedNode.depends_on.length})</strong>
                {selectedNode.depends_on.length > 0 ? (
                  <ul>
                    {selectedNode.depends_on.map((dep) => (
                      <li key={dep}>
                        <button
                          className="clickable-package"
                          onClick={() => handlePackageClick(dep)}
                        >
                          {dep}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-list">No dependencies</div>
                )}
              </div>
              <div className="detail-section">
                <strong>Required By ({selectedNode.required_by.length})</strong>
                {selectedNode.required_by.length > 0 ? (
                  <ul>
                    {selectedNode.required_by.map((req) => (
                      <li key={req}>
                        <button
                          className="clickable-package"
                          onClick={() => handlePackageClick(req)}
                        >
                          {req}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-list">Not required by any package</div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
