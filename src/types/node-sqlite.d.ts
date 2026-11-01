// Type declarations for Node.js built-in SQLite module (Node 22+)
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean });
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export interface StatementSync {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
    setReadBigInts(enabled: boolean): void;
    setAllowBareNamedParameters(enabled: boolean): void;
    expandedSQL: string;
    sourceSQL: string;
  }
}
