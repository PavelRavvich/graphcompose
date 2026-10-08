/** Routers are tested with plain requests — no graph, no agents. */
export const request = {
    input: "Implement a parser",
    options: [
        { name: "alpha", description: "facts" },
        { name: "finish", description: "done" },
    ],
};
export const jevAnswer = (route, usage) => ({
    model: "typesafe/jev-1.13-20260917",
    answers: { route },
    ...(usage ? { usage } : {}),
});
