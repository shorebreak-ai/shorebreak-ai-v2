// ============================================================================
// SHOREBREAK AI - API CLIENT (N8N WEBHOOKS)
// ============================================================================

import type { ReviewAnalysisInput, SEOAnalysisInput } from '../types';

// N8N webhook URLs (PRODUCTION)
const N8N_WEBHOOKS = {
  reviews: 'https://shorebreak-ai.app.n8n.cloud/webhook/review-analysis',
  seo: 'https://shorebreak-ai.app.n8n.cloud/webhook/seo-audit',
};

// 10 minute timeout for long analyses (in ms)
const API_TIMEOUT = 10 * 60 * 1000;

// ----------------------------------------------------------------------------
// Helper: Fetch with timeout and retry
// ----------------------------------------------------------------------------

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      keepalive: true,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Analysis timed out after 10 minutes. Please try again.');
      }
      if (error.message === 'Failed to fetch') {
        throw new Error('Connection lost. The analysis may still be running. Please check back in a few minutes.');
      }
    }
    throw error;
  }
}

// ----------------------------------------------------------------------------
// Analyse des Reviews Google
// ----------------------------------------------------------------------------

export async function runReviewAnalysis(input: ReviewAnalysisInput): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      N8N_WEBHOOKS.reviews,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          google_maps_url: input.google_maps_url,
          quantity: input.quantity,
          sort_by: input.sort_by,
        }),
      },
      API_TIMEOUT
    );

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
      executionTime,
    };
  }
}

// ----------------------------------------------------------------------------
// SEO Analysis
// ----------------------------------------------------------------------------

export async function runSEOAnalysis(input: SEOAnalysisInput): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(
      N8N_WEBHOOKS.seo,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          website_url: input.website_url,
        }),
      },
      API_TIMEOUT
    );

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
      executionTime,
    };
  }
}

// ----------------------------------------------------------------------------
// Score extraction from results
// ----------------------------------------------------------------------------

export function extractScoreFromResults(results: unknown, type: 'reviews' | 'seo'): number | null {
  if (!results) return null;

  // n8n peut retourner un array avec plusieurs objets
  if (Array.isArray(results)) {
    // Chercher l'objet qui contient le score
    for (const item of results) {
      if (item && typeof item === 'object') {
        if (typeof item.score === 'number') return item.score;
        if (typeof item.overall_score === 'number') return item.overall_score;
        if (typeof item.seo_score === 'number') return item.seo_score;
      }
    }
    return null;
  }

  // Si c'est un objet simple
  if (typeof results !== 'object') return null;

  const data = results as Record<string, unknown>;

  // Chercher le score directement
  if (typeof data.score === 'number') return data.score;
  if (typeof data.overall_score === 'number') return data.overall_score;
  if (typeof data.seo_score === 'number') return data.seo_score;

  if (type === 'reviews') {
    // Pour les reviews, on peut calculer un score basé sur le sentiment
    if (data.sentiment_analysis && typeof data.sentiment_analysis === 'object') {
      const sentiment = data.sentiment_analysis as Record<string, number>;
      if (typeof sentiment.positive === 'number') {
        return Math.round(sentiment.positive);
      }
    }
    // Ou utiliser la note moyenne
    if (typeof data.average_rating === 'number') {
      return Math.round((data.average_rating / 5) * 100);
    }
  }

  return null;
}
