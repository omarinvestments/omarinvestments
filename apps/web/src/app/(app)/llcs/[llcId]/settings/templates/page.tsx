'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { TEMPLATE_PLACEHOLDERS } from '@/lib/constants/templatePlaceholders';

interface TemplatesPageProps {
  params: Promise<{ llcId: string }>;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  templateContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}

const DOCUMENT_TYPES = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'move_in_checklist', label: 'Move-In Checklist' },
  { value: 'move_out_checklist', label: 'Move-Out Checklist' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' },
];

export default function TemplatesPage({ params }: TemplatesPageProps) {
  const { llcId } = use(params);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit/Create form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'lease_agreement',
    description: '',
    templateContent: '',
    isDefault: false,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/templates`);
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.data);
      }
    } catch {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'lease_agreement',
      description: '',
      templateContent: '',
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      type: template.type,
      description: template.description || '',
      templateContent: template.templateContent,
      isDefault: template.isDefault,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const url = editingId
        ? `/api/llcs/${llcId}/templates/${editingId}`
        : `/api/llcs/${llcId}/templates`;
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.ok) {
        setSuccess(editingId ? 'Template updated successfully' : 'Template created successfully');
        resetForm();
        fetchTemplates();
      } else {
        setError(data.error?.message || 'Failed to save template');
      }
    } catch {
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.ok) {
        fetchTemplates();
      } else {
        alert(data.error?.message || 'Failed to delete template');
      }
    } catch {
      alert('Failed to delete template');
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData((prev) => ({
      ...prev,
      templateContent: prev.templateContent + placeholder,
    }));
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading templates...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Document Templates</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            New Template
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm mb-6">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 text-green-800 rounded-md text-sm border border-green-200 mb-6">
          {success}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingId ? 'Edit Template' : 'New Template'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., Standard Lease Agreement"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  disabled={!!editingId}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Brief description of this template"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Template Content (HTML)</label>
              <div className="mb-2">
                <span className="text-xs text-muted-foreground">Available placeholders:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(TEMPLATE_PLACEHOLDERS).map(([placeholder, description]) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => insertPlaceholder(placeholder)}
                      className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
                      title={description}
                    >
                      {placeholder}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={formData.templateContent}
                onChange={(e) => setFormData((prev) => ({ ...prev, templateContent: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm font-mono"
                rows={12}
                placeholder="<h1>Lease Agreement</h1>\n<p>This agreement is between {{llc.name}} and {{tenant.name}}...</p>"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="isDefault" className="text-sm">
                Set as default template for this type
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Template</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Default</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No templates created yet. Create a template to generate documents.
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-muted-foreground">{template.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {template.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">
                    {template.isDefault ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        Default
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-primary hover:underline text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="text-destructive hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
