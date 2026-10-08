const fs = require("fs");

function replace(path, from, to) {
  let c = fs.readFileSync(path, "utf8");
  if (c.includes(from)) {
    c = c.split(from).join(to);
    fs.writeFileSync(path, c);
  }
}

// result.ts
replace("packages/graphcompose/src/app/result.ts", 'case "nextEach":', 'case "batchParallel":');

// runner.ts
replace(
  "packages/graphcompose/src/graph/agent-loop/runner.ts",
  "reply: null,\n  };",
  "reply: null,\nbatchItem: undefined,\n_batchCursor: {},\n  };",
);

// build.ts
replace(
  "packages/graphcompose/src/graph/build.ts",
  "next.targets.map((t) => graphNodeId",
  "next.targets.map((t: any) => graphNodeId",
);
replace(
  "packages/graphcompose/src/graph/build.ts",
  "queue: cursor.queue, offset: cursor.offset",
  "queue: cursor!.queue, offset: cursor!.offset",
);

// helpers.ts (again)
replace(
  "packages/graphcompose/tests/helpers.ts",
  "payload: state.payload ?? {},\n    batchItem: undefined,\n  _batchCursor: {},\n  };\n}",
  "payload: state.payload ?? {},\n    batchItem: undefined,\n  _batchCursor: {},\n  };\n}",
);
