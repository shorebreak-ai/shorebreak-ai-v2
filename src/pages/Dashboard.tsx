// ============================================================================
// SHOREBREAK AI - PAGE DASHBOARD (Optimisé & Premium)
// ============================================================================

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, 
  MessageSquare, 
  TrendingUp, 
  Activity,
  PlayCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStats, useGoogleMetrics, useAnalyses } from '../hooks';
import { Card, Button, Spinner } from '../components/ui';
import { formatDate, getMonthLabel } from '../lib/utils';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type TrendType = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: string;
    type: TrendType;
  };
  subLabel?: string;
}

// ----------------------------------------------------------------------------
// Metric Card Component - Premium Design
// ----------------------------------------------------------------------------

const MetricCard: React.FC<MetricCardProps> = ({ 
  title,
  value, 
  icon: Icon,
  iconBgColor,
  iconColor,
  trend,
  subLabel,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.type === 'up') return <ArrowUpRight className="w-3.5 h-3.5" />;
    if (trend.type === 'down') return <ArrowDownRight className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.type === 'up') return 'text-emerald-600 bg-emerald-50 ring-emerald-600/10';
    if (trend.type === 'down') return 'text-red-500 bg-red-50 ring-red-500/10';
    return 'text-slate-500 bg-slate-50 ring-slate-500/10';
  };

  return (
    <Card hover className="relative overflow-hidden p-4 h-[120px] flex flex-col justify-between">
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${iconBgColor}`} />
      
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${iconBgColor}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend && trend.value !== '0' && trend.value !== '0.0' && (
          <div className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ring-1 ring-inset ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">{trend.value}</span>
          </div>
        )}
      </div>
      
      <div>
        <p className="text-xs font-medium text-slate-500 mb-0.5">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
          {subLabel && <span className="text-xs text-slate-400">{subLabel}</span>}
        </div>
      </div>
    </Card>
  );
};

// ----------------------------------------------------------------------------
// Dashboard Component
// ----------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { loading: statsLoading } = useDashboardStats();
  const { metrics, currentMetrics } = useGoogleMetrics();
  const { analyses } = useAnalyses();

  // Get first name
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Prepare chart data from metrics history
  const chartData = useMemo(() => {
    if (!metrics || metrics.length === 0) {
      return [];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const filteredMetrics = metrics
      .filter(m => new Date(m.recorded_at) >= sixMonthsAgo && m.google_rating !== null)
      .slice()
      .reverse();

    if (filteredMetrics.length === 0) {
      return [];
    }

    return filteredMetrics.map((m) => ({
      name: getMonthLabel(m.recorded_at),
      score: m.google_rating || 0,
      reviews: m.review_count || 0,
      date: new Date(m.recorded_at).toLocaleDateString('fr-FR'),
    }));
  }, [metrics]);

  const hasChartData = chartData.length > 0;

  // Calculate impact stats
  const impactStats = useMemo(() => {
    const firstMetric = metrics?.[metrics.length - 1];
    const lastMetric = metrics?.[0];

    const reviewsGained = 
      lastMetric?.review_count && firstMetric?.review_count
        ? lastMetric.review_count - firstMetric.review_count
        : 0;

    const ratingChange =
      lastMetric?.google_rating && firstMetric?.google_rating
        ? lastMetric.google_rating - firstMetric.google_rating
        : 0;

    return {
      reviewsGained,
      reviewsGainedStr: reviewsGained > 0 ? `+${reviewsGained}` : reviewsGained < 0 ? `${reviewsGained}` : '0',
      reviewsTrend: (reviewsGained > 0 ? 'up' : reviewsGained < 0 ? 'down' : 'neutral') as TrendType,
      ratingChange: ratingChange.toFixed(1),
      ratingChangeStr: ratingChange > 0 ? `+${ratingChange.toFixed(1)}` : ratingChange.toFixed(1),
      ratingTrend: (ratingChange > 0 ? 'up' : ratingChange < 0 ? 'down' : 'neutral') as TrendType,
      analysesCompleted: analyses?.length || 0,
    };
  }, [metrics, analyses]);

  // Get last SEO analysis
  const lastSeoAnalysis = analyses?.find((a) => a.type === 'seo');
  const seoScore = lastSeoAnalysis?.score;
  const seoTrend: TrendType = seoScore ? (seoScore >= 80 ? 'up' : seoScore >= 60 ? 'neutral' : 'down') : 'neutral';

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome back, {firstName}
          </h2>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        {/* Single CTA - Scalable */}
        <Button
          onClick={() => navigate('/automations')}
          className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          Run Automation
        </Button>
      </div>

      {/* Metrics Grid - Compact 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Google Rating - Yellow/Gold theme */}
        <MetricCard
          title="Google Rating"
          value={currentMetrics?.google_rating?.toFixed(1) || '—'}
          icon={Star}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-500"
          trend={impactStats.ratingChange !== '0.0' ? {
            value: impactStats.ratingChangeStr,
            type: impactStats.ratingTrend
          } : undefined}
          subLabel="/ 5"
        />
        
        {/* Total Reviews - Blue theme */}
        <MetricCard
          title="Total Reviews"
          value={currentMetrics?.review_count?.toLocaleString() || '—'}
          icon={MessageSquare}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          trend={impactStats.reviewsGainedStr !== '0' ? {
            value: impactStats.reviewsGainedStr,
            type: impactStats.reviewsTrend
          } : undefined}
        />
        
        {/* SEO Score - Green/Amber/Red theme based on score */}
        <MetricCard
          title="SEO Score"
          value={seoScore || '—'}
          icon={TrendingUp}
          iconBgColor={seoScore ? (seoScore >= 80 ? 'bg-emerald-100' : seoScore >= 60 ? 'bg-amber-100' : 'bg-red-100') : 'bg-slate-100'}
          iconColor={seoScore ? (seoScore >= 80 ? 'text-emerald-600' : seoScore >= 60 ? 'text-amber-600' : 'text-red-500') : 'text-slate-400'}
          subLabel={seoScore ? '/ 100' : undefined}
        />
        
        {/* Analyses Run - Purple theme */}
        <MetricCard
          title="Analyses Run"
          value={impactStats.analysesCompleted}
          icon={Activity}
          iconBgColor="bg-violet-100"
          iconColor="text-violet-600"
          subLabel="total"
        />
      </div>

      {/* Chart + Quick Actions - Flexible height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Chart - Takes 3 columns */}
        <Card className="lg:col-span-3 p-4 flex flex-col min-h-[250px]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Reputation Over Time</h3>
              <p className="text-xs text-slate-500">Google Rating evolution</p>
            </div>
            {hasChartData && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Rating
              </div>
            )}
          </div>

          {hasChartData ? (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    domain={[3, 5]}
                    tickCount={5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      padding: '8px 12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} ⭐`, 'Rating']}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="p-3 bg-slate-100 rounded-full mb-3">
                <TrendingUp className="w-6 h-6 text-slate-400" />
              </div>
              <h4 className="text-slate-700 font-medium text-sm mb-1">No data yet</h4>
              <p className="text-slate-500 text-xs max-w-[200px] mb-3">
                Run your first analysis to start tracking your reputation.
              </p>
              <Button 
                size="sm" 
                onClick={() => navigate('/automations')}
              >
                <PlayCircle className="w-4 h-4 mr-1.5" />
                Go to Automations
              </Button>
            </div>
          )}
        </Card>

        {/* Quick Actions Panel - 1 column */}
        <div className="flex flex-col gap-3">
          {/* Performance Summary */}
          <Card className="p-4 bg-gradient-to-br from-slate-50 to-white flex-1">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Reviews</span>
                <span className={`text-sm font-bold ${impactStats.reviewsTrend === 'up' ? 'text-emerald-600' : impactStats.reviewsTrend === 'down' ? 'text-red-500' : 'text-slate-600'}`}>
                  {impactStats.reviewsGainedStr !== '0' ? impactStats.reviewsGainedStr : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Rating</span>
                <span className={`text-sm font-bold ${impactStats.ratingTrend === 'up' ? 'text-emerald-600' : impactStats.ratingTrend === 'down' ? 'text-red-500' : 'text-slate-600'}`}>
                  {impactStats.ratingChangeStr !== '0.0' ? impactStats.ratingChangeStr : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">SEO</span>
                <span className={`text-sm font-bold ${seoTrend === 'up' ? 'text-emerald-600' : seoTrend === 'down' ? 'text-red-500' : 'text-slate-600'}`}>
                  {seoScore ? `${seoScore}/100` : '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Last Analysis Info */}
          <Card className="p-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Last Activity</h4>
            {analyses && analyses.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analyses[0].type === 'seo' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-slate-600 capitalize">{analyses[0].type} Analysis</span>
                </div>
                <p className="text-xs text-slate-400">{formatDate(analyses[0].created_at)}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No analyses yet</p>
            )}
          </Card>

          {/* Single CTA Button - Mobile */}
          <Button
            onClick={() => navigate('/automations')}
            className="sm:hidden w-full bg-slate-900 hover:bg-slate-800 text-white justify-center"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Run Automation
          </Button>
        </div>
      </div>
    </div>
  );
}
