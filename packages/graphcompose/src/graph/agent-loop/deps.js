/** The tool calls of a move, in the model's order. */
export const callsOf = (move) => (move?.tool_calls ?? []).map((call) => ({
    callId: call.id ?? "",
    tool: call.name,
    args: call.args,
}));
export const toolNamed = (agent, name) => agent.tools.find((tool) => tool.name === name);
