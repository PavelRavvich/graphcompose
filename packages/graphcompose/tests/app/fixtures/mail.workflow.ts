import { TerminalUserChannel } from "../../../src/channels/terminal-channel.js";
import { Agent, Tool, Workflow } from "../../../src/components/decorators.js";
import { Text, WorkflowFinishText, WorkflowStartText } from "../../../src/dto/index.js";
import {
  chain,
  WorkflowFinish,
  WorkflowSettings,
  WorkflowStart,
  type WorkflowDefinition,
} from "../../../src/graph/index.js";
import type { IncompatibleResume } from "../../../src/run/resume-guard.js";
import type { ToolHandler } from "../../../src/tool/index.js";

/** Emails the tool really sent, in order (the tests reset it). */
export const sent: string[] = [];

/** What the migrating workflow's resume policy was asked (the tests reset it). */
export const asked: IncompatibleResume[] = [];

export class Email {
  @Text({ prompt: "the recipient" })
  to!: string;
}

export class Sent {
  @Text()
  status!: string;
}

/** A write tool: it waits for an approval, so a run pauses before it. */
@Tool({
  name: "send_email",
  description: "Sends an email",
  channel: TerminalUserChannel,
  input: Email,
  output: Sent,
})
export class SendEmail implements ToolHandler<Email, Sent> {
  run({ to }: Email): Promise<Sent> {
    sent.push(to);
    return Promise.resolve({ status: `sent to ${to}` });
  }
}

@Agent({
  name: "mailer",
  description: "Sends the emails it is asked to",
  prompt: "Send the email you are asked to send.",
  tools: [SendEmail],
  model: "test/mailer",
})
export class Mailer {}

@WorkflowStart({ name: "start", description: "A request", input: WorkflowStartText })
export class Start {
  declare readonly input: WorkflowStartText;
}

@WorkflowFinish({ name: "finish", description: "The reply", output: WorkflowFinishText })
export class Finish {}

const workflow = {
  name: "mail",
  defaults: {
    models: { maxTokens: 100, temperature: 0 },
    history: { limit: 1 },
    tools: { maxToolCalls: 2 },
    router: { kind: "llm" as const, model: "test/router" },
  },
  channelClasses: [TerminalUserChannel],
  flow: [chain(Start, Mailer, Finish)],
};

/** The first deployment. */
@Workflow({ ...workflow, version: "1.0.0" })
export class MailV1 implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder().build();
  }
}

/** The next deployment: another version, so another config hash; no resume policy. */
@Workflow({ ...workflow, version: "2.0.0" })
export class MailV2 implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder().build();
  }
}

/** The next deployment, declaring that runs paused under 1.0.0 may continue on it. */
@Workflow({ ...workflow, version: "2.0.0" })
export class MailV2Migrating implements WorkflowDefinition {
  settings(): WorkflowSettings {
    return WorkflowSettings.builder()
      .onIncompatibleResume((resume) => {
        asked.push(resume);
        return resume.paused.workflowVersion === "1.0.0" ? "resume" : "reject";
      })
      .build();
  }
}
