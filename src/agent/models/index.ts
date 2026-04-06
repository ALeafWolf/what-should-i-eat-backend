import { ChatOpenAI } from "@langchain/openai";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Required environment variable "${name}" is not set. Check your .env file.`);
  return val;
}

export const basicModel = new ChatOpenAI({
  model: requireEnv("BASIC_MODEL"),
  temperature: 0,
  apiKey: requireEnv("OPENAI_API_KEY"),
});

export const advancedModel = new ChatOpenAI({
  model: requireEnv("ADVANCED_MODEL"),
  temperature: 0,
  apiKey: requireEnv("OPENAI_API_KEY"),
});

// Lightweight model for intent classification and routing.
// Falls back to basicModel if ROUTING_MODEL env var is not configured.
export const routingModel = new ChatOpenAI({
  model: process.env["ROUTING_MODEL"] ?? requireEnv("BASIC_MODEL"),
  temperature: 0,
  apiKey: requireEnv("OPENAI_API_KEY"),
});
