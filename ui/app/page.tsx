"use client";

import DependencyGraph from "@/components/DependencyGraph";
import Investigate from "@/components/Investigate";
import OrphanedPackages from "@/components/OrphanedPackages";
import PackageList from "@/components/PackageList";
import FileSelector from "@/components/header/FileSelector";
import Legend from "@/components/header/Legend";
import SystemInfo from "@/components/header/SystemInfo";
import ViewTabs from "@/components/header/ViewTabs";
import {
  countPackages,
  processBrokenDependencies,
  transformData,
} from "@/lib/utils";
import {
  GraphInfo,
  PackageNode,
  RawGraphData,
  ViewMode,
} from "@/types/package";
import { useEffect, useState } from "react";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [rawNodes, setRawNodes] = useState<PackageNode[]>([]);
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
      setRawNodes([]);
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
        setRawNodes(nodeList);
        setGraphInfo(rawData.info || null);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    }
    loadData();
  }, [selectedFile]);

  // Process nodes to detect broken dependencies
  useEffect(() => {
    const processedNodes = processBrokenDependencies(rawNodes);
    setNodes(processedNodes);
  }, [rawNodes]);

  const { explicit, dependency, broken, total } = countPackages(nodes);

  return (
    <div className="flex flex-col h-screen">
      {/* Header with file selection */}
      <header className="bg-zinc-800 dark:bg-zinc-950 text-white px-6 py-4 shadow-md z-10">
        <h1 className="text-2xl font-semibold mb-3">
          Package Dependency Explorer
        </h1>
        {graphInfo && <SystemInfo info={graphInfo} />}
        <div className="flex flex-wrap gap-8 text-sm text-zinc-300 mb-3">
          <FileSelector
            files={files}
            selectedFile={selectedFile}
            onChange={setSelectedFile}
          />
          <Legend
            explicitCount={explicit}
            dependencyCount={dependency}
            brokenCount={broken}
            totalCount={total}
          />
        </div>
        <ViewTabs viewMode={viewMode} onViewChange={setViewMode} />
      </header>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" && (
          <PackageList nodes={nodes} loading={loading} error={error} />
        )}
        {viewMode === "graph" && (
          <DependencyGraph nodes={nodes} loading={loading} error={error} />
        )}
        {viewMode === "orphaned" && (
          <OrphanedPackages nodes={nodes} loading={loading} error={error} />
        )}
        {viewMode === "investigate" && (
          <Investigate nodes={nodes} loading={loading} error={error} />
        )}
      </div>
    </div>
  );
}
