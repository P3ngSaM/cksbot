/**
 * OpenAI provider (stub for future implementation)
 */

import type { Config } from "../../config/schema.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("openai");

/**
 * OpenAI provider is not yet implemented
 * This is a placeholder for future integration
 */
export function getOpenAIClient(_config: Config): never {
  throw new Error("OpenAI provider not yet implemented");
}

export function resetOpenAIClient(): void {
  logger.debug("OpenAI client reset (no-op)");
}
