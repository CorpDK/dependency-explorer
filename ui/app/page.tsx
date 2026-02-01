"use client";

import { useState, useEffect } from "react";
import DependencyGraph from "@/components/DependencyGraph";
import PackageList from "@/components/PackageList";
import OrphanedPackages from "@/components/OrphanedPackages";

type ViewMode = "graph" | "list" | "orphaned";

interface PackageInfo {
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

interface GraphInfo {
  os: string;
  hostname: string;
  timestamp: string;
  shell: string;
}

interface RawGraphData {
  info?: GraphInfo;
  nodes: {
    [packageName: string]: PackageInfo;
  };
}

export interface PackageNode {
  id: string;
  explicit: boolean;
  version: string;
  depends_on: string[];
  required_by: string[];
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [nodes, setNodes] = useState<PackageNode[]>([]);
  const [graphInfo, setGraphInfo] = useState<GraphInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

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
    if (!selectedFile) {
      setNodes([]);
      setGraphInfo(null);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/data/${selectedFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load ${selectedFile}`);
        }
        const rawData: RawGraphData = await response.json();
        const nodeList = transformData(rawData);
        setNodes(nodeList);
        setGraphInfo(rawData.info || null);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFile]);

  function transformData(rawData: RawGraphData): PackageNode[] {
    const nodes: PackageNode[] = [];

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
    });

    return nodes;
  }

  const explicitCount = nodes.filter((n) => n.explicit).length;
  const dependencyCount = nodes.length - explicitCount;

  return (
    <div className="flex flex-col h-screen">
      {/* Header with file selection */}
      <header className="bg-zinc-800 dark:bg-zinc-950 text-white px-6 py-4 shadow-md z-10">
        <h1 className="text-2xl font-semibold mb-3">Package Dependency Explorer</h1>
        {graphInfo && (
          <div className="flex flex-wrap gap-6 text-sm text-zinc-400 mb-3">
            <span>
              <strong className="text-zinc-300">OS:</strong> {graphInfo.os}
            </span>
            <span>
              <strong className="text-zinc-300">Host:</strong> {graphInfo.hostname}
            </span>
            <span>
              <strong className="text-zinc-300">Collected:</strong> {graphInfo.timestamp.replaceAll("-", "/").replace(/(\d{4}\/\d{2}\/\d{2})\/(\d{2})(\d{2})(\d{2})/, "$1 $2:$3:$4")}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-8 text-sm text-zinc-300 mb-3">
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
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Orphaned
          </span>
        </div>

        {/* View Selector Tabs */}
        <div className="flex gap-1 border-t border-zinc-700 pt-3">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === "graph"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
            }`}
          >
            Graph View
          </button>
          <button
            onClick={() => setViewMode("orphaned")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === "orphaned"
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
            }`}
          >
            Orphaned Packages
          </button>
        </div>
      </header>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" && <PackageList nodes={nodes} loading={loading} error={error} />}
        {viewMode === "graph" && <DependencyGraph nodes={nodes} loading={loading} error={error} />}
        {viewMode === "orphaned" && <OrphanedPackages nodes={nodes} loading={loading} error={error} />}
      </div>
    </div>
  );
}
