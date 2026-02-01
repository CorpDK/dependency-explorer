interface FileSelectorProps {
  files: string[];
  selectedFile: string;
  onChange: (file: string) => void;
}

export default function FileSelector({ files, selectedFile, onChange }: Readonly<FileSelectorProps>) {
  return (
    <select
      className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-700 text-white text-sm cursor-pointer transition-colors hover:bg-zinc-600 focus:outline-none focus:border-green-500"
      value={selectedFile}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select a data file...</option>
      {files.map((file) => (
        <option key={file} value={file}>
          {file}
        </option>
      ))}
    </select>
  );
}
