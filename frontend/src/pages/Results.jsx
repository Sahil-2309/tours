import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { processAPI } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const Results = () => {
  const confirm = useConfirm();
  const toast = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const [process, setProcess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    if (id) {
      fetchProcess(id);
    }
  }, [id]);

  const fetchProcess = async (processId) => {
    try {
      const response = await processAPI.getStatus(processId);
      setProcess(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching process:', error);
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    const ok = await confirm.confirm(
      `Retry ${process.failedCount} failed row${process.failedCount > 1 ? 's' : ''}?`,
      { confirmText: 'Retry' }
    );
    if (!ok) return;

    setRetrying(true);
    try {
      const response = await processAPI.retryFailed(process._id);
      navigate(`/results/${response.data.processId}`);
      window.location.reload();
    } catch (error) {
      console.error('Error retrying:', error);
      toast.showToast(error.response?.data?.message || 'Failed to retry', 'error');
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-100 mb-2">Process Not Found</h1>
          <p className="text-slate-400 mb-6">The process you are looking for does not exist.</p>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="btn-primary py-3 px-6"
          >
            View History
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    completed: {
      label: 'Completed',
      container: 'bg-emerald-950/40 border-emerald-500',
      text: 'text-emerald-200',
    },
    partial: {
      label: 'Partial',
      container: 'bg-amber-950/40 border-amber-500',
      text: 'text-amber-200',
    },
    failed: {
      label: 'Failed',
      container: 'bg-red-950/40 border-red-500',
      text: 'text-red-200',
    },
    processing: {
      label: 'Processing',
      container: 'bg-cyan-950/40 border-cyan-500',
      text: 'text-cyan-200',
    },
  };

  const status = statusConfig[process.status] || statusConfig.processing;
  const successPercentage = process.totalRows > 0 ? Math.round((process.successCount / process.totalRows) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 animate-fade">
          <h1 className="text-4xl font-bold text-slate-100">Processing Results</h1>
          <p className="text-slate-400 mt-2">View the detailed results of your content generation</p>
        </div>

        <div className="card-glass shadow-soft rounded-2xl p-8 mb-8 animate-fade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-2">File Name</p>
              <p className="text-xl font-bold text-slate-100">{process.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-2">Template</p>
              <p className="text-xl font-bold text-slate-100">{process.templateName}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-2">Post Type</p>
              <p className="text-xl font-bold text-slate-100 capitalize">{process.postType || 'WordPress'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400 mb-2">Started At</p>
              <p className="text-xl font-bold text-slate-100 text-sm">
                {new Date(process.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-l-4 ${status.container}`}>
            <p className={`font-bold capitalize ${status.text}`}>Status: {status.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade">
          <div className="card-glass shadow-soft rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-slate-100">{process.totalRows}</p>
            <p className="text-sm text-slate-400 mt-2 font-semibold">Total Rows</p>
          </div>
          <div className="card-glass shadow-soft rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-emerald-300">{process.successCount}</p>
            <p className="text-sm text-slate-400 mt-2 font-semibold">Success</p>
          </div>
          <div className="card-glass shadow-soft rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-red-300">{process.failedCount}</p>
            <p className="text-sm text-slate-400 mt-2 font-semibold">Failed</p>
          </div>
          <div className="card-glass shadow-soft rounded-xl p-6 text-center">
            <p className="text-3xl font-bold text-cyan-300">{successPercentage}%</p>
            <p className="text-sm text-slate-400 mt-2 font-semibold">Success Rate</p>
          </div>
        </div>

        <div className="mb-8 animate-fade">
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold text-slate-200">Overall Progress</p>
            <p className="text-sm text-slate-400">{process.successCount + process.failedCount} / {process.totalRows}</p>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${successPercentage}%` }}
            ></div>
          </div>
        </div>

        {process.successRows && process.successRows.length > 0 && (
          <div className="card-glass shadow-soft rounded-2xl p-8 mb-8 animate-fade">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">
              Successful Rows ({process.successRows.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {process.successRows.map((row, index) => {
                return (
                  <div
                    key={index}
                    className="border-l-4 border-emerald-500 pl-4 py-3 bg-emerald-950/30 rounded-lg transition-shadow duration-300"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100">Row {row.rowNumber}</p>
                        {row.seoTitle && (
                          <p className="text-sm text-slate-300 mt-1 truncate">{row.seoTitle}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {row.postUrl && (
                            <a
                              href={row.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-300 hover:underline"
                            >
                              View Post
                            </a>
                          )}
                          {row.productUrl && (
                            <a
                              href={row.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-emerald-300 hover:underline"
                            >
                              View Product
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {row.postId != null && (
                          <span className="badge badge-success">Post: {row.postId}</span>
                        )}
                        {row.productId != null && (
                          <span className="badge badge-info">Product: {row.productId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {process.failedRows && process.failedRows.length > 0 && (
          <div className="card-glass shadow-soft rounded-2xl p-8 animate-fade">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Failed Rows ({process.failedRows.length})</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {process.failedRows.map((row, index) => (
                <div
                  key={index}
                  className="border-l-4 border-red-500 pl-4 py-3 bg-red-950/30 rounded-lg transition-shadow duration-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-slate-100">Row {row.rowNumber}</p>
                      <p className="text-sm text-red-300 font-medium mt-1">{row.error}</p>
                    </div>
                    <span className="badge badge-error">Error</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                    className="text-xs text-cyan-300 hover:underline font-semibold mt-2"
                  >
                    {expandedRow === index ? 'Hide Row Data' : 'View Row Data'}
                  </button>

                  {expandedRow === index && (
                    <div className="mt-3 bg-slate-900 p-3 rounded border border-slate-700">
                      <pre className="text-xs overflow-auto text-slate-300 whitespace-pre-wrap break-words">
                        {JSON.stringify(row.rowData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!process.successRows || process.successRows.length === 0) && (!process.failedRows || process.failedRows.length === 0) && (
          <div className="card-glass shadow-soft rounded-2xl p-12 text-center animate-fade">
            <p className="text-xl font-semibold text-slate-100">No results available yet</p>
            <p className="text-slate-400 mt-2">The processing is either in progress or no data has been processed.</p>
          </div>
        )}

        <div className="mt-12 flex gap-4 animate-fade">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex-1 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg font-semibold py-3 hover:bg-slate-700 transition-all duration-300"
          >
            View History
          </button>
          <button
            type="button"
            onClick={() => navigate('/process')}
            className="flex-1 btn-primary py-3"
          >
            Process More Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default Results;
