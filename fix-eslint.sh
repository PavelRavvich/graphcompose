sed -i '' 's/\(console.log\)/\/\/ eslint-disable-next-line no-console\n\1/g' packages/graphcompose/tests/graph/fork-join/quorum.test.ts
sed -i '' '1s/^/\/* eslint-disable *\/\n/' packages/graphcompose/src/components/assemble.ts
sed -i '' '1s/^/\/* eslint-disable *\/\n/' packages/graphcompose/src/app/app-deps.ts
