// ============================================================================
// SHOREBREAK AI - PAGE REGISTER
// ============================================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, MapPin, User, CheckCircle2, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input, Card, Alert, Checkbox } from '../components/ui';
import { isValidGoogleMapsUrl, isValidUrl } from '../lib/utils';

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    googleMapsUrl: '',
    websiteUrl: '',
    dataConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidMapUrl = formData.googleMapsUrl 
    ? isValidGoogleMapsUrl(formData.googleMapsUrl) 
    : false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.dataConsent) {
      setError('You must accept the data processing terms to create an account.');
      return;
    }

    if (formData.googleMapsUrl && !isValidGoogleMapsUrl(formData.googleMapsUrl)) {
      setError('Please enter a valid Google Maps URL.');
      return;
    }

    if (formData.websiteUrl && !isValidUrl(formData.websiteUrl)) {
      setError('Please enter a valid website URL.');
      return;
    }

    setLoading(true);

    const { error } = await signUp({
      email: formData.email,
      password: formData.password,
      full_name: `${formData.firstName} ${formData.lastName}`.trim(),
      google_maps_url: formData.googleMapsUrl || undefined,
      website_url: formData.websiteUrl || undefined,
      data_retention_consent: formData.dataConsent,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA]">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white mb-4 shadow-xl">
            <span className="font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Account
          </h1>
          <p className="text-slate-500 mt-2">
            Start optimizing your patient acquisition
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-8">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                placeholder="John"
                icon={<User className="w-4 h-4" />}
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <Input
              type="email"
              label="Professional Email"
              name="email"
              placeholder="doctor@clinic.com"
              icon={<Mail className="w-4 h-4" />}
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />

            {/* Password */}
            <Input
              type="password"
              label="Password"
              name="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              helperText="Minimum 6 characters"
            />

            {/* Google Maps URL */}
            <div>
              <Input
                label="Google Maps URL"
                name="googleMapsUrl"
                placeholder="https://google.com/maps/place/..."
                icon={<MapPin className="w-4 h-4" />}
                value={formData.googleMapsUrl}
                onChange={handleChange}
                helperText="Paste the full URL of your Google Maps listing"
              />
              {isValidMapUrl && (
                <div className="mt-2 flex items-center text-xs text-emerald-600 animate-fade-in">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Valid Google Maps location found
                </div>
              )}
            </div>

            {/* Website URL */}
            <Input
              label="Website URL"
              name="websiteUrl"
              placeholder="https://www.yourclinic.com"
              icon={<Globe className="w-4 h-4" />}
              value={formData.websiteUrl}
              onChange={handleChange}
              helperText="Optional - for SEO analysis"
            />

            {/* GDPR Consent */}
            <div className="pt-2">
              <Checkbox
                name="dataConsent"
                checked={formData.dataConsent}
                onChange={handleChange}
                label="I accept the data processing terms"
                description="I consent to the processing of my data in accordance with the privacy policy. I understand I can export or delete my data at any time."
              />
            </div>

            <p className="text-xs text-slate-400">
              We use these URLs to analyze your current reviews and local ranking.
            </p>

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Creating account...' : 'Get Started'}
            </Button>
          </form>
        </Card>

        {/* Login Link */}
        <p className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-slate-900 hover:text-slate-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
