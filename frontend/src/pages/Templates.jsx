import React, { useState, useEffect } from 'react';
import { templateAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Templates = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const initialFormState = {
    name: '',
    category: 'general',
    description: '',
    template: '',
    supportedPostTypes: ['wordpress'],
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateAPI.getAll();
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.showToast('Failed to fetch templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormData(initialFormState);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.template.trim()) {
      toast.showToast('Template name and prompt are required.', 'warning');
      return;
    }

    try {
      setSubmitting(true);

      if (editingTemplate) {
        await templateAPI.update(editingTemplate._id, formData);
        toast.showToast('Template updated successfully!', 'success');
      } else {
        await templateAPI.create(formData);
        toast.showToast('Template created successfully!', 'success');
      }

      await fetchTemplates();
      resetForm();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.showToast(error.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      category: template.category || 'general',
      description: template.description || '',
      template: template.template || '',
      supportedPostTypes: template.supportedPostTypes || ['wordpress'],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const ok = await confirm.confirm('Are you sure you want to delete this template?', { confirmText: 'Delete', variant: 'danger' });
    if (!ok) return;

    try {
      await templateAPI.delete(id);
      toast.showToast('Template deleted successfully!', 'success');
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.showToast('Failed to delete template', 'error');
    }
  };

  const togglePlatform = (platform) => {
    setFormData((prev) => {
      const exists = prev.supportedPostTypes.includes(platform);
      if (exists && prev.supportedPostTypes.length === 1) {
        toast.showToast('At least one platform must remain selected.', 'warning');
        return prev;
      }
      return {
        ...prev,
        supportedPostTypes: exists
          ? prev.supportedPostTypes.filter((p) => p !== platform)
          : [...prev.supportedPostTypes, platform],
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-500"></div>
          <p className="mt-4 text-slate-400 font-semibold">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-2">
            Prompt Templates
          </h1>
          <p className="text-slate-400">
            Create and manage AI content generation templates
          </p>
        </div>

        <button
          type="button"
          onClick={() => (showForm ? resetForm() : openCreateForm())}
          className="mt-6 md:mt-0 btn-primary"
        >
          {showForm ? 'Close' : 'Create Template'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-glass shadow-soft rounded-2xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-100 mb-6">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-modern"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="input-modern"
                >
                  <option value="general">General</option>
                  <option value="tours">Tours</option>
                  <option value="products">Products</option>
                  <option value="blog">Blog Posts</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input-modern"
              />
            </div>

            {/* Platforms */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Supported Platforms
              </label>

              <div className="space-y-2">
                {['wordpress', 'woocommerce'].map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.supportedPostTypes.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                      className="w-5 h-5 text-cyan-500 rounded border-slate-500 bg-slate-700"
                    />
                    <span className="text-slate-300">
                      {platform === 'wordpress'
                        ? 'WordPress Posts'
                        : 'WooCommerce Products'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                AI Prompt Template *
              </label>
              <textarea
                value={formData.template}
                onChange={(e) =>
                  setFormData({ ...formData, template: e.target.value })
                }
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-sm min-h-[300px] text-slate-100"
                required
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-700">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 btn-primary"
              >
                {submitting
                  ? 'Saving...'
                  : editingTemplate
                  ? 'Update Template'
                  : 'Create Template'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="card-glass shadow-soft rounded-2xl p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            No Templates Yet
          </h3>
          <button type="button" onClick={openCreateForm} className="btn-primary">
            Create First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div
              key={template._id}
              className="card-glass shadow-soft rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-slate-100">
                {template.name}
              </h3>

              <div className="flex gap-2 mt-2 mb-4">
                <span className="badge badge-info">
                  {template.category}
                </span>
                {template.supportedPostTypes?.map((type) => (
                  <span key={type} className="badge badge-success">
                    {type}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => handleEdit(template)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-cyan-300 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors duration-200"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(template._id)}
                  className="flex-1 px-4 py-2 bg-red-950/50 text-red-300 rounded-lg border border-red-900 hover:bg-red-900/50 transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Templates;
