export class Texture {
  public id: number;
  public filename: string;
  public file: string; // base64

  constructor(id: number, filename: string, file: string) {
    this.id = id;
    this.filename = filename;
    this.file = file;
  }

  mimeType(): string {
    const ext = this.filename.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    return map[ext] ?? 'image/jpeg';
  }

  asDataUri(): string {
    if (this.file.startsWith('data:')) return this.file;
    return `data:${this.mimeType()};base64,${this.file}`;
  }

  toJSON(includeFile = true): object {
    return {
      id: this.id,
      filename: this.filename,
      ...(includeFile ? { file: this.file } : {}),
    };
  }
}
