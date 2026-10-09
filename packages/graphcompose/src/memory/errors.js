export class MemoryError extends Error {
  name = "MemoryError";
}
export class MemoryStorageError extends MemoryError {
  cause;
  name = "MemoryStorageError";
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}
export class MemoryCompactionError extends MemoryError {
  cause;
  name = "MemoryCompactionError";
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}
