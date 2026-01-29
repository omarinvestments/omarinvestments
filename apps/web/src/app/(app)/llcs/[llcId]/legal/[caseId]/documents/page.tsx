'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';

interface DocumentItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

interface DocumentsPageProps {
  params: Promise<{ llcId: string; caseId: string }>;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  filing: 'Filing',
  evidence: 'Evidence',
  notice: 'Notice',
  correspondence: 'Correspondence',
  court_order: 'Court Order',
  settlement: 'Settlement',
  other: 'Other',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage({ params }: DocumentsPageProps) {
  const { llcId, caseId } = use(params);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState('filing');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/documents`);
      const data = await res.json();

      if (data.ok) {
        setDocuments(data.data);
      } else {
        setError(data.error?.message || 'Failed to load documents');
      }
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [llcId, caseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title.trim()) {
      setUploadError('Please provide a title and select a file.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // 1. Get signed upload URL
      const urlRes = await fetch(`/api/llcs/${llcId}/cases/${caseId}/documents/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      const urlData = await urlRes.json();

      if (!urlData.ok) {
        setUploadError(urlData.error?.message || 'Failed to get upload URL');
        setUploading(false);
        return;
      }

      const { uploadUrl, storagePath } = urlData.data as { uploadUrl: string; storagePath: string };

      // 2. Upload file directly to Storage via signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        setUploadError('Failed to upload file to storage');
        setUploading(false);
        return;
      }

      // 3. Create document metadata
      const metaRes = await fetch(`/api/llcs/${llcId}/cases/${caseId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type: docType,
          fileName: file.name,
          storagePath,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });

      const metaData = await metaRes.json();

      if (metaData.ok) {
        setDocuments((prev) => [metaData.data, ...prev]);
        setTitle('');
        setDescription('');
        setDocType('filing');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowUpload(false);
      } else {
        setUploadError(metaData.error?.message || 'Failed to save document metadata');
      }
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/documents/${documentId}`);
      const data = await res.json();

      if (data.ok) {
        window.open(data.data.downloadUrl, '_blank');
      } else {
        alert(data.error?.message || 'Failed to get download URL');
      }
    } catch {
      alert('Failed to download');
    }
  };

  const handleDelete = async (documentId: string, docTitle: string) => {
    if (!confirm(`Delete document "${docTitle}"? The file will be permanently removed.`)) return;

    try {
      const res = await fetch(`/api/llcs/${llcId}/cases/${caseId}/documents/${documentId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      } else {
        alert(data.error?.message || 'Failed to delete document');
      }
    } catch {
      alert('Failed to delete document');
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading documents...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/llcs/${llcId}/legal/${caseId}`}
            className="text-muted-foreground hover:text-foreground text-sm">&larr; Case</Link>
          <h1 className="text-2xl font-bold">Documents</h1>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity text-sm">
          {showUpload ? 'Cancel' : '+ Upload'}
        </button>
      </div>

      {error && <div className="mb-4 text-destructive text-sm">{error}</div>}

      {showUpload && (
        <div className="mb-6 p-4 border rounded-lg space-y-3">
          {uploadError && (
            <div className="p-2 bg-destructive/10 text-destructive rounded text-sm">{uploadError}</div>
          )}
          <div>
            <label htmlFor="docTitle" className="block text-sm font-medium mb-1">Title *</label>
            <input id="docTitle" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Motion to Dismiss"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
          <div>
            <label htmlFor="docDescription" className="block text-sm font-medium mb-1">Description</label>
            <textarea id="docDescription" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the document (optional)"
              rows={2}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="docType" className="block text-sm font-medium mb-1">Type</label>
              <select id="docType" value={docType} onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-1">File *</label>
              <input id="file" type="file" ref={fileInputRef}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="w-full text-sm" />
            </div>
          </div>
          <button onClick={handleUpload} disabled={uploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No documents yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">File</th>
                <th className="text-left px-4 py-3 font-medium">Size</th>
                <th className="text-left px-4 py-3 font-medium">Uploaded</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{doc.title}</div>
                    {doc.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{doc.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {DOC_TYPE_LABELS[doc.type] || doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{doc.fileName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDownload(doc.id)}
                      className="text-xs text-muted-foreground hover:text-foreground mr-3">
                      Download
                    </button>
                    <button onClick={() => handleDelete(doc.id, doc.title)}
                      className="text-xs text-muted-foreground hover:text-destructive">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
