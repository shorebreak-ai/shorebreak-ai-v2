// ============================================================================
// SHOREBREAK AI - HOOKS PERSONNALISÉS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { 
  User, 
  UserSettings, 
  Analysis, 
  DashboardStats, 
  AdminStats,
  GoogleMetricsHistory 
} from '../types';

// ----------------------------------------------------------------------------
// Hook: Données utilisateur
// ----------------------------------------------------------------------------

export function useUser() {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (updates: Partial<User>) => {
    if (!profile) return { error: new Error('Non connecté') };
    
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return {
    user: profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
  };
}

// ----------------------------------------------------------------------------
// Hook: Paramètres utilisateur
// ----------------------------------------------------------------------------

export function useUserSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Erreur chargement settings:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!profile) return { error: new Error('Non connecté') };

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', profile.id);

      if (error) throw error;
      
      await fetchSettings();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: fetchSettings,
  };
}

// ----------------------------------------------------------------------------
// Hook: Analyses
// ----------------------------------------------------------------------------

export function useAnalyses() {
  const { profile } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (err) {
      console.error('Erreur chargement analyses:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const createAnalysis = async (analysis: Omit<Analysis, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .insert(analysis)
        .select()
        .single();

      if (error) throw error;
      
      await fetchAnalyses();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await fetchAnalyses();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const getAnalysisById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  return {
    analyses,
    loading,
    error,
    createAnalysis,
    deleteAnalysis,
    getAnalysisById,
    refreshAnalyses: fetchAnalyses,
  };
}

// ----------------------------------------------------------------------------
// Hook: Métriques Google
// ----------------------------------------------------------------------------

export function useGoogleMetrics() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<GoogleMetricsHistory[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<GoogleMetricsHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('google_metrics_history')
        .select('*')
        .eq('user_id', profile.id)
        .order('recorded_at', { ascending: false })
        .limit(26); // ~6 mois de données hebdomadaires

      if (error) throw error;
      
      setMetrics(data || []);
      setCurrentMetrics(data?.[0] || null);
    } catch (err) {
      console.error('Erreur chargement métriques:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const addMetrics = async (rating: number, reviewCount: number) => {
    if (!profile) return { error: new Error('Non connecté') };

    try {
      const { error } = await supabase
        .from('google_metrics_history')
        .insert({
          user_id: profile.id,
          google_rating: rating,
          review_count: reviewCount,
        });

      if (error) throw error;
      
      await fetchMetrics();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    metrics,
    currentMetrics,
    loading,
    error,
    addMetrics,
    refreshMetrics: fetchMetrics,
  };
}

// ----------------------------------------------------------------------------
// Hook: Statistiques Dashboard
// ----------------------------------------------------------------------------

export function useDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_dashboard_stats', { p_user_id: profile.id });

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
}

// ----------------------------------------------------------------------------
// Hook: Statistiques Admin
// ----------------------------------------------------------------------------

export function useAdminStats() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_admin_stats');

      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('Erreur chargement stats admin:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchStats,
  };
}

// ----------------------------------------------------------------------------
// Hook: Liste des utilisateurs (Admin)
// ----------------------------------------------------------------------------

export function useAdminUsers() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Erreur chargement users:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      await fetchUsers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    users,
    loading,
    error,
    updateUserRole,
    deleteUser,
    refreshUsers: fetchUsers,
  };
}

// ----------------------------------------------------------------------------
// Hook: Export des données (RGPD)
// ----------------------------------------------------------------------------

export function useDataExport() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async () => {
    if (!profile) return { data: null, error: new Error('Non connecté') };

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('export_user_data', { p_user_id: profile.id });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { data: null, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!profile) return { error: new Error('Non connecté') };

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .rpc('delete_user_account', { p_user_id: profile.id });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    exportData,
    deleteAccount,
  };
}
