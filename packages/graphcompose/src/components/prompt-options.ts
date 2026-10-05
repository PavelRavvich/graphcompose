/** A text given inline (`prompt`), in files (`promptUrls`, relative to the declaration file), or both. */
export interface PromptOptions {
  readonly prompt?: string;
  readonly promptUrls?: readonly string[];
}
