import { Groq } from "groq-sdk";
import { ENV } from "./env.config.js";

if (!ENV.GROQ_API_KEY) {
  console.warn("[Groq] WARNING: GROQ_API_KEY is not configured. LLM features will not work.");
}

export const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
});

// Model fallback chain
const MODELS = [
  "openai/gpt-oss-120b",      // Primary
  "llama-3.3-70b-versatile",  // Fallback 1
  "openai/gpt-oss-20b",       // Fallback 2
];

/**
 * Call Groq LLM for text generation
 * @param {string} userMessage - The user message/prompt
 * @param {Object} options - Additional options
 * @returns {Promise<string>} The response text
 */
export async function callGroqLLM(userMessage, options = {}) {
  const {
    models = MODELS,
    temperature = 0.7,
    maxTokens = 1024,
    stream = false,
  } = options;

  let lastError;
  for (const model of models) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        model,
        temperature,
        max_completion_tokens: maxTokens,
        stream,
      });

      if (stream) {
        // Return stream for streaming responses
        return chatCompletion;
      }

      // For non-streaming, extract and return the text
      return chatCompletion.choices[0]?.message?.content || "";
    } catch (error) {
      lastError = error;
      console.warn(`[Groq] Model ${model} failed:`, error.message);
      // Continue to next model
    }
  }

  console.error("[Groq] All models failed. Last error:", lastError.message);
  throw lastError;
}

/**
 * Stream Groq LLM response in real-time
 * @param {string} userMessage - The user message/prompt
 * @param {Object} options - Additional options
 * @returns {AsyncGenerator} Stream of text chunks
 */
export async function* streamGroqLLM(userMessage, options = {}) {
  const {
    models = MODELS,
    temperature = 0.7,
    maxTokens = 8192,
  } = options;

  let lastError;
  for (const model of models) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
        model,
        temperature,
        max_completion_tokens: maxTokens,
        stream: true,
      });

      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[Groq] Model ${model} failed:`, error.message);
      // Continue to next model
    }
  }

  console.error("[Groq] All models failed. Last error:", lastError.message);
  throw lastError;
}
