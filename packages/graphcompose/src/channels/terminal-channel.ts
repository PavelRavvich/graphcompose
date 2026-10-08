import { Channel, type ChannelHandler, type ChannelRequest } from "../components/decorators.js";

@Channel({
  name: "terminal-user-channel",
  description: "Asks the user via terminal standard output and waits for CLI input",
})
export class TerminalUserChannel implements ChannelHandler {
  requestApproval = async (req: ChannelRequest): Promise<void> => {
    // In a real CLI environment, this simply prints the question.
    // The CLI process catches the suspension and prompts the user,
    // then calls engine.resume(runId, replyWith).
    console.log(
      `\n[APPROVAL REQUIRED] Tool '${req.toolName}' wants to run in Agent '${req.agentName}'.`,
    );
    console.log(`Arguments:`, req.toolArguments);
    console.log(`To approve, run: gc resume ${req.runId} --approve`);
    console.log(`To reject, run: gc resume ${req.runId} --reject "reason"\n`);
  };
}
