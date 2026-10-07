export const resolveTools = (bundle, services) => typeof bundle.tools === "function" ? bundle.tools(services) : bundle.tools;
