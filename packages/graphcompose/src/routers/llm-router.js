import { mergeTextWithContent } from "./multimodal-utils.js";
import { recordUsage } from "../finops/usage.js";
import { compareNames } from "../llm/canonical-order.js";
import { readRouterDecision } from "./decision.js";
import { decided, errorReason, failed, unknownOption } from "./outcome.js";
import { llmRouterPrompt } from "./prompts.js";
import { routerCaller } from "./types.js";
const describeOptions = (options) => options.map((option) => `- ${option.name}: ${option.description}`).join("\n");
function outcomeOf(read, usage) {
    switch (read.kind) {
        case "valid":
            return decided(read.decision, usage);
        case "unknown-option":
            return unknownOption(read.option, usage);
        case "invalid":
            return failed("invalid router output", usage);
    }
}
/** Chat model asked for JSON; output validated with zod; priced from the config table. */
/** A call that failed before an answer is recorded at no cost. */
const NO_CALL_COST = { response_metadata: { usage: { cost: 0 } } };
export function createLlmRouter(deps) {
    const caller = routerCaller(deps.name);
    return {
        name: deps.name,
        route: async (request) => {
            try {
                const prompt = await llmRouterPrompt.formatMessages({
                    // routes in a canonical order (by name): declaration order changes neither request nor fingerprint
                    options: describeOptions([...request.options].sort((a, b) => compareNames(a.name, b.name))),
                    input: request.instructions === undefined
                        ? request.input
                        : mergeTextWithContent(`${request.instructions}\n\n`, request.input),
                });
                const response = await deps.model.invoke(prompt);
                const usage = recordUsage(caller, deps.settings, response);
                const allowed = new Set(request.options.map((option) => option.name));
                return outcomeOf(readRouterDecision(response.text, allowed), usage);
            }
            catch (error) {
                return failed(errorReason(error), recordUsage(caller, deps.settings, NO_CALL_COST));
            }
        },
    };
}
