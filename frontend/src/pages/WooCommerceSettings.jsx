import React, { useState, useEffect } from 'react';
import { woocommerceAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const WooCommerceSettings = () => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    siteUrl: '',
    consumerKey: '',
    consumerSecret: '',
  });
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await woocommerceAPI.getConfig();
      if (response.data.data) {
        setConfig(response.data.data);
        setFormData({
          siteUrl: response.data.data.siteUrl,
          consumerKey: response.data.data.consumerKey,
          consumerSecret: response.data.data.consumerSecret,
        });
      }
      setLoading(false);
    } catch (error) {
      console.log('No config found yet');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTestConnection = async () => {
    const hasAllFields = formData.siteUrl && formData.consumerKey && formData.consumerSecret;
    if (!hasAllFields && !config) {
      setTestResult({ success: false, message: 'Please fill all fields' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const payload = config && !hasAllFields ? { configId: config._id } : formData;
      const response = await woocommerceAPI.testConnection(payload);
      setTestResult(response.data);
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'Connection failed';
      setTestResult({ success: false, message: errMsg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.siteUrl || !formData.consumerKey || !formData.consumerSecret) {
      toast.showToast('Please fill all required fields', 'warning');
      return;
    }

    setSaveLoading(true);
    try {
      const response = await woocommerceAPI.saveConfig(formData);
      setConfig(response.data.data);
      toast.showToast('WooCommerce configuration saved successfully!', 'success');
    } catch (error) {
      toast.showToast(error.response?.data?.message || 'Failed to save configuration', 'error');
    } finally {
      setSaveLoading(false);
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 animate-fade">
          <h1 className="text-4xl font-bold text-slate-100">WooCommerce Settings</h1>
          <p className="text-slate-400 mt-2">Configure your WooCommerce store for product automation</p>
        </div>

        <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade">
          {config && (
            <div className="mb-6 p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-lg">
              <p className="text-emerald-200 font-semibold">Configuration Active</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                WooCommerce Site URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="siteUrl"
                placeholder="https://example.com"
                value={formData.siteUrl}
                onChange={handleInputChange}
                className="input-modern"
              />
              <p className="text-xs text-slate-400 mt-2">Your WooCommerce site URL (with http:// or https://)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Consumer Key <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="consumerKey"
                placeholder="ck_live_..."
                value={formData.consumerKey}
                onChange={handleInputChange}
                className="input-modern"
              />
              <p className="text-xs text-slate-400 mt-2">From WooCommerce REST API credentials</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Consumer Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="consumerSecret"
                placeholder="cs_live_..."
                value={formData.consumerSecret}
                onChange={handleInputChange}
                className="input-modern"
              />
              <p className="text-xs text-slate-400 mt-2">From WooCommerce REST API credentials</p>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-lg flex items-center space-x-3 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-700'
                    : 'bg-red-950/40 border border-red-700'
                }`}
              >
                <p className={testResult.success ? 'text-emerald-200' : 'text-red-200'}>
                  {testResult.message}
                </p>
              </div>
            )}

            <div className="flex space-x-4 pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || (!config && (!formData.siteUrl || !formData.consumerKey || !formData.consumerSecret))}
                className="flex-1 bg-slate-800 text-cyan-300 border border-slate-700 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveLoading}
                className="flex-1 btn-primary"
              >
                {saveLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-900 border-l-4 border-cyan-500 rounded-lg">
            <h3 className="font-semibold text-cyan-200 mb-2">How to Get REST API Credentials</h3>
            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
              <li>Login to WordPress admin and open WooCommerce</li>
              <li>Go to Settings then Advanced then REST API</li>
              <li>Create API key with Read/Write permission</li>
              <li>Copy consumer key and secret</li>
              <li>Paste here and test connection</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WooCommerceSettings;
