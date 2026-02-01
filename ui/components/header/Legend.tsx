interface LegendItemProps {
  color: string;
  label: string;
}

function LegendItem({ color, label }: LegendItemProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span> {label}
    </span>
  );
}

interface LegendProps {
  explicitCount: number;
  dependencyCount: number;
  totalCount: number;
}

export default function Legend({ explicitCount, dependencyCount, totalCount }: LegendProps) {
  return (
    <div className="flex flex-wrap gap-8 text-sm text-zinc-300 mb-3">
      <span>
        {totalCount} packages ({explicitCount} explicit, {dependencyCount} dependencies)
      </span>
      <LegendItem color="bg-green-500" label="Explicit" />
      <LegendItem color="bg-blue-500" label="Dependency" />
      <LegendItem color="bg-orange-500" label="Orphaned" />
    </div>
  );
}
