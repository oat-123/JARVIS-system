import { sheets_v4 } from 'googleapis';

interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...defaultConfig, ...config };
  let lastError: any;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on quota exceeded errors (429)
      if (error?.code !== 429 || attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Wait before retrying
      await wait(delay);
      
      // Increase delay for next attempt, but don't exceed maxDelayMs
      delay = Math.min(
        delay * finalConfig.backoffMultiplier,
        finalConfig.maxDelayMs
      );
    }
  }

  throw lastError;
}

export async function rateLimitedSheetsOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  return withRetry(operation, {
    maxRetries: 3,
    initialDelayMs: 2000,  // Start with a 2 second delay
    maxDelayMs: 10000,     // Maximum delay of 10 seconds
    backoffMultiplier: 2   // Double the delay after each retry
  });
}