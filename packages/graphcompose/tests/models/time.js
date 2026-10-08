import { seconds } from "../../src/units/index.js";
/** A short duration for tests (the public units start at seconds). */
export const milliseconds = (amount) => seconds(amount / 1000);
