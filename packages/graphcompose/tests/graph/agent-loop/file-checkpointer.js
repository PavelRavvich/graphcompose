import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";
/** MemorySaver keeps serialised JSON as bytes; on disk it is kept as text. */
/** [checkpoint, metadata, parent id]; JSON has no `undefined`, so a root checkpoint has `null`. */
const StoredCheckpoint = z.tuple([z.string(), z.string(), z.string().nullable()]);
const StoredWrite = z.tuple([z.string(), z.string(), z.string()]);
const FileContent = z.object({
    storage: z.record(z.string(), z.record(z.string(), z.record(z.string(), StoredCheckpoint))),
    writes: z.record(z.string(), z.record(z.string(), StoredWrite)),
});
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const mapValues = (record, map) => Object.fromEntries(Object.entries(record).map(([key, value]) => [key, map(value)]));
/**
 * A durable checkpointer for the kill-and-resume tests: MemorySaver's logic, flushed to one JSON file after every
 * `put` / `putWrites` (write + rename, so a kill never leaves half a file). Enough to prove
 * kill-and-resume across processes; a real one would sit on the state store (#121).
 */
export class FileCheckpointSaver extends MemorySaver {
    path;
    constructor(path) {
        super();
        this.path = path;
        if (!existsSync(path))
            return;
        const content = FileContent.parse(JSON.parse(readFileSync(path, "utf8")));
        this.storage = mapValues(content.storage, (namespaces) => mapValues(namespaces, (checkpoints) => mapValues(checkpoints, ([checkpoint, metadata, parent]) => [
            encoder.encode(checkpoint),
            encoder.encode(metadata),
            parent ?? undefined,
        ])));
        this.writes = mapValues(content.writes, (writes) => mapValues(writes, ([taskId, channel, value]) => [taskId, channel, encoder.encode(value)]));
    }
    async put(config, checkpoint, metadata) {
        const saved = await super.put(config, checkpoint, metadata);
        this.flush();
        return saved;
    }
    async putWrites(config, writes, taskId) {
        await super.putWrites(config, writes, taskId);
        this.flush();
    }
    async deleteThread(threadId) {
        await super.deleteThread(threadId);
        this.flush();
    }
    flush() {
        const content = {
            storage: mapValues(this.storage, (namespaces) => mapValues(namespaces, (checkpoints) => mapValues(checkpoints, ([checkpoint, metadata, parent]) => [
                decoder.decode(checkpoint),
                decoder.decode(metadata),
                parent ?? null,
            ]))),
            writes: mapValues(this.writes, (writes) => mapValues(writes, ([taskId, channel, value]) => [taskId, channel, decoder.decode(value)])),
        };
        const temporary = `${this.path}.tmp`;
        writeFileSync(temporary, JSON.stringify(content));
        renameSync(temporary, this.path);
    }
}
