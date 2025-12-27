// ============================================================================
// SHOREBREAK AI - TYPES TYPESCRIPT
// ============================================================================

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------

export type UserRole = 'admin' | 'user';
export type AnalysisType = 'reviews' | 'seo';

// ----------------------------------------------------------------------------
// Database Types
// ----------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  google_maps_url: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  notifications_enabled: boolean;
  weekly_digest: boolean;
  data_retention_consent: boolean;
  data_retention_consent_date: string | null;
  marketing_consent: boolean;
  marketing_consent_date: string | null;
  updated_at: string;
}

export interface GoogleMetricsHistory {
  id: string;
  user_id: string;
  google_rating: number | null;
  review_count: number | null;
  recorded_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  type: AnalysisType;
  input_data: Record<string, unknown>;
  results: Record<string, unknown> | null;
  score: number | null;
  execution_time_ms: number | null;
  tokens_used: number | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ----------------------------------------------------------------------------
// API Types
// ----------------------------------------------------------------------------

export interface ReviewAnalysisInput {
  google_maps_url: string;
  period: '3months' | '6months' | '12months' | 'all';
}

export interface SEOAnalysisInput {
  website_url: string;
}

export interface ReviewAnalysisResult {
  summary: string;
  average_rating: number;
  total_reviews: number;
  sentiment_analysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
  key_themes: string[];
  recommendations: string[];
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    date: string;
  }>;
}

export interface SEOAnalysisResult {
  score: number;
  summary: string;
  technical_health: {
    score: number;
    issues: string[];
  };
  content_quality: {
    score: number;
    recommendations: string[];
  };
  local_seo: {
    score: number;
    recommendations: string[];
  };
  keywords: Array<{
    keyword: string;
    position: number;
    opportunity: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: string;
  }>;
}

// ----------------------------------------------------------------------------
// Dashboard Types
// ----------------------------------------------------------------------------

export interface DashboardStats {
  current_rating: number | null;
  current_review_count: number | null;
  first_rating: number | null;
  first_review_count: number | null;
  total_analyses: number;
  last_seo_score: number | null;
  metrics_history: GoogleMetricsHistory[] | null;
}

export interface AdminStats {
  total_users: number;
  total_analyses: number;
  analyses_this_month: number;
  total_tokens_used: number;
  weekly_activity: Array<{
    week: string;
    type: AnalysisType;
    count: number;
  }> | null;
  recent_activity: Array<{
    action: string;
    user_email: string;
    created_at: string;
    details: Record<string, unknown>;
  }> | null;
}

// ----------------------------------------------------------------------------
// Auth Types
// ----------------------------------------------------------------------------

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  google_maps_url?: string;
  website_url?: string;
  data_retention_consent: boolean;
}

export interface SignInData {
  email: string;
  password: string;
}

// ----------------------------------------------------------------------------
// UI Types
// ----------------------------------------------------------------------------

export interface LoadingPhase {
  text: string;
  duration: number;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  badge?: string;
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
}

// ----------------------------------------------------------------------------
// Form Types
// ----------------------------------------------------------------------------

export interface ReviewFormData {
  google_maps_url: string;
  period: string;
}

export interface SEOFormData {
  website_url: string;
}

export interface SettingsFormData {
  google_maps_url: string;
  website_url: string;
  notifications_enabled: boolean;
  weekly_digest: boolean;
}

// ----------------------------------------------------------------------------
// Export Data (RGPD)
// ----------------------------------------------------------------------------

export interface UserDataExport {
  exported_at: string;
  user_profile: User;
  user_settings: UserSettings;
  google_metrics_history: GoogleMetricsHistory[];
  analyses: Analysis[];
  activity_logs: ActivityLog[];
}
