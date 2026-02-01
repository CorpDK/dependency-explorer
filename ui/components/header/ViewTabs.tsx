import { ViewMode } from "@/types/package";

interface TabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Tab({ active, onClick, children }: Readonly<TabProps>) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-700 text-white"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
      }`}
    >
      {children}
    </button>
  );
}

interface ViewTabsProps {
  viewMode: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

export default function ViewTabs({
  viewMode,
  onViewChange,
}: Readonly<ViewTabsProps>) {
  return (
    <div className="flex gap-1 border-t border-zinc-700 pt-3">
      <Tab active={viewMode === "list"} onClick={() => onViewChange("list")}>
        List View
      </Tab>
      <Tab active={viewMode === "graph"} onClick={() => onViewChange("graph")}>
        Graph View
      </Tab>
      <Tab
        active={viewMode === "orphaned"}
        onClick={() => onViewChange("orphaned")}
      >
        Orphaned Packages
      </Tab>
    </div>
  );
}
