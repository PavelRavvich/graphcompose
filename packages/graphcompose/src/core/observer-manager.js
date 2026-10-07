export class ObserverManager {
    instances = [];
    constructor(containerInstances) {
        this.instances = containerInstances;
    }
    async dispatch(methodName, ...args) {
        for (const instance of this.instances) {
            if (typeof instance[methodName] === "function") {
                await instance[methodName](...args);
            }
        }
    }
    async onWorkflowStart(state) {
        return this.dispatch("onWorkflowStart", state);
    }
    async onWorkflowEnd(result, state) {
        return this.dispatch("onWorkflowEnd", result, state);
    }
    async onAgentStart(ctx) {
        return this.dispatch("onAgentStart", ctx);
    }
    async onAgentEnd(ctx) {
        return this.dispatch("onAgentEnd", ctx);
    }
    async onRouterStart(ctx) {
        return this.dispatch("onRouterStart", ctx);
    }
    async onRouterEnd(ctx) {
        return this.dispatch("onRouterEnd", ctx);
    }
    async onToolStart(ctx) {
        return this.dispatch("onToolStart", ctx);
    }
    async onToolEnd(ctx) {
        return this.dispatch("onToolEnd", ctx);
    }
    async onModelStart(req) {
        return this.dispatch("onModelStart", req);
    }
    async onModelEnd(res) {
        return this.dispatch("onModelEnd", res);
    }
    async onRagStart(ctx) {
        return this.dispatch("onRagStart", ctx);
    }
    async onRagEnd(ctx) {
        return this.dispatch("onRagEnd", ctx);
    }
    async onGuardrailStart(ctx) {
        return this.dispatch("onGuardrailStart", ctx);
    }
    async onGuardrailEnd(ctx) {
        return this.dispatch("onGuardrailEnd", ctx);
    }
    async onPiiPolicyStart(ctx) {
        return this.dispatch("onPiiPolicyStart", ctx);
    }
    async onPiiPolicyEnd(ctx) {
        return this.dispatch("onPiiPolicyEnd", ctx);
    }
    async onActionStart(ctx) {
        return this.dispatch("onActionStart", ctx);
    }
    async onActionEnd(ctx) {
        return this.dispatch("onActionEnd", ctx);
    }
    async onChannelStart(ctx) {
        return this.dispatch("onChannelStart", ctx);
    }
    async onChannelEnd(ctx) {
        return this.dispatch("onChannelEnd", ctx);
    }
    async onError(error, state) {
        return this.dispatch("onError", error, state);
    }
}
