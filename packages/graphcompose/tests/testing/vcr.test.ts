import { describe, it, expect, vi } from "vitest";
import { VcrChatModel, VCRMode } from "../../src/testing/vcr.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import fs from "fs";

class FakeModel extends BaseChatModel {
  _llmType() { return "fake"; }
  async _generate(messages: any[], options: any, runManager?: any) {
    return {
      generations: [
        {
          text: "fake response",
          message: new AIMessage("fake response")
        }
      ]
    };
  }
}

describe("VCR Testing Toolkit", () => {
  it("records interaction in RECORD mode", async () => {
    const cassettePath = "test.cassette.json";
    if (fs.existsSync(cassettePath)) fs.unlinkSync(cassettePath);
    
    const fake = new FakeModel({});
    const vcr = new VcrChatModel(fake, cassettePath, VCRMode.RECORD, "agent1");
    
    const response = await vcr.invoke([new HumanMessage("Hello")]);
    expect(response.content).toBe("fake response");
    
    expect(fs.existsSync(cassettePath)).toBe(true);
    const cassette = JSON.parse(fs.readFileSync(cassettePath, "utf-8"));
    expect(cassette.interactions.length).toBe(1);
    expect(cassette.interactions[0].agentName).toBe("agent1");
    
    fs.unlinkSync(cassettePath);
  });
});
