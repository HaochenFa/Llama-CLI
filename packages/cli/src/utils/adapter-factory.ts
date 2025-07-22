/**
 * Adapter factory for creating LLM adapters
 */

import { OllamaAdapter } from "@llamacli/core";

export async function createAdapter(profile: any, config: any) {
  switch (profile.adapter) {
    case "ollama":
      return new OllamaAdapter({
        type: "ollama",
        endpoint: profile.endpoint || "http://localhost:11434",
        model: profile.model,
        timeout: profile.timeout || 30000,
        retries: profile.retries || 3,
      });
    
    case "openai":
      // TODO: Implement OpenAI adapter
      throw new Error("OpenAI adapter not yet implemented");
    
    case "claude":
      // TODO: Implement Claude adapter
      throw new Error("Claude adapter not yet implemented");
    
    case "vllm":
      // TODO: Implement vLLM adapter
      throw new Error("vLLM adapter not yet implemented");
    
    default:
      throw new Error(`Unsupported adapter type: ${profile.adapter}`);
  }
}
