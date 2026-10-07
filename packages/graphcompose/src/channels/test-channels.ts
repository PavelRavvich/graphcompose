import { Channel, type ChannelHandler, type ChannelRequest } from "../components/decorators.js";

@Channel({
  name: "auto-approve-channel",
  description: "Automatically approves any request (for tests)",
})
export class AutoApproveChannel implements ChannelHandler {
  requestApproval = async (req: ChannelRequest): Promise<void> => {
    // Usually a test wrapper would intercept this and call app.resume automatically
    // or this is just a marker interface.
  };
}

@Channel({
  name: "auto-reject-channel",
  description: "Automatically rejects any request (for tests)",
})
export class AutoRejectChannel implements ChannelHandler {
  requestApproval = async (req: ChannelRequest): Promise<void> => {};
}
