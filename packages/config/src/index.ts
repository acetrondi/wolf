import { loadEnv } from "./env";

export { type Env, loadEnv } from "./env";

/** Parsed once when first imported by server code. Use `loadEnv` in tests. */
export const env = loadEnv();
