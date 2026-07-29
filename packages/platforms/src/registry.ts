import { PLATFORM_CONFIG } from "./platform.config";

/** Backwards-compatible registry used by renderers and server actions. */
export const PLATFORM_REGISTRY = PLATFORM_CONFIG;
export const PLATFORM_BY_SLUG = new Map(
  PLATFORM_REGISTRY.map((config) => [config.slug, config]),
);
