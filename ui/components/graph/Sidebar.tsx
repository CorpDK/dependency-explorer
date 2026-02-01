import { PackageNode } from "@/types/package";
import PackageDetails from "./PackageDetails";

interface SidebarProps {
  isHidden: boolean;
  selectedNode: PackageNode | null;
  onClose: () => void;
  onPackageClick: (packageName: string) => void;
}

export default function Sidebar({
  isHidden,
  selectedNode,
  onClose,
  onPackageClick,
}: SidebarProps) {
  if (isHidden) {
    return null;
  }

  return (
    <div className="w-96 bg-white dark:bg-zinc-800 shadow-[-2px_0_8px_rgba(0,0,0,0.1)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.3)] overflow-y-auto p-6 relative z-[5]">
      <button
        className="absolute top-4 right-4 bg-transparent border-none text-2xl text-zinc-600 dark:text-zinc-400 cursor-pointer w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
        onClick={onClose}
      >
        ×
      </button>
      {selectedNode && <PackageDetails node={selectedNode} onPackageClick={onPackageClick} />}
    </div>
  );
}
