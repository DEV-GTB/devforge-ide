// Chunker - Splits code into chunks for embedding
export interface Chunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
}

export class Chunker {
  private readonly maxChunkSize = 500;
  private readonly overlap = 50;

  chunk(content: string): Chunk[] {
    const lines = content.split('\n');
    const chunks: Chunk[] = [];

    let currentChunk: string[] = [];
    let startLine = 1;

    for (let i = 0; i < lines.length; i++) {
      currentChunk.push(lines[i]);

      // Check if chunk is too large
      if (currentChunk.join('\n').length > this.maxChunkSize) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.join('\n'),
          startLine,
          endLine: i + 1,
        });

        // Start new chunk with overlap
        const overlapLines = Math.min(this.overlap, currentChunk.length);
        currentChunk = currentChunk.slice(-overlapLines);
        startLine = i + 1 - overlapLines + 1;
      }
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.join('\n'),
        startLine,
        endLine: lines.length,
      });
    }

    return chunks;
  }
}
