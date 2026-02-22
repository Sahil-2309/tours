import React, { useState, useEffect } from 'react';
import { wordpressAPI } from '../services/api';

const WordPressSettings = () => {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    siteUrl: '',
    username: '',
    appPassword: '',
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await wordpressAPI.getConfig();
      if (response.data.data) {
        setConfig(response.data.data);
        setFormData({
          siteUrl: response.data.data.siteUrl,
          username: response.data.data.username,
          appPassword: '',
        });
      }
      setLoading(false);
    } catch (error) {
      console.log('No config found');
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await wordpressAPI.saveConfig(formData);
      setTestResult({ success: true, message: 'Configuration saved successfully.' });
      setTimeout(() => fetchConfig(), 500);
    } catch (error) {
      console.error('Error saving config:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload = config && !formData.appPassword?.trim()
        ? { configId: config._id }
        : formData;
      const response = await wordpressAPI.testConnection(payload);
      if (response.data.success) {
        setTestResult({
          success: true,
          message: `Connection successful. Logged in as: ${response.data.user}`,
        });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading settings...</p>
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
        </div>

        <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade space-y-8">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                WordPress Site URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.siteUrl}
                onChange={(e) => setFormData({ ...formData, siteUrl: e.target.value })}
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
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                value={formData.appPassword}
                onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                className="input-modern"
                placeholder={config ? "Re-enter to update (leave blank to keep existing)" : "xxxx xxxx xxxx xxxx"}
                required={!config}
                disabled={testing || saving}
              />
              <p className="text-xs text-slate-400 mt-2">
                Generate in WordPress: Users → Profile → Application Passwords. {config && "Re-enter when updating."}
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
                disabled={testing || (!config && (!formData.siteUrl || !formData.username || !formData.appPassword))}
                className="flex-1 px-4 py-3 bg-slate-800 text-cyan-300 rounded-lg font-semibold border border-slate-700 hover:bg-slate-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>

          {config && config.testStatus === 'success' && (
            <div className="p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-lg">
              <h3 className="font-semibold text-emerald-200 mb-3">Configuration Active</h3>
              <div className="space-y-2 text-emerald-100 text-sm">
                <p><span className="font-semibold">Site:</span> {config.siteUrl}</p>
                <p><span className="font-semibold">User:</span> {config.username}</p>
                <p><span className="font-semibold">Last Tested:</span> {new Date(config.lastTested).toLocaleString()}</p>
              </div>
            </div>
          )}
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

          <div className="mt-6 p-4 bg-amber-950/40 border-l-4 border-amber-500 rounded-lg">
            <p className="text-amber-200 font-semibold">Important Notes</p>
            <ul className="text-amber-100 text-sm mt-2 space-y-1">
              <li>Application password is different from login password</li>
              <li>Keep spaces if WordPress gives password with spaces</li>
              <li>Test connection before processing Excel files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordPressSettings;
