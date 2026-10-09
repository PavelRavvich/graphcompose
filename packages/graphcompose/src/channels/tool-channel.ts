import { getBoundTools } from "../components/decorators.js";
import type { ChannelHandler, ChannelRequest } from "../components/decorators.js";

/**
 * A base channel that routes approval requests to specific methods based on the tool's name.
 * Use the `@BindTool` decorator on your methods to bind them to a tool class or tool name.
 */
export abstract class ToolChannel implements ChannelHandler {
  public async requestApproval(req: ChannelRequest): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const handlers = getBoundTools(Object.getPrototypeOf(this));
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const configs = handlers[req.toolName] || [];

    let methodName: string | undefined;

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    if (methodName && typeof (this as any)[methodName] === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      await (this as any)[methodName](req);
    } else {
      await this.handleUnknownTool(req);
    }
  }

  /**
   * Called when a tool without a bound method requests approval.
   */
  protected abstract handleUnknownTool(req: ChannelRequest): Promise<void>;
}
