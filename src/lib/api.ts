// ============================================================================
// SHOREBREAK AI - API CLIENT (N8N WEBHOOKS - ASYNC ARCHITECTURE)
// ============================================================================

import type { ReviewAnalysisInput, SEOAnalysisInput } from '../types';
import { supabase } from './supabase';

// N8N webhook URLs (PRODUCTION)
const N8N_WEBHOOKS = {
  reviews: 'https://shorebreak-ai.app.n8n.cloud/webhook/review-analysis',
  seo: 'https://shorebreak-ai.app.n8n.cloud/webhook/seo-audit',
};

// Timeout for initial webhook call (30 seconds - just to start the job)
const WEBHOOK_TIMEOUT = 30 * 1000;

// Polling configuration
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes max

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface AnalysisJob {
  id: string;
  user_id: string;
  type: 'reviews' | 'seo';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AnalysisResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime?: number;
  jobId?: string;
}

// ----------------------------------------------------------------------------
// Helper: Create job in database
// ----------------------------------------------------------------------------

async function createAnalysisJob(
  type: 'reviews' | 'seo',
  input: Record<string, unknown>
): Promise<{ jobId: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { jobId: '', error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('analysis_jobs')
    .insert({
      user_id: user.id,
      type,
      status: 'pending',
      input,
    })
    .select('id')
    .single();

  if (error) {
    return { jobId: '', error: error.message };
  }

  return { jobId: data.id };
}

// ----------------------------------------------------------------------------
// Helper: Update job status
// ----------------------------------------------------------------------------

async function updateJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  
  if (result) updates.result = result;
  if (error) updates.error = error;
  if (status === 'completed' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  await supabase
    .from('analysis_jobs')
    .update(updates)
    .eq('id', jobId);
}

// ----------------------------------------------------------------------------
// Helper: Poll for job completion
// ----------------------------------------------------------------------------

async function pollForCompletion(
  jobId: string,
  onProgress?: (status: string) => void
): Promise<AnalysisJob | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME) {
    const { data, error } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      console.error('Error polling job:', error);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      continue;
    }

    if (data.status === 'completed' || data.status === 'failed') {
      return data as AnalysisJob;
    }

    if (onProgress) {
      onProgress(data.status);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }

  return null; // Timeout
}

// ----------------------------------------------------------------------------
// Helper: Trigger webhook (fire and forget with short timeout)
// ----------------------------------------------------------------------------

async function triggerWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // We don't care about the response content for async mode
    // Just check if the request was accepted
    if (!response.ok && response.status !== 200) {
      return { success: false, error: `HTTP Error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    clearTimeout(timeoutId);
    
    // AbortError is expected if webhook takes longer than timeout
    // The job will still run on n8n side
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: true }; // Job was triggered, just took too long to respond
    }
    
    // Network errors might still mean the job was triggered
    if (error instanceof Error && error.message === 'Failed to fetch') {
      return { success: true }; // Assume job was triggered
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ----------------------------------------------------------------------------
// Review Analysis (Async)
// ----------------------------------------------------------------------------

export async function runReviewAnalysis(
  input: ReviewAnalysisInput,
  onProgress?: (status: string) => void
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // 1. Create job in database
  const { jobId, error: createError } = await createAnalysisJob('reviews', {
    google_maps_url: input.google_maps_url,
    period: input.period,
  });

  if (createError || !jobId) {
    return { success: false, error: createError || 'Failed to create job' };
  }

  // 2. Update status to processing
  await updateJobStatus(jobId, 'processing');

  // 3. Trigger n8n webhook with job_id
  const webhookResult = await triggerWebhook(N8N_WEBHOOKS.reviews, {
    job_id: jobId,
    google_maps_url: input.google_maps_url,
    period: input.period,
  });

  if (!webhookResult.success) {
    await updateJobStatus(jobId, 'failed', undefined, webhookResult.error);
    return { success: false, error: webhookResult.error, jobId };
  }

  // 4. Poll for completion
  if (onProgress) onProgress('processing');
  
  const completedJob = await pollForCompletion(jobId, onProgress);

  const executionTime = Date.now() - startTime;

  if (!completedJob) {
    return { 
      success: false, 
      error: 'Analysis timed out. Please check back later.', 
      executionTime,
      jobId 
    };
  }

  if (completedJob.status === 'failed') {
    return { 
      success: false, 
      error: completedJob.error || 'Analysis failed', 
      executionTime,
      jobId 
    };
  }

  return {
    success: true,
    data: completedJob.result,
    executionTime,
    jobId,
  };
}

// ----------------------------------------------------------------------------
// SEO Analysis (Async)
// ----------------------------------------------------------------------------

export async function runSEOAnalysis(
  input: SEOAnalysisInput,
  onProgress?: (status: string) => void
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // 1. Create job in database
  const { jobId, error: createError } = await createAnalysisJob('seo', {
    website_url: input.website_url,
  });

  if (createError || !jobId) {
    return { success: false, error: createError || 'Failed to create job' };
  }

  // 2. Update status to processing
  await updateJobStatus(jobId, 'processing');

  // 3. Trigger n8n webhook with job_id
  const webhookResult = await triggerWebhook(N8N_WEBHOOKS.seo, {
    job_id: jobId,
    website_url: input.website_url,
  });

  if (!webhookResult.success) {
    await updateJobStatus(jobId, 'failed', undefined, webhookResult.error);
    return { success: false, error: webhookResult.error, jobId };
  }

  // 4. Poll for completion
  if (onProgress) onProgress('processing');
  
  const completedJob = await pollForCompletion(jobId, onProgress);

  const executionTime = Date.now() - startTime;

  if (!completedJob) {
    return { 
      success: false, 
      error: 'Analysis timed out. Please check back later.', 
      executionTime,
      jobId 
    };
  }

  if (completedJob.status === 'failed') {
    return { 
      success: false, 
      error: completedJob.error || 'Analysis failed', 
      executionTime,
      jobId 
    };
  }

  return {
    success: true,
    data: completedJob.result,
    executionTime,
    jobId,
  };
}

// ----------------------------------------------------------------------------
// Get job status (for manual checking)
// ----------------------------------------------------------------------------

export async function getJobStatus(jobId: string): Promise<AnalysisJob | null> {
  const { data, error } = await supabase
    .from('analysis_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return null;
  return data as AnalysisJob;
}

// ----------------------------------------------------------------------------
// Score extraction from results
// ----------------------------------------------------------------------------

export function extractScoreFromResults(results: unknown, type: 'reviews' | 'seo'): number | null {
  if (!results) return null;

  // n8n can return an array with multiple objects
  if (Array.isArray(results)) {
    // Look for object containing score
    for (const item of results) {
      if (item && typeof item === 'object') {
        if (typeof item.score === 'number') return item.score;
        if (typeof item.overall_score === 'number') return item.overall_score;
        if (typeof item.seo_score === 'number') return item.seo_score;
      }
    }
    return null;
  }

  // If it's a simple object
  if (typeof results !== 'object') return null;

  const data = results as Record<string, unknown>;

  // Look for score directly
  if (typeof data.score === 'number') return data.score;
  if (typeof data.overall_score === 'number') return data.overall_score;
  if (typeof data.seo_score === 'number') return data.seo_score;

  if (type === 'reviews') {
    // For reviews, we can calculate a score based on sentiment
    if (data.sentiment_analysis && typeof data.sentiment_analysis === 'object') {
      const sentiment = data.sentiment_analysis as Record<string, number>;
      if (typeof sentiment.positive === 'number') {
        return Math.round(sentiment.positive);
      }
    }
    // Or use average rating
    if (typeof data.average_rating === 'number') {
      return Math.round((data.average_rating / 5) * 100);
    }
  }

  return null;
}
