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
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="bg-zinc-800 dark:bg-zinc-950 text-white px-6 py-4 shadow-md z-10">
        <h1 className="text-2xl font-semibold mb-2">Manjaro Package Dependency Graph</h1>
        <div className="flex flex-wrap gap-8 text-sm text-zinc-300">
          <span>
            <select
              className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-700 text-white text-sm cursor-pointer transition-colors hover:bg-zinc-600 focus:outline-none focus:border-green-500"
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
          <span>
            {nodes.length} packages ({explicitCount} explicit, {dependencyCount} dependencies)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Explicit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Dependency
          </span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-900" ref={containerRef}>
          {!selectedFile && !loading && !error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-lg text-zinc-600 dark:text-zinc-400">
              <div>Please select a data file from the dropdown above to visualize the dependency graph.</div>
            </div>
          )}
          {loading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-lg text-zinc-600 dark:text-zinc-400">
              <div className="border-4 border-zinc-300 dark:border-zinc-700 border-t-zinc-800 dark:border-t-zinc-300 rounded-full w-10 h-10 animate-spin mx-auto mb-4"></div>
              <div>Loading dependency graph...</div>
            </div>
          )}
          {error && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded max-w-md">
                <strong>Error loading graph</strong>
                <br />
                {error}
                <br />
                <br />
                <small>Make sure JSON files exist in the data directory.</small>
              </div>
            </div>
          )}
          {selectedFile && !loading && !error && <svg className="w-full h-full cursor-grab active:cursor-grabbing" ref={svgRef}></svg>}
        </div>

        <div className={`w-96 bg-white dark:bg-zinc-800 shadow-[-2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)] overflow-y-auto p-6 transition-transform duration-300 ease-in-out relative z-[5] ${sidebarHidden ? "translate-x-full absolute right-0 h-full" : ""}`}>
          <button
            className="absolute top-4 right-4 bg-transparent border-none text-2xl text-zinc-600 dark:text-zinc-400 cursor-pointer w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
            onClick={() => {
              setSidebarHidden(true);
              setSelectedNode(null);
            }}
          >
            ×
          </button>
          {selectedNode && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100 pr-8 break-words">
                {selectedNode.id}
              </h2>
              <div className="mb-6">
                <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
                  Version
                </strong>
                <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-2.5 py-1.5 rounded inline-block">
                  {selectedNode.version}
                </span>
              </div>
              <div className="mb-6">
                <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
                  Package Type
                </strong>
                <span
                  className={`inline-block px-3 py-1.5 rounded text-sm font-medium ${
                    selectedNode.explicit
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {selectedNode.explicit ? "Explicitly Installed" : "Dependency"}
                </span>
              </div>
              <div className="mb-6">
                <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
                  Dependencies ({selectedNode.depends_on.length})
                </strong>
                {selectedNode.depends_on.length > 0 ? (
                  <ul className="list-none max-h-[300px] overflow-y-auto">
                    {selectedNode.depends_on.map((dep) => (
                      <li key={dep} className="mb-1.5">
                        <button
                          className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 border-none rounded text-sm font-mono text-left cursor-pointer transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-2px]"
                          onClick={() => handlePackageClick(dep)}
                        >
                          {dep}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-500 italic text-sm">
                    No dependencies
                  </div>
                )}
              </div>
              <div className="mb-6">
                <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
                  Required By ({selectedNode.required_by.length})
                </strong>
                {selectedNode.required_by.length > 0 ? (
                  <ul className="list-none max-h-[300px] overflow-y-auto">
                    {selectedNode.required_by.map((req) => (
                      <li key={req} className="mb-1.5">
                        <button
                          className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 border-none rounded text-sm font-mono text-left cursor-pointer transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-2px]"
                          onClick={() => handlePackageClick(req)}
                        >
                          {req}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-500 italic text-sm">
                    Not required by any package
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
