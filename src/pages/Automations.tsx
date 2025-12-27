// ============================================================================
// SHOREBREAK AI - PAGE AUTOMATIONS
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Star, 
  TrendingUp, 
  Sparkles, 
  X, 
  MapPin, 
  Globe 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyses } from '../hooks';
import { runReviewAnalysis, runSEOAnalysis, extractScoreFromResults } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge, Input } from '../components/ui';
import { LoadingState } from '../components/shared/LoadingState';
import { isValidGoogleMapsUrl, isValidUrl } from '../lib/utils';

export default function Automations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { createAnalysis } = useAnalyses();

  // Modal state
  const [modalType, setModalType] = useState<'reviews' | 'seo' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'reviews' | 'seo'>('reviews');
  const [error, setError] = useState<string | null>(null);

  // Form state - Reviews
  const [mapUrl, setMapUrl] = useState(profile?.google_maps_url || '');
  const [reviewPeriod, setReviewPeriod] = useState('6months');

  // Form state - SEO
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || '');

  // Open modal from navigation state (from Dashboard quick actions)
  useEffect(() => {
    const state = location.state as { openModal?: 'reviews' | 'seo' } | null;
    if (state?.openModal) {
      setModalType(state.openModal);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Pre-fill URLs from profile
  useEffect(() => {
    if (profile?.google_maps_url && !mapUrl) {
      setMapUrl(profile.google_maps_url);
    }
    if (profile?.website_url && !websiteUrl) {
      setWebsiteUrl(profile.website_url);
    }
  }, [profile, mapUrl, websiteUrl]);

  // Launch analysis
  const launchAnalysis = async (type: 'reviews' | 'seo') => {
    setError(null);

    // Validation
    if (type === 'reviews') {
      if (!mapUrl) {
        setError('Please enter a Google Maps URL');
        return;
      }
      if (!isValidGoogleMapsUrl(mapUrl)) {
        setError('Please enter a valid Google Maps URL');
        return;
      }
    }

    if (type === 'seo') {
      if (!websiteUrl) {
        setError('Please enter a website URL');
        return;
      }
      if (!isValidUrl(websiteUrl)) {
        setError('Please enter a valid website URL');
        return;
      }
    }

    setIsLoading(true);
    setLoadingType(type);
    setModalType(null);

    try {
      let result;

      if (type === 'reviews') {
        result = await runReviewAnalysis({
          google_maps_url: mapUrl,
          period: reviewPeriod,
        });
      } else {
        result = await runSEOAnalysis({
          website_url: websiteUrl,
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Extract score from results
      const score = extractScoreFromResults(result.data, type);

      // Extract Google Metrics from Reviews analysis
      let googleRating: number | null = null;
      let googleReviewCount: number | null = null;
      
      if (type === 'reviews' && result.data) {
        const data = Array.isArray(result.data) ? result.data[0] : result.data;
        if (data) {
          googleRating = typeof data.rating === 'number' ? data.rating : null;
          googleReviewCount = typeof data.reviewCount === 'number' ? data.reviewCount : null;
        }
      }

      // Save analysis to database
      const { data: savedAnalysis, error: saveError } = await createAnalysis({
        user_id: profile!.id,
        type,
        input_data: type === 'reviews' 
          ? { google_maps_url: mapUrl, period: reviewPeriod }
          : { website_url: websiteUrl },
        results: result.data as Record<string, unknown>,
        score,
        execution_time_ms: result.executionTime || null,
        tokens_used: null,
      });

      if (saveError) {
        console.error('Error saving analysis:', saveError);
      }

      // Save Google Metrics to history (for Reviews analysis only)
      if (type === 'reviews' && (googleRating !== null || googleReviewCount !== null)) {
        const { error: metricsError } = await supabase
          .from('google_metrics_history')
          .insert({
            user_id: profile!.id,
            google_rating: googleRating,
            review_count: googleReviewCount,
            recorded_at: new Date().toISOString(),
          });

        if (metricsError) {
          console.error('Error saving Google metrics:', metricsError);
        } else {
          console.log('Google metrics saved:', { googleRating, googleReviewCount });
        }
      }

      // Navigate to results
      navigate('/results', { 
        state: { 
          type,
          results: result.data,
          analysisId: savedAnalysis?.id,
        } 
      });

    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setModalType(type); // Re-open modal to show error
    }
  };

  // Loading Screen
  if (isLoading) {
    return <LoadingState type={loadingType} />;
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-lg bg-white shadow-2xl animate-slide-up p-0">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {modalType === 'reviews' 
                  ? 'Configure Review Analysis' 
                  : 'Configure SEO Audit'}
              </h3>
              <button
                onClick={() => {
                  setModalType(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {modalType === 'reviews' ? (
                <>
                  <Input
                    label="Google Maps URL"
                    placeholder="https://google.com/maps/place/..."
                    icon={<MapPin className="w-4 h-4" />}
                    value={mapUrl}
                    onChange={(e) => setMapUrl(e.target.value)}
                    helperText="Paste the full URL of your Google Maps listing"
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Analysis Period
                    </label>
                    <select
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                      value={reviewPeriod}
                      onChange={(e) => setReviewPeriod(e.target.value)}
                    >
                      <option value="3months">Last 3 months</option>
                      <option value="6months">Last 6 months</option>
                      <option value="12months">Last 12 months</option>
                      <option value="all">All reviews (max 100)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Recent reviews give the most accurate picture of your current reputation.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Website URL"
                    placeholder="https://www.yourclinic.com"
                    icon={<Globe className="w-4 h-4" />}
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    helperText="Enter your practice's main website"
                  />
                  <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    Our agent will crawl the public facing pages of your site to
                    determine speed, structure, and keyword density.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-xl">
              <Button
                variant="ghost"
                onClick={() => {
                  setModalType(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => launchAnalysis(modalType)}>
                Start Analysis
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          AI Automations
        </h2>
        <p className="text-slate-500 mt-1">
          Select an agent to analyze and optimize your practice.
        </p>
      </div>

      {/* Automation Cards - Grid scalable */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Review Analysis Card */}
        <Card 
          hover
          className="relative overflow-hidden cursor-pointer group"
          onClick={() => setModalType('reviews')}
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
          
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              <Badge variant="success" className="text-xs">Ready</Badge>
            </div>
            
            {/* Content */}
            <h3 className="text-base font-semibold text-slate-900 mb-1.5 group-hover:text-slate-700 transition-colors">
              Review Analysis
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Turn patient feedback into your competitive advantage. Discover what makes them loyal.
            </p>
            
            {/* Features - Compact */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Sentiment</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Insights</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Actions</span>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Launch <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>
        </Card>

        {/* SEO Analysis Card */}
        <Card 
          hover
          className="relative overflow-hidden cursor-pointer group"
          onClick={() => setModalType('seo')}
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
          
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-50 transition-colors">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <Badge variant="success" className="text-xs">Ready</Badge>
            </div>
            
            {/* Content */}
            <h3 className="text-base font-semibold text-slate-900 mb-1.5 group-hover:text-slate-700 transition-colors">
              SEO & Visibility
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Get found by the right patients. Dominate local search and outrank your competitors.
            </p>
            
            {/* Features - Compact */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Technical</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Local SEO</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-500 text-xs rounded-md">Keywords</span>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                Launch <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>
        </Card>

        {/* Coming Soon Card */}
        <Card className="relative overflow-hidden opacity-50">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300" />
          
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-xs text-slate-400 font-medium">Coming Soon</span>
            </div>
            
            {/* Content */}
            <h3 className="text-base font-semibold text-slate-400 mb-1.5">
              More Agents
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Powerful new ways to grow your practice and delight your patients.
            </p>
            
            {/* Features - Compact */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-md">Social</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-md">Email</span>
              <span className="px-2 py-1 bg-slate-50 text-slate-400 text-xs rounded-md">Ads</span>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Stay tuned
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
