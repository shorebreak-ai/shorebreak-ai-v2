-- ============================================================================
-- SHOREBREAK AI - MIGRATION INITIALE
-- Base de données PostgreSQL (Supabase)
-- Région : Frankfurt (eu-central-1) - RGPD Compliant
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TYPES ENUM
-- ============================================================================

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Types d'analyses
CREATE TYPE analysis_type AS ENUM ('reviews', 'seo');

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: users (profils utilisateurs)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    google_maps_url TEXT,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- Table: user_settings (paramètres utilisateurs + consentements RGPD)
-- ----------------------------------------------------------------------------
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true NOT NULL,
    weekly_digest BOOLEAN DEFAULT true NOT NULL,
    -- Consentements RGPD
    data_retention_consent BOOLEAN DEFAULT false NOT NULL,
    data_retention_consent_date TIMESTAMPTZ,
    marketing_consent BOOLEAN DEFAULT false NOT NULL,
    marketing_consent_date TIMESTAMPTZ,
    -- Métadonnées
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ----------------------------------------------------------------------------
-- Table: google_metrics_history (historique des métriques Google Maps)
-- ----------------------------------------------------------------------------
CREATE TABLE public.google_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    google_rating DECIMAL(2,1) CHECK (google_rating >= 0 AND google_rating <= 5),
    review_count INTEGER CHECK (review_count >= 0),
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes de dashboard
CREATE INDEX idx_google_metrics_user_id ON public.google_metrics_history(user_id);
CREATE INDEX idx_google_metrics_recorded_at ON public.google_metrics_history(recorded_at DESC);
CREATE INDEX idx_google_metrics_user_recorded ON public.google_metrics_history(user_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- Table: analyses (résultats des analyses Reviews et SEO)
-- ----------------------------------------------------------------------------
CREATE TABLE public.analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type analysis_type NOT NULL,
    input_data JSONB NOT NULL DEFAULT '{}',
    results JSONB,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    execution_time_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX idx_analyses_type ON public.analyses(type);
CREATE INDEX idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX idx_analyses_user_type ON public.analyses(user_id, type);
CREATE INDEX idx_analyses_user_created ON public.analyses(user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- Table: activity_logs (logs d'activité pour admin)
-- ----------------------------------------------------------------------------
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour les requêtes admin
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

-- ============================================================================
-- 4. FONCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fonction: Mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Fonction: Créer le profil utilisateur après inscription
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Utilisateur'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user')
    );
    
    -- Créer les settings par défaut
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Fonction: Obtenir les statistiques utilisateur pour le dashboard
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'current_rating', (
            SELECT google_rating 
            FROM public.google_metrics_history 
            WHERE user_id = p_user_id 
            ORDER BY recorded_at DESC 
            LIMIT 1
        ),
        'current_review_count', (
            SELECT review_count 
            FROM public.google_metrics_history 
            WHERE user_id = p_user_id 
            ORDER BY recorded_at DESC 
            LIMIT 1
        ),
        'first_rating', (
            SELECT google_rating 
            FROM public.google_metrics_history 
            WHERE user_id = p_user_id 
            ORDER BY recorded_at ASC 
            LIMIT 1
        ),
        'first_review_count', (
            SELECT review_count 
            FROM public.google_metrics_history 
            WHERE user_id = p_user_id 
            ORDER BY recorded_at ASC 
            LIMIT 1
        ),
        'total_analyses', (
            SELECT COUNT(*) 
            FROM public.analyses 
            WHERE user_id = p_user_id
        ),
        'last_seo_score', (
            SELECT score 
            FROM public.analyses 
            WHERE user_id = p_user_id AND type = 'seo' 
            ORDER BY created_at DESC 
            LIMIT 1
        ),
        'metrics_history', (
            SELECT json_agg(row_to_json(m))
            FROM (
                SELECT google_rating, review_count, recorded_at
                FROM public.google_metrics_history
                WHERE user_id = p_user_id
                ORDER BY recorded_at DESC
                LIMIT 26  -- ~6 mois de données hebdomadaires
            ) m
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Fonction: Obtenir les statistiques admin globales
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.users),
        'total_analyses', (SELECT COUNT(*) FROM public.analyses),
        'analyses_this_month', (
            SELECT COUNT(*) 
            FROM public.analyses 
            WHERE created_at >= date_trunc('month', NOW())
        ),
        'total_tokens_used', (
            SELECT COALESCE(SUM(tokens_used), 0) 
            FROM public.analyses
        ),
        'weekly_activity', (
            SELECT json_agg(row_to_json(w))
            FROM (
                SELECT 
                    date_trunc('week', created_at)::date as week,
                    type,
                    COUNT(*) as count
                FROM public.analyses
                WHERE created_at >= NOW() - INTERVAL '8 weeks'
                GROUP BY date_trunc('week', created_at), type
                ORDER BY week DESC
            ) w
        ),
        'recent_activity', (
            SELECT json_agg(row_to_json(a))
            FROM (
                SELECT 
                    al.action,
                    al.user_email,
                    al.created_at,
                    al.details
                FROM public.activity_logs al
                ORDER BY al.created_at DESC
                LIMIT 10
            ) a
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Fonction: Exporter les données utilisateur (RGPD - Droit d'accès)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Vérifier que l'utilisateur demande ses propres données
    IF auth.uid() != p_user_id AND NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Non autorisé';
    END IF;

    SELECT json_build_object(
        'exported_at', NOW(),
        'user_profile', (
            SELECT row_to_json(u) 
            FROM public.users u 
            WHERE id = p_user_id
        ),
        'user_settings', (
            SELECT row_to_json(s) 
            FROM public.user_settings s 
            WHERE user_id = p_user_id
        ),
        'google_metrics_history', (
            SELECT json_agg(row_to_json(m))
            FROM public.google_metrics_history m
            WHERE user_id = p_user_id
        ),
        'analyses', (
            SELECT json_agg(row_to_json(a))
            FROM public.analyses a
            WHERE user_id = p_user_id
        ),
        'activity_logs', (
            SELECT json_agg(row_to_json(l))
            FROM public.activity_logs l
            WHERE user_id = p_user_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Fonction: Supprimer le compte utilisateur (RGPD - Droit à l'effacement)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Vérifier que l'utilisateur demande la suppression de son propre compte
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Non autorisé';
    END IF;

    -- Les données seront supprimées en cascade grâce aux foreign keys
    DELETE FROM public.users WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger: Mise à jour automatique de updated_at sur users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Mise à jour automatique de updated_at sur user_settings
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Création automatique du profil après inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Policies: users
-- ----------------------------------------------------------------------------

-- Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Les admins peuvent voir tous les profils
CREATE POLICY "Admins can view all profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les admins peuvent modifier tous les profils
CREATE POLICY "Admins can update all profiles"
    ON public.users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les admins peuvent supprimer des profils
CREATE POLICY "Admins can delete profiles"
    ON public.users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- Policies: user_settings
-- ----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leurs propres settings
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

-- Les utilisateurs peuvent modifier leurs propres settings
CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs settings (si pas créés automatiquement)
CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Policies: google_metrics_history
-- ----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leur propre historique
CREATE POLICY "Users can view own metrics"
    ON public.google_metrics_history FOR SELECT
    USING (auth.uid() = user_id);

-- Les utilisateurs peuvent insérer leurs propres métriques
CREATE POLICY "Users can insert own metrics"
    ON public.google_metrics_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role peut insérer pour tous (pour le CRON)
CREATE POLICY "Service can insert metrics"
    ON public.google_metrics_history FOR INSERT
    WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Policies: analyses
-- ----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leurs propres analyses
CREATE POLICY "Users can view own analyses"
    ON public.analyses FOR SELECT
    USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer leurs propres analyses
CREATE POLICY "Users can insert own analyses"
    ON public.analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres analyses
CREATE POLICY "Users can delete own analyses"
    ON public.analyses FOR DELETE
    USING (auth.uid() = user_id);

-- Les admins peuvent voir toutes les analyses
CREATE POLICY "Admins can view all analyses"
    ON public.analyses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- Policies: activity_logs
-- ----------------------------------------------------------------------------

-- Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view own logs"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Les utilisateurs peuvent créer des logs pour eux-mêmes
CREATE POLICY "Users can insert own logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Les admins peuvent voir tous les logs
CREATE POLICY "Admins can view all logs"
    ON public.activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- 7. DONNÉES INITIALES (optionnel)
-- ============================================================================

-- Aucune donnée initiale requise - les utilisateurs seront créés via l'inscription

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
