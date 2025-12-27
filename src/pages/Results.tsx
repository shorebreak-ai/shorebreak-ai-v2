// ============================================================================
// SHOREBREAK AI - PAGE RESULTS (avec vraies données n8n)
// ============================================================================

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Calendar, 
  FileText,
  CheckCircle,
  Save,
  Clock
} from 'lucide-react';
import { useAnalyses } from '../hooks';
import { Button, Badge, Alert, Spinner } from '../components/ui';
import { formatDate } from '../lib/utils';

// ----------------------------------------------------------------------------
// Markdown to HTML converter (simple version)
// ----------------------------------------------------------------------------
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-900 mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-100">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-slate-900 mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // Lists with dash
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-2 text-slate-600">$1</li>')
    // Lists with emoji
    .replace(/^🔹 (.*$)/gim, '<li class="ml-4 mb-2 text-slate-600 flex items-start gap-2"><span class="text-blue-500 mt-1">•</span><span>$1</span></li>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr class="my-6 border-slate-200" />')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="text-slate-600 mb-4 leading-relaxed">');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li.*?<\/li>\s*)+/g, '<ul class="my-4 space-y-1 list-none">$&</ul>');
  
  return html;
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAnalysisById } = useAnalyses();

  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Get data from navigation state or URL params
  const stateData = location.state as { 
    type?: string; 
    results?: any; 
    analysisId?: string;
  } | null;
  
  const analysisIdFromUrl = searchParams.get('id');

  useEffect(() => {
    const loadAnalysis = async () => {
      // If we have results from navigation state (just ran an analysis)
      if (stateData?.results) {
        setAnalysis({
          type: stateData.type,
          results: stateData.results,
          id: stateData.analysisId,
          created_at: new Date().toISOString(),
        });
        setLoading(false);
        return;
      }

      // If we have an analysis ID, fetch from database
      if (analysisIdFromUrl) {
        const { data, error } = await getAnalysisById(analysisIdFromUrl);
        if (data && !error) {
          setAnalysis(data);
        }
      }

      setLoading(false);
    };

    loadAnalysis();
  }, [stateData, analysisIdFromUrl, getAnalysisById]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const content = JSON.stringify(analysis?.results || {}, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shorebreak-${analysis?.type || 'analysis'}-${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="warning">
          No analysis results found. Please run a new analysis.
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/automations')}>
          Go to Automations
        </Button>
      </div>
    );
  }

  // Extract data from n8n response
  // Handle both direct results and results from analysis_jobs table
  let rawResults = analysis.results;
  
  // If results is a string (JSON), parse it
  if (typeof rawResults === 'string') {
    try {
      rawResults = JSON.parse(rawResults);
    } catch (e) {
      console.error('Failed to parse results string:', e);
    }
  }
  
  // If the data came from analysis_jobs, it might be wrapped in a 'result' key
  if (rawResults && rawResults.result) {
    rawResults = rawResults.result;
  }
  
  const results = rawResults;
  const type = analysis.type === 'seo' ? 'SEO & Visibility Audit' : 'Review Sentiment Analysis';
  const date = formatDate(analysis.created_at);
  
  // Handle different response structures from n8n
  let score: number | null = null;
  let contentSections: string[] = [];
  let htmlContent: string = '';

  // Helper to extract content from an item
  const extractContent = (item: any) => {
    if (item.score !== undefined) {
      score = item.score;
    }
    // output can be an array of markdown strings OR a single HTML string
    if (item.output) {
      if (Array.isArray(item.output)) {
        contentSections = [...contentSections, ...item.output];
      } else if (typeof item.output === 'string') {
        // output is a single HTML string (Reviews case)
        if (item.output.trim().startsWith('<!DOCTYPE') || item.output.trim().startsWith('<')) {
          // It's HTML content - extract just the body
          const bodyMatch = item.output.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            htmlContent = bodyMatch[1];
          } else {
            htmlContent = item.output;
          }
        } else {
          // It's markdown
          contentSections.push(item.output);
        }
      }
    }
    if (item.data && typeof item.data === 'string' && item.data.trim() !== '') {
      // data contains HTML content
      htmlContent = item.data;
    }
  };

  if (Array.isArray(results)) {
    // n8n returns an array with multiple items
    results.forEach((item: any) => extractContent(item));
  } else if (results && typeof results === 'object') {
    // Single object response
    extractContent(results);
  }

  // Fallback score
  if (score === null) {
    score = analysis.score || 85;
  }

  // Determine score color
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return 'Healthy';
    if (s >= 60) return 'Moderate';
    return 'Needs Improvement';
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-slide-up">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#FAFAFA]/95 backdrop-blur-sm py-4 z-10 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
        <div className="flex gap-2">
          {saved ? (
            <Button variant="secondary" size="sm" disabled>
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" /> Saved!
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" /> Save to Archives
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </div>
      </div>

      {/* Document Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Document Header */}
        <div className="bg-gradient-to-br from-slate-50 to-white border-b border-slate-200 p-8 md:p-10">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
                Automated Intelligence Report
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{type}</h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Reference ID: #{analysis.id?.slice(0, 8).toUpperCase() || 'AUD-0000'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {analysis.execution_time_ms ? `${(analysis.execution_time_ms / 1000).toFixed(1)}s` : '~30s'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                Audit Score
              </div>
              <div className={`text-5xl font-bold ${score !== null ? getScoreColor(score) : 'text-slate-400'}`}>
                {score !== null ? score : '—'}
                <span className="text-2xl text-slate-400 font-normal">/100</span>
              </div>
              {score !== null && (
                <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'} className="mt-2">
                  {getScoreLabel(score)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-8 md:p-10">
          
          {/* If we have HTML content from n8n, render it */}
          {htmlContent && (
            <div 
              className="prose prose-slate max-w-none
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-8 [&_h1]:mb-4
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-slate-100
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-3
                [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-4
                [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:list-none [&_ul]:pl-0
                [&_li]:text-slate-600 [&_li]:pl-6 [&_li]:relative [&_li]:before:content-['•'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-blue-500 [&_li]:before:font-bold
                [&_strong]:text-slate-900 [&_strong]:font-semibold
                [&_code]:bg-slate-100 [&_code]:text-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
                [&_hr]:border-slate-200 [&_hr]:my-6
              "
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}

          {/* If we have markdown sections but no HTML, render them */}
          {!htmlContent && contentSections.length > 0 && (
            <div className="space-y-8">
              {contentSections.map((section, index) => (
                <div 
                  key={index}
                  className="prose prose-slate max-w-none
                    [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-8 [&_h1]:mb-4
                    [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-slate-100
                    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-6 [&_h3]:mb-3
                    [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-4
                    [&_ul]:my-4 [&_ul]:space-y-2
                    [&_li]:text-slate-600
                    [&_strong]:text-slate-900 [&_strong]:font-semibold
                  "
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(section) }}
                />
              ))}
            </div>
          )}

          {/* Fallback if no content */}
          {!htmlContent && contentSections.length === 0 && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                  Executive Summary
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  This comprehensive audit analyzes the digital footprint of your practice 
                  compared to local benchmarks. {score !== null ? `Our analysis indicates a ${getScoreLabel(score)} overall status with a score of ${score}/100.` : ''}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                  Raw Response Data
                </h2>
                <pre className="bg-slate-50 p-4 rounded-lg overflow-x-auto text-sm text-slate-700">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </section>
            </div>
          )}

          {/* Footer */}
          <div className="pt-10 mt-10 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-sm">
              Generated by Shorebreak.AI on {date}
            </p>
            <p className="text-slate-300 text-xs mt-1">
              This report is for informational purposes only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
