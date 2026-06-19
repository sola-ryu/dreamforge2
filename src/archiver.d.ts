declare module 'archiver' {
  import { EventEmitter } from 'stream';

  interface EntryData {
    name: string;
    type?: 'directory' | 'file' | 'symlink';
    date?: Date | string;
    mode?: number;
    prefix?: string;
    stats?: import('fs').Stats;
  }

  interface ArchiverOptions {
    comment?: string;
    forceLocalTime?: boolean;
    forceZip64?: boolean;
    namePrependSlash?: boolean;
    store?: boolean;
    level?: number;
    zlib?: import('zlib').ZlibOptions;
    gzip?: boolean;
    gzipOptions?: import('zlib').ZlibOptions;
    statConcurrency?: number;
  }

  class Archiver extends EventEmitter {
    append(source: string | Buffer | import('fs').ReadStream, data?: EntryData | string): this;
    file(file: string, data?: EntryData): this;
    directory(dirpath: string, destpath: string | boolean, data?: EntryData): this;
    symlink(filepath: string, target: string): this;
    finalize(): Promise<void>;
    setFormat(format: string): this;
    setModule(module: unknown): this;
    pointer(): number;
    pipe(
      destination: import('stream').Writable,
      options?: Record<string, unknown>
    ): import('stream').Writable;
  }

  export default function archiver(format: string, options?: ArchiverOptions): Archiver;
}
