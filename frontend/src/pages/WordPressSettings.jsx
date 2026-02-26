import React, { useState, useEffect } from 'react';
import { wordpressAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const WordPressSettings = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    siteUrl: '',
    username: '',
    appPassword: '',
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadFromLocalStorage();
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('wpConfig');
      if (saved) {
        const config = JSON.parse(saved);
        setFormData(config);
        setIsSaved(true);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.siteUrl || !formData.username || !formData.appPassword) {
      toast.showToast('Please fill all required fields', 'warning');
      return;
    }

    setSaving(true);
    try {
      localStorage.setItem('wpConfig', JSON.stringify(formData));
      setIsSaved(true);
      toast.showToast('✅ WordPress credentials saved locally in browser', 'success');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.showToast('Failed to save configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!formData.siteUrl || !formData.username || !formData.appPassword) {
      toast.showToast('Please fill all required fields', 'warning');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const response = await wordpressAPI.testConnection(formData);
      if (response.data.success) {
        setTestResult({
          success: true,
          message: `✅ Connection successful. Logged in as: ${response.data.user}`,
        });
        toast.showToast('WordPress connection successful!', 'success');
      } else {
        setTestResult({
          success: false,
          message: response.data.message,
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const errMsg = error.response?.data?.message || error.message || 'Connection test failed';
      setTestResult({ success: false, message: errMsg });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure? This will clear your WordPress credentials from this browser.')) {
      localStorage.removeItem('wpConfig');
      setFormData({ siteUrl: '', username: '', appPassword: '' });
      setIsSaved(false);
      setTestResult(null);
      toast.showToast('WordPress credentials cleared', 'info');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12 animate-fade">
          <h1 className="text-4xl font-bold text-slate-100">WordPress Settings</h1>
          <p className="text-slate-400 mt-2">Configure your WordPress blog for content publishing</p>
          <p className="text-blue-300 text-sm mt-3">💾 Credentials stored locally in your browser (not in database)</p>
        </div>

        <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade space-y-8">
          <form onSubmit={handleSave} className="space-y-6">
            {isSaved && (
              <div className="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-lg">
                <p className="text-emerald-200 font-semibold">✓ Credentials saved locally in this browser</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                WordPress Site URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="siteUrl"
                value={formData.siteUrl}
                onChange={handleInputChange}
                className="input-modern"
                placeholder="https://yoursite.com"
                required
                disabled={testing || saving}
              />
              <p className="text-xs text-slate-400 mt-2">
                Example: http://trypdeals.local or https://trypdeals.com
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="input-modern"
                placeholder="admin"
                required
                disabled={testing || saving}
              />
              <p className="text-xs text-slate-400 mt-2">
                Your WordPress admin username
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Application Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="appPassword"
                value={formData.appPassword}
                onChange={handleInputChange}
                className="input-modern"
                placeholder="xxxx xxxx xxxx xxxx"
                required
                disabled={testing || saving}
              />
              <p className="text-xs text-slate-400 mt-2">
                Generate in WordPress: Users → Profile → Application Passwords
              </p>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/40 border-red-500 text-red-200'
                }`}
              >
                <p className="font-semibold">{testResult.message}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !formData.siteUrl || !formData.username || !formData.appPassword}
                className="flex-1 px-4 py-3 bg-slate-800 text-cyan-300 rounded-lg font-semibold border border-slate-700 hover:bg-slate-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Locally'}
              </button>
              {isSaved && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-1 px-4 py-3 bg-red-900 text-red-100 rounded-lg font-semibold hover:bg-red-800 transition-all duration-300"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-8 p-6 bg-slate-900 border-l-4 border-cyan-500 rounded-lg animate-fade">
          <h3 className="font-bold text-cyan-200 mb-4 text-lg">How to Get Application Password</h3>
          <ol className="space-y-3 text-slate-300 text-sm">
            <li>1. Login to WordPress admin dashboard</li>
            <li>2. Open your profile page</li>
            <li>3. Scroll to Application Passwords</li>
            <li>4. Create password for this app</li>
            <li>5. Copy and paste into the field above</li>
            <li>6. Click Test Connection</li>
          </ol>

          <div className="mt-6 p-4 bg-blue-950/40 border-l-4 border-blue-500 rounded-lg">
            <p className="text-blue-200 font-semibold">🔒 Security Notes</p>
            <ul className="text-blue-100 text-sm mt-2 space-y-1">
              <li>✅ Credentials stored ONLY in your browser (localStorage)</li>
              <li>✅ NOT stored in any database</li>
              <li>✅ Not shared with other users</li>
              <li>✅ Cleared when you click "Clear" or clear browser data</li>
              <li>⚠️ Different for each browser/device</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordPressSettings;
