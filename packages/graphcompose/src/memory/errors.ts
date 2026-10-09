export class MemoryError extends Error {
  override name = "MemoryError";
}

export class MemoryStorageError extends MemoryError {
  override name = "MemoryStorageError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

export class MemoryCompactionError extends MemoryError {
  override name = "MemoryCompactionError";
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}
