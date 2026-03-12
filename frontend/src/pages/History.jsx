import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { processAPI } from '../services/api';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const History = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await processAPI.getHistory();
      setHistory(response.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching history:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (processId) => {
    navigate(`/results/${processId}`);
  };

  const handleStopProcess = async (processId) => {
    try {
      const ok = await confirm.confirm('Are you sure you want to stop this process? It will finish the current row and then halt.', {
        confirmText: 'Stop Process',
        confirmColor: 'bg-red-600 hover:bg-red-700',
      });
      if (!ok) return;
      await processAPI.stopProcess(processId);
      toast.showToast('Stop command sent.', 'success');
      fetchHistory();
    } catch (error) {
      toast.showToast(error.response?.data?.message || 'Failed to stop process', 'error');
      console.error(error);
    }
  };

  const handleStopAll = async () => {
    try {
      const ok = await confirm.confirm('EMERGENCY STOP: Stop ALL currently active processes?', {
        confirmText: 'Stop All',
        confirmColor: 'bg-red-600 hover:bg-red-700',
      });
      if (!ok) return;
      const res = await processAPI.stopAllProcesses();
      if (res.data.stoppedCount > 0) {
        toast.showToast(`Sent stop signal to ${res.data.stoppedCount} process(es).`, 'success');
      } else {
        toast.showToast('No active processes to stop.', 'info');
      }
      fetchHistory();
    } catch (error) {
      toast.showToast('Failed to stop all processes.', 'error');
      console.error(error);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      completed: { color: 'badge-success', label: 'Completed' },
      partial: { color: 'badge-warning', label: 'Partial' },
      failed: { color: 'badge-error', label: 'Failed' },
      processing: { color: 'badge-info', label: 'Processing' },
      stopped: { color: 'bg-red-700 text-red-300 border border-red-600', label: 'Stopped' },
    };
    return configs[status] || configs.processing;
  };

  if (loading && history.length === 0) { // Only show full loading screen if no history is loaded yet
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 animate-fade flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-100">Processing History</h1>
            <p className="text-slate-400 mt-2">View all your past content generation processes</p>
          </div>

          <div className="flex gap-4 items-center">
            {history.some(item => item.status === 'processing') && (
              <button
                onClick={handleStopAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-600/30"
                title="Emergency Stop All Processes"
              >
                Stop All Active
              </button>
            )}
            <button
              onClick={() => {
                fetchHistory();
                toast.showToast('History refreshed', 'success');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="card-glass shadow-soft rounded-2xl p-16 text-center animate-fade">
            <h2 className="text-3xl font-bold text-slate-100 mb-2">No History Yet</h2>
            <p className="text-slate-400 mb-8">You have not processed any Excel files yet.</p>
            <button
              type="button"
              onClick={() => navigate('/process')}
              className="btn-primary py-4 px-8"
            >
              Process Your First Excel File
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade">
            {history.map((process, index) => {
              const statusConfig = getStatusConfig(process.status);
              const successRate = process.totalRows > 0
                ? Math.round((process.successCount / process.totalRows) * 100)
                : 0;

              return (
                <div
                  key={process._id}
                  className="card-glass shadow-soft rounded-2xl p-6 hover:shadow-hover transition-all duration-300 cursor-pointer"
                  onClick={() => handleViewDetails(process._id)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-100">{process.fileName}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Template: <span className="font-semibold text-slate-200">{process.templateName}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${statusConfig.color}`}>{statusConfig.label}</span>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(process.startedAt).toLocaleDateString()} {new Date(process.startedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {process.postType && (
                    <div className="mb-4 flex items-center space-x-2">
                      <span className="text-xs text-slate-300">
                        {process.postType === 'wordpress' && 'WordPress'}
                        {process.postType === 'woocommerce' && 'WooCommerce'}
                        {process.postType === 'both' && 'WordPress + WooCommerce'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="bg-slate-800 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-slate-100">{process.totalRows}</p>
                      <p className="text-xs text-slate-400">Total</p>
                    </div>
                    <div className="bg-emerald-950/40 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-emerald-300">{process.successCount}</p>
                      <p className="text-xs text-slate-400">Success</p>
                    </div>
                    <div className="bg-red-950/40 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-red-300">{process.failedCount}</p>
                      <p className="text-xs text-slate-400">Failed</p>
                    </div>
                    <div className="bg-cyan-950/40 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-cyan-300">{successRate}%</p>
                      <p className="text-xs text-slate-400">Rate</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${successRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {process.status === 'processing' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering handleViewDetails
                          handleStopProcess(process._id);
                        }}
                        className="w-1/3 bg-red-950/40 text-red-300 border border-red-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-red-900/60 transition-all duration-300"
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(process._id);
                      }}
                      className="flex-1 bg-slate-800 text-cyan-300 border border-slate-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-slate-700 transition-all duration-300"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => navigate('/process')}
              className="bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg font-semibold py-4 hover:bg-slate-700 transition-all duration-300"
            >
              Process New File
            </button>
            {/* The Refresh button is now part of the header, so this one is removed */}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;