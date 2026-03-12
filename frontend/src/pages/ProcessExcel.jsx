import React, { useState, useEffect } from 'react';
import { templateAPI, processAPI, woocommerceAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

// ✅ Gemini models list
const GEMINI_MODELS = [
  {
    id: 'models/gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    desc: 'Best quality, persuasive content 🏆'
  },
  {
    id: 'models/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    desc: 'Stable & balanced ⚖️'
  },
  {
    id: 'models/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    desc: 'Fastest & cheapest ⚡'
  },
];

const ProcessExcel = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [postType, setPostType] = useState('wordpress');
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processId, setProcessId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [stopping, setStopping] = useState(false);

  // WooCommerce product type states
  const [wooProductTypes, setWooProductTypes] = useState([]);
  const [wooProductType, setWooProductType] = useState('');

  // ✅ Gemini model state
  const [geminiModel, setGeminiModel] = useState('models/gemini-3-flash-preview');

  useEffect(() => {
    fetchTemplates();
    fetchProductTypes();
    checkActiveProcess();
  }, []);

  const checkActiveProcess = async () => {
    try {
      const response = await processAPI.getHistory();
      const historyItems = response.data.data;
      if (historyItems && historyItems.length > 0) {
        // Find if there is any active process
        const activeProcess = historyItems.find(p => p.status === 'processing');
        if (activeProcess) {
          setProcessId(activeProcess._id);
          setProcessing(true);
          setStatus(activeProcess);
          // Auto-resume tracking via the existing interval
        }
      }
    } catch (error) {
      console.error('Error checking active process:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (processId && processing) {
      interval = setInterval(() => {
        checkStatus();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [processId, processing]);

  const fetchProductTypes = async () => {
    try {
      const response = await woocommerceAPI.getWooProductTypes();
      const types = response.data.data;
      setWooProductTypes(types);
      if (types.length > 0) setWooProductType(types[0].slug);
    } catch (error) {
      console.error('Error fetching WooCommerce product types:', error);
      setWooProductTypes([{ slug: 'simple', label: 'Simple' }]);
      setWooProductType('simple');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await templateAPI.getAll();
      setTemplates(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.showToast('Failed to fetch templates', 'error');
      setLoading(false);
    }
  };

  const checkStatus = async (id = processId) => {
    try {
      const response = await processAPI.getStatus(id);
      setStatus(response.data.data);
      if (['completed', 'failed', 'partial'].includes(response.data.data.status)) {
        setProcessing(false);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.showToast('Please select an Excel file (.xlsx or .xls)', 'warning');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedFile = droppedFiles[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.showToast('Please select an Excel file (.xlsx or .xls)', 'warning');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.showToast('Please select a template', 'warning');
      return;
    }

    if (!file) {
      toast.showToast('Please select an Excel file', 'warning');
      return;
    }

    if (postType === 'wordpress' || postType === 'both') {
      try {
        const wpConfig = localStorage.getItem('wpConfig');
        if (!wpConfig) {
          toast.showToast('⚠️ WordPress credentials not found. Please configure WordPress Settings first.', 'warning');
          return;
        }
      } catch (error) {
        toast.showToast('Error checking WordPress configuration', 'error');
        return;
      }
    }

    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('templateId', selectedTemplate);
    formData.append('postType', postType);
    formData.append('geminiModel', geminiModel); // ✅ model bhejo

    if (postType === 'wordpress' || postType === 'both') {
      const wpConfig = JSON.parse(localStorage.getItem('wpConfig') || '{}');
      formData.append('wpSiteUrl', wpConfig.siteUrl);
      formData.append('wpUsername', wpConfig.username);
      formData.append('wpAppPassword', wpConfig.appPassword);
    }

    if (postType === 'woocommerce' || postType === 'both') {
      formData.append('wooProductType', wooProductType);
    }

    setProcessing(true);
    setStatus(null);

    try {
      const response = await processAPI.processExcel(formData);
      const newProcessId = response.data.processId;
      setProcessId(newProcessId);

      setStatus({
        totalRows: response.data.totalRows,
        successCount: 0,
        failedCount: 0,
        status: 'processing',
        _id: newProcessId,
      });

      setTimeout(() => checkStatus(newProcessId), 500);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.showToast(error.response?.data?.message || 'Failed to process file', 'error');
      setProcessing(false);
    }
  };

  const handleStopProcess = async () => {
    if (!processId) return;
    setStopping(true);
    try {
      await processAPI.stopProcess(processId);
      toast.showToast('Stop command sent. Processing will stop after current row.', 'success');
    } catch (error) {
      console.error('Error stopping process:', error);
      toast.showToast(error.response?.data?.message || 'Failed to stop process', 'error');
    } finally {
      setStopping(false);
    }
  };

  const handleViewResults = () => {
    if (processId) navigate(`/results/${processId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading templates...</p>
        </div>
      </div>
    );
  }

  const progressPercent = status?.totalRows > 0
    ? Math.round(((status.successCount + status.failedCount) / status.totalRows) * 100)
    : 0;

  const processedRows = status ? status.successCount + status.failedCount : 0;
  const currentRow = processedRows + 1;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-12 animate-fade">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Process Excel</h1>
          <p className="text-slate-400 mt-2">Upload your Excel file and start automated content generation</p>
        </div>

        {!processing && !status && (
          <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Select Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="input-modern"
                  required
                >
                  <option value="">-- Choose a template --</option>
                  {templates.length === 0 ? (
                    <option disabled>No templates available</option>
                  ) : (
                    templates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name} ({template.category})
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Don't have a template?{' '}
                  <a href="/" className="text-blue-600 hover:underline">Create one first</a>
                </p>
              </div>

              {/* ✅ Gemini Model Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Gemini Model <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {GEMINI_MODELS.map((m) => (
                    <label
                      key={m.id}
                      className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 flex items-center justify-between ${geminiModel === m.id
                        ? 'border-cyan-500 bg-slate-800'
                        : 'border-slate-700 hover:border-cyan-500 bg-slate-900'
                        }`}
                    >
                      <input
                        type="radio"
                        name="geminiModel"
                        value={m.id}
                        checked={geminiModel === m.id}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        className="hidden"
                      />
                      <div>
                        <div className="font-semibold text-slate-100">{m.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{m.desc}</div>
                      </div>
                      {geminiModel === m.id && (
                        <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Post Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Post To <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'wordpress', label: 'WordPress', desc: 'Blog Posts' },
                    { value: 'woocommerce', label: 'WooCommerce', desc: 'Products' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 ${postType === option.value
                        ? 'border-cyan-500 bg-slate-800'
                        : 'border-slate-700 hover:border-cyan-500 bg-slate-900'
                        }`}
                    >
                      <input
                        type="radio"
                        name="postType"
                        value={option.value}
                        checked={postType === option.value}
                        onChange={(e) => setPostType(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-semibold text-slate-100">{option.label}</div>
                      <div className="text-xs text-slate-400 mt-1">{option.desc}</div>

                      {option.value === 'woocommerce' && postType === 'woocommerce' && (
                        <select
                          value={wooProductType}
                          onChange={(e) => { e.stopPropagation(); setWooProductType(e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 w-full bg-slate-700 text-slate-100 text-xs rounded-md px-2 py-1.5 border border-slate-600 focus:outline-none focus:border-cyan-500"
                        >
                          {wooProductTypes.length === 0 ? (
                            <option disabled>Loading types...</option>
                          ) : (
                            wooProductTypes.map((type) => (
                              <option key={type.slug} value={type.slug}>{type.label}</option>
                            ))
                          )}
                        </select>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Upload Excel File <span className="text-red-500">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${isDragging
                    ? 'border-cyan-500 bg-slate-800'
                    : file
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-900'
                    }`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                    required
                  />
                  <label htmlFor="file-input" className="cursor-pointer">
                    {file ? (
                      <div>
                        <p className="font-semibold text-slate-100">{file.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                      </div>
                    ) : isDragging ? (
                      <p className="font-semibold text-slate-100">Drop your Excel file here</p>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-100">Drop your Excel file here</p>
                        <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                      </div>
                    )}
                  </label>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Supported formats: .xlsx, .xls (Must have Meta Title, Meta Description, Focus Keywords, Slug columns)
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!selectedTemplate || !file}
                className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Processing
              </button>
            </form>

            {templates.length === 0 && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                <p className="text-yellow-800 font-semibold">No templates available. Create a template first.</p>
              </div>
            )}

            <div className="p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Process Flow</h3>
              <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
                <li>Select your AI prompt template</li>
                <li>Choose Gemini model for content generation</li>
                <li>Choose where to post (WordPress or WooCommerce)</li>
                <li>Upload your Excel file with content data</li>
                <li>Gemini generates content for each row</li>
                <li>Content is posted to your selected platform</li>
                <li>Monitor progress and retry failed rows if needed</li>
              </ol>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processing && status && (
          <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade">

            {/* Keyframes */}
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
              }
              @keyframes sweep {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              @keyframes pulse-dot {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.7); }
              }
            `}</style>

            <h2 className="text-2xl font-bold text-slate-100 mb-1">Processing in fProgress</h2>
            <p className="text-xs text-slate-400 mb-8">
              Model: <span className="text-cyan-400 font-semibold">{GEMINI_MODELS.find(m => m.id === geminiModel)?.label}</span>
            </p>

            {/* Progress Bar Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                {/* Left: label + bouncing dots */}
                <span className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  Progress
                  <span className="flex gap-1 items-center">
                    {[0, 150, 300].map((delay, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                        style={{ animation: `pulse-dot 1.2s ease-in-out ${delay}ms infinite` }}
                      ></span>
                    ))}
                  </span>
                </span>
                {/* Right: count */}
                <span className="text-sm font-semibold text-slate-400">
                  {processedRows} / {status.totalRows} ({progressPercent}%)
                </span>
              </div>

              {/* Bar track */}
              <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden relative">

                {/* Filled animated bar */}
                <div
                  className="h-4 rounded-full relative overflow-hidden"
                  style={{
                    width: `${Math.max(progressPercent, 4)}%`,
                    background: 'linear-gradient(90deg, #1d4ed8, #06b6d4, #1d4ed8)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2s infinite linear',
                    transition: 'width 0.7s ease-out',
                  }}
                >
                  {/* White sweep */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'sweep 1.8s infinite linear',
                    }}
                  />
                </div>

                {/* Glowing dot at leading edge */}
                {progressPercent > 0 && progressPercent < 100 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-lg"
                    style={{
                      left: `calc(${Math.max(progressPercent, 4)}% - 6px)`,
                      transition: 'left 0.7s ease-out',
                      boxShadow: '0 0 8px 3px rgba(6,182,212,0.6)',
                      animation: 'pulse-dot 1s ease-in-out infinite',
                    }}
                  />
                )}
              </div>

              {/* Status text below bar */}
              <p className="text-xs text-slate-500 mt-2 text-right">
                {progressPercent < 100
                  ? `⚙️ Generating content for row ${currentRow} of ${status.totalRows}...`
                  : '✅ All rows processed!'}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 p-6 rounded-lg text-center">
                <p className="text-3xl font-bold text-slate-100">{status.totalRows}</p>
                <p className="text-sm text-slate-400 mt-2">Total</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
                <p className="text-3xl font-bold text-blue-400">
                  {status.totalRows - processedRows}
                </p>
                <p className="text-sm text-slate-400 mt-2">Pending</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg text-center border border-emerald-800">
                <p className="text-3xl font-bold text-emerald-400">{status.successCount}</p>
                <p className="text-sm text-slate-400 mt-2">Success</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-lg text-center border border-red-900">
                <p className="text-3xl font-bold text-red-400">{status.failedCount}</p>
                <p className="text-sm text-slate-400 mt-2">Failed</p>
              </div>
            </div>

            <div className="p-4 bg-blue-950/50 border-l-4 border-blue-500 rounded-lg">
              <p className="text-blue-300 font-semibold text-sm">
                Status: <span className="capitalize text-blue-200">{status.status}</span>
                <span className="ml-2 text-slate-400 font-normal">— Gemini is generating content, please wait</span>
              </p>
            </div>
          </div>
        )}

        {/* Results Button */}
        {status && ['completed', 'failed', 'partial', 'stopped'].includes(status.status) && (
          <div className="mt-8 animate-fade">
            <button onClick={handleViewResults} className="w-full btn-primary py-4 text-lg font-semibold">
              View Detailed Results
            </button>
          </div>
        )}

        {/* Stop Button */}
        {processing && status && status.status === 'processing' && (
          <div className="mt-8 animate-fade">
            <button
              onClick={handleStopProcess}
              disabled={stopping}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stopping ? 'Stopping...' : '🛑 Stop Processing'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProcessExcel;
