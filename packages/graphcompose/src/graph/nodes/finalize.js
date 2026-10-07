import { extractText } from "../multimodal.js";
export const NO_ANSWER = "No agent produced an answer.";
/** The answer of a workflow finish: the latest contribution. */
export const lastAnswer = (state) => {
    const content = state.contributions.at(-1)?.content;
    return content ? extractText(content) : NO_ANSWER;
};
