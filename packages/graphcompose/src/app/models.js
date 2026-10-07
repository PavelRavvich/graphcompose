import { createProviderGateway } from "../llm/gateway.js";
import { checkModelUses, resolutionProblems } from "../models/check.js";
import { ConfigurationError } from "../models/problems.js";
import { modelUsesOf } from "../models/uses.js";
import { directoryOf, modelSummaryOf, withProviderPrices } from "../models/workflow-models.js";
/** The production clients' options from the app's: the environment and, in tests, a stub client. */
export const providerClientsOf = (options, env) => ({
    env,
    ...(options.providerFetch === undefined ? {} : { send: options.providerFetch }),
});
/**
 * Fails fast, before any model call: every model must have exactly one provider; with the
 * production gateway (none given), every setting is also checked against what its model supports.
 */
export async function modelsFor(bundle, given, clients) {
    const directory = directoryOf(bundle.models);
    const uses = modelUsesOf(bundle.config, bundle.routers);
    const unresolved = resolutionProblems(uses, directory);
    if (unresolved.length > 0)
        throw new ConfigurationError(unresolved);
    // the production gateway reads every provider's key: a missing one fails before the model check
    const gateway = given ?? createProviderGateway(directory, clients);
    if (given === undefined) {
        const problems = await checkModelUses(uses, directory, clients);
        if (problems.length > 0)
            throw new ConfigurationError(problems);
    }
    return {
        gateway,
        priced: (config) => withProviderPrices(config, directory),
        summary: modelSummaryOf(uses, directory),
    };
}
