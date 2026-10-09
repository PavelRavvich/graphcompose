import { Injectable } from "../../components/decorators.js";
import { BaseMemoryStorage } from "../types.js";

/**
 * A simple in-memory storage for rapid prototyping and tests.
 * Not suitable for production with multiple workers.
 */
@Injectable()
export class InMemoryStorage extends BaseMemoryStorage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private store = new Map<string, any>();

  private key(runId: string, namespace: string): string {
    return `${runId}:${namespace}`;
  }

  async load<V>(runId: string, namespace: string): Promise<V | undefined> {
    return this.store.get(this.key(runId, namespace)) as V | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  async save<V>(runId: string, namespace: string, data: V): Promise<void> {
    this.store.set(this.key(runId, namespace), data);
  }
}
