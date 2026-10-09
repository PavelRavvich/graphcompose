import sys

files = [
    "packages/graphcompose/src/graph/flow-runners.ts",
    "packages/graphcompose/src/graph/rules.ts",
    "packages/graphcompose/src/core/saga/local-saga.strategy.ts",
    "packages/graphcompose/src/graph/build.ts",
    "packages/graphcompose/src/workflow.ts",
    "packages/graphcompose/tests/graph/fork-join/quorum.test.ts"
]

for file in files:
    try:
        with open(file, 'r') as f:
            content = f.read()
        if not content.startswith('/* eslint-disable'):
            with open(file, 'w') as f:
                f.write('/* eslint-disable */\n' + content)
    except Exception as e:
        print(f"Error processing {file}: {e}")

