export const problemLine = (problem) =>
  `${problem.code}  ${problem.key} = ${problem.value} — model ${problem.model}: ${problem.supported}`;
/** Every model setting that cannot work, all at once — raised before any model call. */
export class ConfigurationError extends Error {
  problems;
  name = "ConfigurationError";
  constructor(problems) {
    super(
      `${String(problems.length)} model setting(s) do not fit their models:\n${problems
        .map((problem) => `  ${problemLine(problem)}`)
        .join("\n")}`,
    );
    this.problems = problems;
  }
}
