// ============================================================================
// SHOREBREAK AI - PAGE ARCHIVES
// ============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Calendar, ChevronRight, Trash2 } from 'lucide-react';
import { useAnalyses } from '../hooks';
import { Card, Badge, Button, Spinner, Alert } from '../components/ui';
import { formatDate } from '../lib/utils';

export default function Archives() {
  const navigate = useNavigate();
  const { analyses, loading, error, deleteAnalysis } = useAnalyses();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'reviews' | 'seo'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter analyses
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((analysis) => {
      if (filterType !== 'all' && analysis.type !== filterType) {
        return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const inputData = analysis.input_data as Record<string, string>;
        const matchesUrl = 
          inputData?.google_maps_url?.toLowerCase().includes(search) ||
          inputData?.website_url?.toLowerCase().includes(search);
        const matchesType = analysis.type.toLowerCase().includes(search);
        return matchesUrl || matchesType;
      }
      return true;
    });
  }, [analyses, searchTerm, filterType]);

  const handleDelete = async (id: string) => {
    await deleteAnalysis(id);
    setDeleteConfirm(null);
  };

  const handleViewResults = (analysis: any) => {
    navigate('/results', {
      state: {
        type: analysis.type,
        results: analysis.results,
        analysisId: analysis.id,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Report Archives</h2>
          <p className="text-slate-500 mt-1">Access your historical analysis data.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="all">All Types</option>
            <option value="reviews">Reviews</option>
            <option value="seo">SEO</option>
          </select>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {filteredAnalyses.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No reports found</h3>
          <p className="text-slate-500 mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters.'
              : "You haven't run any analyses yet."}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button onClick={() => navigate('/automations')}>Run Your First Analysis</Button>
          )}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Report</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnalyses.map((analysis) => {
                const inputData = analysis.input_data as Record<string, string>;
                const summary = analysis.type === 'reviews'
                  ? `Review analysis`
                  : `SEO audit for ${inputData?.website_url?.replace(/https?:\/\//, '').split('/')[0] || 'website'}`;
                return (
                  <tr key={analysis.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewResults(analysis)}>
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{summary}</div>
                          <div className="text-xs text-slate-400">ID: #{analysis.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={analysis.type === 'seo' ? 'info' : 'success'}>
                        {analysis.type === 'seo' ? 'SEO Audit' : 'Review Audit'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDate(analysis.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${(analysis.score || 0) > 80 ? 'text-emerald-600' : (analysis.score || 0) > 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {analysis.score || '—'}/100
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {deleteConfirm === analysis.id ? (
                          <>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(analysis.id)}>Confirm</Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setDeleteConfirm(analysis.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleViewResults(analysis)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
