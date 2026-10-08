const fs = require('fs');
const file = 'packages/graphcompose/src/testing/environment.ts';
let code = fs.readFileSync(file, 'utf-8');

if (!code.includes('mockWorkflow(')) {
  code = code.replace(
    /readonly #mocks = new Map<Class, unknown>\(\);/,
    'readonly #mocks = new Map<Class, unknown>();\n  readonly #workflowMocks = new Map<Class, import("vitest").Mock>();'
  );

  code = code.replace(
    /mockOf<T>\(cls: Class<T>\): Mocked<T> \{/,
    `mockWorkflow(cls: Class): import("vitest").Mock {
    let mock = this.#workflowMocks.get(cls);
    if (!mock) {
      if (this.#apps.length > 0) {
        throw new TestSetupError(
          \`mockWorkflow(\${cls.name}) after the app started: call it before the first app.execute(…)\`,
        );
      }
      const { vi } = require("vitest");
      mock = vi.fn();
      this.#workflowMocks.set(cls, mock);
    }
    return mock;
  }
  
  getMockedWorkflows() {
    return this.#workflowMocks;
  }

  mockOf<T>(cls: Class<T>): Mocked<T> {`
  );

  fs.writeFileSync(file, code);
}
