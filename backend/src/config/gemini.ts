import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Load primary key and the rotated keys from environment variables
const apiKeys = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_API_KEY // Fallback / default key
].filter(Boolean) as string[];

if (apiKeys.length === 0) {
  console.warn(
    'WARNING: No Gemini API keys (GEMINI_KEY_1, GEMINI_KEY_2, GEMINI_KEY_3, GEMINI_API_KEY) are defined in the environment variables.\n' +
    'Generative AI features will fail or return mock responses.'
  );
}

let currentKeyIndex = 0;

/**
 * Returns an instance of GoogleGenAI using the currently active API key.
 */
export function getGeminiClient(): GoogleGenAI {
  const activeKey = apiKeys[currentKeyIndex] || 'MISSING_API_KEY';
  return new GoogleGenAI({ apiKey: activeKey });
}

/**
 * Rotates to the next available API key in the list.
 */
export function rotateApiKey(): void {
  if (apiKeys.length <= 1) return;
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.warn(`[ROTATION] Switched to Gemini API Key Index: ${currentKeyIndex}`);
}



/**
 * A robust helper function to execute a Gemini API call with auto-failover and rotation on 429 errors.
 * This can be used to run any code that takes the initialized GoogleGenAI instance.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withGeminiFailover<T>(
  operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  const keysToTry = Math.max(apiKeys.length, 1);
  let lastError: any = null;

  for (let attempt = 0; attempt < keysToTry; attempt++) {
    try {
      const ai = getGeminiClient();
      console.log(`[GEMINI REQUEST] Attempt ${attempt + 1} of ${keysToTry} using API Key Index: ${currentKeyIndex}`);
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const statusCode = error.status || error.statusCode || error.code;
      const errorMessage = (error.message || '').toString();
      
      // Identify transient errors (429 Rate Limit, 503 Unavailable, 500 Internal, 502/504, Timeout, Network issues)
      const isRateLimit = 
        statusCode === 429 || 
        errorMessage.includes('429') || 
        errorMessage.includes('ResourceExhausted') || 
        errorMessage.includes('Quota exceeded');
        
      // Check if error is specifically an invalid/revoked API key (which returns 400 API_KEY_INVALID)
      const isInvalidKey = 
        statusCode === 400 && 
        (errorMessage.includes('API key not valid') || 
         errorMessage.includes('API_KEY_INVALID') ||
         errorMessage.includes('key is invalid') ||
         errorMessage.includes('Key not valid'));

      const isTransientServerError = 
        statusCode === 500 || 
        statusCode === 502 || 
        statusCode === 503 || 
        statusCode === 504 || 
        errorMessage.includes('500') || 
        errorMessage.includes('502') || 
        errorMessage.includes('503') || 
        errorMessage.includes('504') || 
        errorMessage.includes('UNAVAILABLE') || 
        errorMessage.includes('INTERNAL') || 
        errorMessage.includes('high demand') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('fetch');

      if (isRateLimit || isTransientServerError || isInvalidKey) {
        let errorType = `Transient Server Error (${statusCode || 'unknown'})`;
        if (isRateLimit) errorType = '429 Rate Limit';
        if (isInvalidKey) errorType = '400 Invalid API Key';

        console.warn(`[FAILOVER] Attempt ${attempt + 1} failed with ${errorType}. Message: "${errorMessage.substring(0, 100)}".`);
        
        if (attempt < keysToTry - 1) {
          // Implement jittered exponential backoff: base 500ms * (2^attempt) + random jitter
          const baseDelay = 500 * Math.pow(2, attempt);
          const jitter = Math.random() * 200;
          const backoffTime = baseDelay + jitter;
          
          console.warn(`[FAILOVER] Backing off for ${Math.round(backoffTime)}ms, rotating API key, and retrying...`);
          await delay(backoffTime);
          rotateApiKey();
        }
      } else {
        // For non-transient errors (e.g. syntax, parsing, invalid schema parameters), fail immediately
        console.error(`[FAILOVER CRITICAL] Non-transient error encountered: "${errorMessage}". Aborting rotation.`);
        throw error;
      }
    }
  }

  // If all keys failed
  throw lastError || new Error('All Gemini API keys exhausted due to transient errors or rate limits.');
}
