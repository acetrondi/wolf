import { loadEnv } from "@wolf/config";

export async function register() {
  // Fail fast on missing/invalid env before serving requests.
  loadEnv();
}
