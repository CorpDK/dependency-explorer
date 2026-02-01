interface DependencyListProps {
  title: string;
  count: number;
  items: string[];
  onItemClick: (item: string) => void;
  emptyMessage: string;
}

export default function DependencyList({
  title,
  count,
  items,
  onItemClick,
  emptyMessage,
}: Readonly<DependencyListProps>) {
  return (
    <div className="mb-6">
      <strong className="block text-zinc-600 dark:text-zinc-400 text-xs uppercase tracking-wider mb-2">
        {title} ({count})
      </strong>
      {items.length > 0 ? (
        <ul className="list-none max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <li key={item} className="mb-1.5">
              <button
                className="w-full p-2 bg-zinc-100 dark:bg-zinc-700 border-none rounded text-sm font-mono text-left cursor-pointer transition-all hover:bg-zinc-300 dark:hover:bg-zinc-600 hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline focus:outline-2 focus:outline-blue-500 focus:outline-offset-[-2px]"
                onClick={() => onItemClick(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-zinc-500 dark:text-zinc-500 italic text-sm">{emptyMessage}</div>
      )}
    </div>
  );
}
