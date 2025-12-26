// ============================================================================
// SHOREBREAK AI - PAGE SETTINGS
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Save, User, MapPin, Shield, Globe, Download, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUserSettings, useDataExport } from '../hooks';
import { supabase } from '../lib/supabase';
import { Card, Button, Input, Alert, Spinner, Checkbox } from '../components/ui';
import { downloadJson, isValidGoogleMapsUrl, isValidUrl } from '../lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { signOut, profile, refreshProfile } = useAuth();
  const { settings, updateSettings, loading: settingsLoading } = useUserSettings();
  const { exportData, deleteAccount, loading: dataLoading } = useDataExport();

  const [mapUrl, setMapUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Track if initial load happened
  const initialLoadDone = useRef(false);

  // Load profile data only once on mount, or when profile changes from null to value
  useEffect(() => {
    if (profile && !initialLoadDone.current) {
      setMapUrl(profile.google_maps_url || '');
      setWebsiteUrl(profile.website_url || '');
      initialLoadDone.current = true;
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setNotificationsEnabled(settings.notifications_enabled);
      setWeeklyDigest(settings.weekly_digest);
    }
  }, [settings]);

  const handleSaveProfile = async () => {
    setSaveError(null);
    setSaving(true);
    
    // Validation
    if (mapUrl && !isValidGoogleMapsUrl(mapUrl)) {
      setSaveError('Please enter a valid Google Maps URL');
      setSaving(false);
      return;
    }
    if (websiteUrl && !isValidUrl(websiteUrl)) {
      setSaveError('Please enter a valid website URL');
      setSaving(false);
      return;
    }
    
    try {
      // Direct Supabase call for more control
      const { error } = await supabase
        .from('users')
        .update({ 
          google_maps_url: mapUrl || null, 
          website_url: websiteUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) {
        console.error('Supabase error:', error);
        setSaveError(error.message);
      } else {
        setSaveSuccess(true);
        // Refresh profile to get updated data
        await refreshProfile();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    const { error } = await updateSettings({ notifications_enabled: notificationsEnabled, weekly_digest: weeklyDigest });
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleExportData = async () => {
    const { data, error } = await exportData();
    if (error) {
      setSaveError(error.message);
    } else if (data) {
      downloadJson(data, `shorebreak-export-${profile?.email}.json`);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    const { error } = await deleteAccount();
    if (error) {
      setSaveError(error.message);
    } else {
      await signOut();
      navigate('/login');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (settingsLoading) {
    return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
        <p className="text-slate-500 mt-1">Manage your profile and preferences.</p>
      </div>

      {saveSuccess && <Alert variant="success">Settings saved successfully!</Alert>}
      {saveError && <Alert variant="error">{saveError}</Alert>}

      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Profile</h3>
          <Card className="p-6">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" value={profile?.full_name || ''} disabled className="opacity-75 bg-slate-50" icon={<User className="w-4 h-4" />} />
                <Input label="Role" value={profile?.role === 'admin' ? 'Administrator' : 'User'} disabled className="opacity-75 bg-slate-50" icon={<Shield className="w-4 h-4" />} />
              </div>
              <Input label="Email Address" value={profile?.email || ''} disabled className="opacity-75 bg-slate-50" />
              <p className="text-xs text-slate-400">Contact support to update your name or email address.</p>
            </div>
          </Card>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Business Information</h3>
          <Card className="p-6">
            <div className="space-y-5">
              <Input label="Google Maps URL" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} icon={<MapPin className="w-4 h-4" />} helperText="Used for Review Analysis" />
              <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} icon={<Globe className="w-4 h-4" />} helperText="Used for SEO Analysis" />
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">These URLs are used for all automated audits.</p>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : saveSuccess ? (
                    <><CheckCircle className="w-3 h-3 mr-2" />Saved!</>
                  ) : (
                    <><Save className="w-3 h-3 mr-2" />Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Notifications</h3>
          <Card className="p-6">
            <div className="space-y-4">
              <Checkbox label="Enable Notifications" description="Receive alerts about your analyses" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
              <Checkbox label="Weekly Digest" description="Receive a weekly summary of your performance" checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />
              <div className="pt-2">
                <Button size="sm" variant="secondary" onClick={handleSaveNotifications}><Save className="w-3 h-3 mr-2" />Save Preferences</Button>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">Data & Privacy (GDPR)</h3>
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Export Your Data</p>
                  <p className="text-sm text-slate-500">Download all your data in JSON format</p>
                </div>
                <Button size="sm" variant="outline" onClick={handleExportData} disabled={dataLoading}><Download className="w-4 h-4 mr-2" />Export</Button>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-slate-500">Permanently delete your account and all data</p>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => setShowDeleteModal(true)}><Trash2 className="w-4 h-4 mr-2" />Delete</Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <div className="pt-8 border-t border-slate-200">
          <Button variant="danger" fullWidth onClick={handleSignOut} className="flex items-center justify-center gap-2"><LogOut className="w-4 h-4" />Sign Out</Button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Account</h3>
            <p className="text-slate-600 mb-4">This action is irreversible. All your data will be permanently deleted.</p>
            <Input label='Type "DELETE" to confirm' value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" fullWidth onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="danger" fullWidth onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || dataLoading}>Delete Forever</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
