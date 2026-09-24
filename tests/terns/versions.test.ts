import { describe, expect, it } from "vitest";
import { runVersions } from "../../src/index.js";
import { stableJson, versionOf } from "../../src/terns/index.js";
import { fakeDeps } from "../helpers.js";

describe("versions", () => {
  it("serialise objects independently of key order and skip undefined", () => {
    expect(stableJson({ b: 1, a: [2, { d: null, c: undefined }] })).toBe(
      '{"a":[2,{"d":null}],"b":1}',
    );
    expect(stableJson(undefined)).toBe("null");
  });

  it("same config → same versions; a prompt change → a new prompt version only", () => {
    const deps = fakeDeps({});
    const changed = { ...deps, prompts: { ...deps.prompts, alpha: "You are alpha, now terse." } };

    expect(runVersions(deps)).toEqual(runVersions(fakeDeps({})));
    expect(runVersions(changed).promptVersion).not.toBe(runVersions(deps).promptVersion);
    expect(runVersions(changed).modelVersion).toBe(runVersions(deps).modelVersion);
    expect(versionOf("x")).toHaveLength(12);
  });
});
