/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenUsageReport {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
}

export interface AIRateLimiterState {
  tokensRemaining: number;
  maxTokens: number;
  resetIntervalMs: number;
  lastReset: number;
}

export class GeminiAIClient {
  private static rateLimiter: AIRateLimiterState = {
    tokensRemaining: 60,
    maxTokens: 60,
    resetIntervalMs: 60000,
    lastReset: Date.now()
  };

  private static totalTokensConsumed: number = 0;
  private static totalCostAccumulated: number = 0;

  // Check rate limit quota (Max 60 requests per minute)
  public static checkRateLimit(): { allowed: boolean; remaining: number; waitTimeMs?: number } {
    const now = Date.now();
    if (now - this.rateLimiter.lastReset > this.rateLimiter.resetIntervalMs) {
      this.rateLimiter.tokensRemaining = this.rateLimiter.maxTokens;
      this.rateLimiter.lastReset = now;
    }

    if (this.rateLimiter.tokensRemaining <= 0) {
      const waitTime = this.rateLimiter.resetIntervalMs - (now - this.rateLimiter.lastReset);
      return { allowed: false, remaining: 0, waitTimeMs: waitTime };
    }

    this.rateLimiter.tokensRemaining--;
    return { allowed: true, remaining: this.rateLimiter.tokensRemaining };
  }

  // Sanitize user inputs against XSS and injection attacks
  public static sanitizeInput(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[Sanitized script]')
      .replace(/javascript:/gi, '')
      .replace(/onerror=/gi, '')
      .replace(/onload=/gi, '');
  }

  // Estimate Token Count & Cost ($0.075 per 1M input tokens, $0.30 per 1M output tokens for Gemini 2.5 Flash)
  public static calculateUsage(prompt: string, response: string): TokenUsageReport {
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(response.length / 4);
    const totalTokens = promptTokens + completionTokens;

    const inputCost = (promptTokens / 1_000_000) * 0.075;
    const outputCost = (completionTokens / 1_000_000) * 0.30;
    const estimatedCostUSD = Number((inputCost + outputCost).toFixed(6));

    this.totalTokensConsumed += totalTokens;
    this.totalCostAccumulated += estimatedCostUSD;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD
    };
  }

  // Get Cumulative Usage Stats
  public static getStats() {
    return {
      totalTokensConsumed: this.totalTokensConsumed,
      totalCostUSD: Number(this.totalCostAccumulated.toFixed(6)),
      rateLimitRemaining: this.rateLimiter.tokensRemaining
    };
  }
}
