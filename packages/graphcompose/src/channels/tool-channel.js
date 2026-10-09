import { getBoundTools } from "../components/decorators.js";
/**
 * A base channel that routes approval requests to specific methods based on the tool's name.
 * Use the `@BindTool` decorator on your methods to bind them to a tool class or tool name.
 */
export class ToolChannel {
  async requestApproval(req) {
    const handlers = getBoundTools(Object.getPrototypeOf(this));
    const configs = handlers[req.toolName] || [];
    let methodName;
    // First try to find a handler specific to this agent
    const specificHandler = configs.find((c) => c.agent === req.agentName);
    if (specificHandler) {
      methodName = specificHandler.methodName;
    } else {
      // Fallback to a default handler (one without a specific agent)
      const defaultHandler = configs.find((c) => !c.agent);
      if (defaultHandler) {
        methodName = defaultHandler.methodName;
      }
    }
    if (methodName && typeof this[methodName] === "function") {
      await this[methodName](req);
    } else {
      await this.handleUnknownTool(req);
    }
  }
}
