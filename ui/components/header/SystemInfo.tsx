import { GraphInfo } from "@/types/package";
import { formatTimestamp } from "@/lib/utils";

interface SystemInfoProps {
  info: GraphInfo;
}

export default function SystemInfo({ info }: Readonly<SystemInfoProps>) {
  return (
    <div className="flex flex-wrap gap-6 text-sm text-zinc-400 mb-3">
      <span>
        <strong className="text-zinc-300">OS:</strong> {info.os}
      </span>
      <span>
        <strong className="text-zinc-300">Host:</strong> {info.hostname}
      </span>
      <span>
        <strong className="text-zinc-300">Shell Used:</strong> {info.shell}
      </span>
      <span>
        <strong className="text-zinc-300">Collected On:</strong> {formatTimestamp(info.timestamp)}
      </span>
    </div>
  );
}
