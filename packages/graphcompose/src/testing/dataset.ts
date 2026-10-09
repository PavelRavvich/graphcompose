export interface TestCase<TInput = unknown, TExpected = unknown> {
  id?: string;
  input: TInput;
  expected?: TExpected;
  context?: Record<string, unknown>;
}

export class Dataset<TInput = unknown, TExpected = unknown> {
  constructor(public readonly cases: TestCase<TInput, TExpected>[]) {}

  static from<TInput, TExpected>(cases: TestCase<TInput, TExpected>[]): Dataset<TInput, TExpected> {
    return new Dataset(cases);
  }
}
