import { PackageNode } from "@/types/package";
import DependencyList from "./DependencyList";

interface PackageDetailsProps {
  node: PackageNode;
  onPackageClick: (packageName: string) => void;
}

export default function PackageDetails({ node, onPackageClick }: Readonly<PackageDetailsProps>) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100 pr-8 break-words">
        {node.id}
      </h2>
      <div className="mb-6">
        <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
          Version
        </strong>
        <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-2.5 py-1.5 rounded inline-block">
          {node.version}
        </span>
      </div>
      <div className="mb-6">
        <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
          Package Type
        </strong>
        <span
          className={`inline-block px-3 py-1.5 rounded text-sm font-medium ${
            node.explicit ? "bg-green-500 text-white" : "bg-blue-500 text-white"
          }`}
        >
          {node.explicit ? "Explicitly Installed" : "Dependency"}
        </span>
      </div>
      <DependencyList
        title="Dependencies"
        count={node.depends_on.length}
        items={node.depends_on}
        onItemClick={onPackageClick}
        emptyMessage="No dependencies"
      />
      <DependencyList
        title="Required By"
        count={node.required_by.length}
        items={node.required_by}
        onItemClick={onPackageClick}
        emptyMessage="Not required by any package"
      />
    </div>
  );
}
