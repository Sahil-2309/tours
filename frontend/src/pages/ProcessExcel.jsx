import React, { useState, useEffect } from 'react';
import { templateAPI, processAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

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

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    let interval;
    if (processId && processing) {
      interval = setInterval(() => {
        checkStatus();
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [processId, processing]);

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

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

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

    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('templateId', selectedTemplate);
    formData.append('postType', postType);

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

  const handleViewResults = () => {
    if (processId) {
      navigate(`/results/${processId}`);
    }
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

  const progressPercent = status?.totalRows > 0 ? Math.round(((status.successCount + status.failedCount) / status.totalRows) * 100) : 0;

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
            {/* Form */}
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
                  Don't have a template? <a href="/" className="text-blue-600 hover:underline">Create one first</a>
                </p>
              </div>

              {/* Post Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Post To <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 'wordpress', label: 'WordPress', icon: '▪', desc: 'Blog Posts' },
                    { value: 'woocommerce', label: 'WooCommerce', icon: '▪', desc: 'Products' },
                    { value: 'both', label: 'Both', icon: '▪', desc: 'Posts & Products' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-300 ${
                        postType === option.value
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragging
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
                        <p className="text-xs text-slate-400 mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : isDragging ? (
                      <div>
                        <p className="font-semibold text-slate-100">Drop your Excel file here</p>
                      </div>
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

              {/* Submit Button */}
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

            {/* Info Box */}
            <div className="p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Process Flow</h3>
              <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
                <li>Select your AI prompt template</li>
                <li>Choose where to post (WordPress, WooCommerce, or both)</li>
                <li>Upload your Excel file with content data</li>
                <li>System passes your template + each row to Gemini AI</li>
                <li>Gemini generates content for each row</li>
                <li>Content is posted to your selected platform(s)</li>
                <li>Monitor progress and retry failed rows if needed</li>
              </ol>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processing && status && (
          <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade">
            <h2 className="text-2xl font-bold text-slate-100 mb-8">Processing in Progress</h2>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-200">Progress</span>
                <span className="text-sm font-semibold text-slate-400">
                  {status.successCount + status.failedCount} / {status.totalRows} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 p-6 rounded-lg text-center">
                <p className="text-3xl font-bold text-slate-100">{status.totalRows}</p>
                <p className="text-sm text-slate-400 mt-2">Total Rows</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{status.successCount}</p>
                <p className="text-sm text-slate-500 mt-2">Success</p>
              </div>
              <div className="bg-red-50 p-6 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">{status.failedCount}</p>
                <p className="text-sm text-slate-500 mt-2">Failed</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <p className="text-3xl font-bold text-blue-600">{status.totalRows - status.successCount - status.failedCount}</p>
                <p className="text-sm text-slate-500 mt-2">Pending</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <p className="text-blue-900 font-semibold">Status: <span className="capitalize">{status.status}</span></p>
            </div>
          </div>
        )}

        {/* Results Page Link */}
        {status && ['completed', 'failed', 'partial'].includes(status.status) && (
          <div className="mt-8 animate-fade">
            <button
              onClick={handleViewResults}
              className="w-full btn-primary py-4 text-lg font-semibold"
            >
              View Detailed Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessExcel;
