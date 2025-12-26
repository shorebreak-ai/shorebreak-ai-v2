// ============================================================================
// SHOREBREAK AI - API CLIENT (WEBHOOKS N8N)
// ============================================================================

import type { ReviewAnalysisInput, SEOAnalysisInput } from '../types';

// URLs des webhooks n8n
const N8N_WEBHOOKS = {
  reviews: 'https://shorebreak-ai.app.n8n.cloud/webhook-test/Form-submit',
  seo: 'https://shorebreak-ai.app.n8n.cloud/webhook-test/Form-shorebreak-submit',
};

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
    const response = await fetch(N8N_WEBHOOKS.reviews, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        google_maps_url: input.google_maps_url,
        quantity: input.quantity,
        sort_by: input.sort_by,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
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
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
      executionTime,
    };
  }
}

// ----------------------------------------------------------------------------
// Analyse SEO
// ----------------------------------------------------------------------------

export async function runSEOAnalysis(input: SEOAnalysisInput): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(N8N_WEBHOOKS.seo, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        website_url: input.website_url,
      }),
    });

    const executionTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
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
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
      executionTime,
    };
  }
}

// ----------------------------------------------------------------------------
// Extraction du score depuis les résultats
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
