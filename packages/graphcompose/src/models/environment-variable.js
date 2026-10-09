export class MissingEnvironmentVariableError extends Error {
  name = "MissingEnvironmentVariableError";
}
/**
 * A setting read from the process environment, named in the code and never written into it:
 * `EnvironmentVariable.named("OPENROUTER_API_KEY", { secret: true })`.
 */
export class EnvironmentVariable {
  name;
  isSecret;
  defaultValue;
  constructor(name, isSecret, defaultValue) {
    this.name = name;
    this.isSecret = isSecret;
    this.defaultValue = defaultValue;
  }
  static named(name, options = { secret: false }) {
    return new EnvironmentVariable(name, options.secret, options.defaultValue);
  }
  /** The value in `env`, the default when unset; `undefined` when neither. */
  valueIn(env) {
    const value = env[this.name];
    return value === undefined || value === "" ? this.defaultValue : value;
  }
  /** The value in `env`; fails when it is unset and has no default. */
  requireIn(env) {
    const value = this.valueIn(env);
    if (value === undefined) throw new MissingEnvironmentVariableError(`${this.name} is not set`);
    return value;
  }
  toString() {
    return `$${this.name}`;
  }
}
export const settingValueIn = (value, env) =>
  typeof value === "string" ? value : value.requireIn(env);
