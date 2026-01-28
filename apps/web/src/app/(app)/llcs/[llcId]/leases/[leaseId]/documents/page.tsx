'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface DocumentsPageProps {
  params: Promise<{ llcId: string; leaseId: string }>;
}

interface LeaseDocument {
  id: string;
  type: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl?: string;
  generatedFromTemplate?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  isDefault: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'addendum', label: 'Addendum' },
  { value: 'move_in_checklist', label: 'Move-In Checklist' },
  { value: 'move_out_checklist', label: 'Move-Out Checklist' },
  { value: 'notice', label: 'Notice' },
  { value: 'other', label: 'Other' },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { llcId, leaseId } = use(params);

  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('other');
  const [uploadTitle, setUploadTitle] = useState('');

  // Generate form state
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [docsRes, templatesRes] = await Promise.all([
        fetch(`/api/llcs/${llcId}/leases/${leaseId}/documents`),
        fetch(`/api/llcs/${llcId}/templates`),
      ]);

      const docsData = await docsRes.json();
      if (docsData.ok) {
        setDocuments(docsData.data);
      }

      const templatesData = await templatesRes.json();
      if (templatesData.ok) {
        setTemplates(templatesData.data);
      }
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [llcId, leaseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setError('');

    try {
      // 1. Get upload URL
      const urlRes = await fetch(`/api/llcs/${llcId}/leases/${leaseId}/documents/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadFile.name,
          contentType: uploadFile.type,
          sizeBytes: uploadFile.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlData.ok) {
        throw new Error(urlData.error?.message || 'Failed to get upload URL');
      }

      // 2. Upload to Storage
      const uploadRes = await fetch(urlData.data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': uploadFile.type },
        body: uploadFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      // 3. Create document record
      const docRes = await fetch(`/api/llcs/${llcId}/leases/${leaseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: uploadType,
          title: uploadTitle || uploadFile.name,
          fileName: uploadFile.name,
          storagePath: urlData.data.storagePath,
          contentType: uploadFile.type,
          sizeBytes: uploadFile.size,
        }),
      });

      const docData = await docRes.json();
      if (!docData.ok) {
        throw new Error(docData.error?.message || 'Failed to create document record');
      }

      // Reset form and refresh
      setUploadFile(null);
      setUploadType('other');
      setUploadTitle('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.ok) {
        fetchData();
      } else {
        alert(data.error?.message || 'Failed to delete document');
      }
    } catch {
      alert('Failed to delete document');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) return;

    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`/api/llcs/${llcId}/leases/${leaseId}/documents/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId }),
      });

      const data = await res.json();
      if (data.ok) {
        setGeneratedContent(data.data.renderedContent);
        setShowPreview(true);
      } else {
        throw new Error(data.error?.message || 'Failed to generate document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading documents...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/llcs/${llcId}/leases/${leaseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to Lease
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Lease Documents</h1>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm mb-6">
          {error}
        </div>
      )}

      {/* Upload Section */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium mb-4">Upload Document</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Document Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Title (optional)</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                placeholder="Document title"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
              className="w-full text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: PDF, Word, images, text. Max 10MB.
            </p>
          </div>
          <button
            type="submit"
            disabled={!uploadFile || uploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      </div>

      {/* Generate from Template Section */}
      {templates.length > 0 && (
        <div className="border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">Generate from Template</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Select Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.type.replace(/_/g, ' ')})
                    {template.isDefault && ' - Default'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={!selectedTemplateId || generating}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {generating ? 'Generating...' : 'Generate Preview'}
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-medium">Document Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: generatedContent }}
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border rounded-md text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // For now, just copy to clipboard
                  navigator.clipboard.writeText(generatedContent);
                  alert('Content copied to clipboard. PDF generation coming soon.');
                  setShowPreview(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
              >
                Copy Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Document</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Size</th>
              <th className="text-left px-4 py-3 font-medium">Uploaded</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No documents uploaded yet.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-xs text-muted-foreground">{doc.fileName}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {doc.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {doc.downloadUrl && (
                        <a
                          href={doc.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs"
                        >
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
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

      {/* Link to template settings */}
      <div className="mt-6 text-sm text-muted-foreground">
        <Link href={`/llcs/${llcId}/settings/templates`} className="text-primary hover:underline">
          Manage document templates
        </Link>
      </div>
    </div>
  );
}
