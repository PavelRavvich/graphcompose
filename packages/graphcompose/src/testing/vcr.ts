import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  createModelGateway,
  type ChatModelSpec,
  type DecisionSpec,
  type ModelGateway,
} from "../llm/gateway.js";
import { providerClients } from "../llm/provider-clients.js";
import { directoryOf } from "../models/workflow-models.js";
import type { AssembledWorkflow } from "../workflow.js";
import { providerClientsOf } from "../app/models.js";

export enum VCRMode {
  RECORD = "RECORD",
  REPLAY = "REPLAY",
  AUTO = "AUTO",
}

export interface VcrConfig {
  cassetteName: string;
  mode?: VCRMode;
  dir?: string;
}

interface CassetteInteraction {
  agentName: string;
  request: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools?: any[];
  };
  response: ChatResult;
}

interface Cassette {
  interactions: CassetteInteraction[];
}

export class VcrChatModel extends BaseChatModel {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  _llmType() {
    return "vcr_chat_model";
  }

  constructor(
    private wrappedModel: BaseChatModel,
    private cassettePath: string,
    private mode: VCRMode,
    private agentName: string,
  ) {
    super({});
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private hashRequest(messages: BaseMessage[], tools?: any[]): string {
    const data = JSON.stringify({
      messages: messages.map((m) => ({
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        _getType: m._getType(),
        content: m.content,
        additional_kwargs: m.additional_kwargs,
      })),
      tools,
    });
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  // eslint-disable-next-line max-lines-per-function
  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const isReplay =
      this.mode === VCRMode.REPLAY ||
      (this.mode === VCRMode.AUTO && fs.existsSync(this.cassettePath));
    const isRecord =
      this.mode === VCRMode.RECORD ||
      (this.mode === VCRMode.AUTO && !fs.existsSync(this.cassettePath));

    if (isReplay) {
      if (!fs.existsSync(this.cassettePath)) {
        throw new Error(
          `Cassette mismatch: please re-record. File not found: ${this.cassettePath}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const cassette: Cassette = JSON.parse(fs.readFileSync(this.cassettePath, "utf-8"));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const requestHash = this.hashRequest(messages, (options as any).tools);

      const match = cassette.interactions.find((i) => {
        if (i.agentName !== this.agentName) return false;
        const storedHash = crypto
          .createHash("sha256")
          .update(JSON.stringify(i.request))
          .digest("hex");
        return storedHash === requestHash;
      });

      if (!match) {
        throw new Error(
          `Cassette mismatch: please re-record. Interaction not found for ${this.agentName}`,
        );
      }

      // Reconstruct AIMessages from the stored JSON to satisfy LangChain
      const response = match.response;
      response.generations = response.generations.map((gen) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-optional-chain
        if (gen.message && gen.message.id) {
          const msg = new AIMessage({
            content: gen.message.content,
            additional_kwargs: gen.message.additional_kwargs,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            tool_calls: (gen.message as any).tool_calls,
            id: gen.message.id,
          });
          gen.message = msg;
        }
        return gen;
      });
      return response;
    }

    if (isRecord) {
      const result = await this.wrappedModel._generate(messages, options, runManager);

      let cassette: Cassette = { interactions: [] };
      if (fs.existsSync(this.cassettePath)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        cassette = JSON.parse(fs.readFileSync(this.cassettePath, "utf-8"));
      }

      cassette.interactions.push({
        agentName: this.agentName,
        request: {
          messages: messages.map((m) => ({
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            _getType: m._getType(),
            content: m.content,
            additional_kwargs: m.additional_kwargs,
          })),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          tools: (options as any).tools,
        },
        response: result,
      });

      fs.mkdirSync(path.dirname(this.cassettePath), { recursive: true });
      fs.writeFileSync(this.cassettePath, JSON.stringify(cassette, null, 2));

      return result;
    }

    throw new Error("Invalid VCR Mode");
  }
}

export function createVcrGateway(
  bundle: AssembledWorkflow,
  vcrConfig: VcrConfig,
  env: NodeJS.ProcessEnv,
): ModelGateway {
  const directory = directoryOf(bundle.models);
  const clientsOpts = providerClientsOf({}, env);
  const realClients = providerClients(directory, clientsOpts);

  // Create a real gateway
  const realGateway = createModelGateway(realClients);

  const dir = vcrConfig.dir ?? "__snapshots__";
  const cassettePath = path.join(dir, `${vcrConfig.cassetteName}.cassette.json`);
  const mode = vcrConfig.mode ?? VCRMode.AUTO;

  // Wrap it so that chatModel AND routeTo (which calls chatModel) both use the intercepted BaseChatModel
  const vcrGateway: ModelGateway = {
    chatModel: (spec: ChatModelSpec) => {
      const realModel = realGateway.chatModel(spec);
      const agentName =
        spec.user.kind === "agent"
          ? spec.user.agent
          : spec.user.kind === "router"
            ? spec.user.router
            : "compaction";
      return new VcrChatModel(realModel, cassettePath, mode, agentName);
    },
    routeTo: async (spec: DecisionSpec) => {
      // routeTo uses the gateway's chatModel if it's an LLM decision.
      // We can recreate strategyOf here, or just delegate to realGateway but passing our wrapped model inside?
      // Wait, routeTo in createModelGateway uses `chatModel({user, settings})` which calls ITS internal chatModel.
      // So if we just delegate routeTo to `realGateway.routeTo`, it will NOT use our `VcrChatModel`.
      // To fix this, we can recreate the routing logic or just recreate the gateway over wrapped clients?
      // Recreating gateway logic for routeTo:
      if (spec.model.kind === "jev") {
        // JeV doesn't use BaseChatModel, we could record it differently, but spec implies wrapping BaseChatModel.
        return realGateway.routeTo(spec);
      } else {
        const { createLlmRouter } = await import("../routers/index.js");
        // Get the wrapped model using OUR chatModel override
        const wrappedModel = vcrGateway.chatModel({
          user: { kind: "router", router: spec.router },
          settings: spec.model.settings,
        });
        const router = createLlmRouter({
          name: spec.router,
          model: wrappedModel,
          settings: spec.model.settings,
        });
        return router.route(spec.request);
      }
    },
  };
  return vcrGateway;
}
