import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');

    // Check if directory exists
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ files: [] });
    }

    // Read all files from the data directory
    const files = fs.readdirSync(dataDir);

    // Filter for JSON files and sort by modification time (newest first)
    const jsonFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .map(item => item.name);

    return NextResponse.json({ files: jsonFiles });
  } catch (error) {
    console.error('Error reading data directory:', error);
    return NextResponse.json({ files: [] }, { status: 500 });
  }
}
