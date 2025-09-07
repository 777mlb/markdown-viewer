'use client';

import { useState } from 'react';
import { marked } from 'marked';
import MarkdownViewer from '@/components/MarkdownViewer';

interface TreeResponse {
  branch: string;
  files: string[];
}

interface FileResponse {
  markdown: string;
  sha: string;
  name: string;
  path: string;
}

export default function Home() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);

  const loadFiles = async () => {
    if (!owner.trim() || !repo.trim()) {
      setError('Please enter both owner and repository name');
      return;
    }

    setLoading(true);
    setError('');
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');

    try {
      const params = new URLSearchParams({ owner: owner.trim(), repo: repo.trim() });
      if (branch.trim()) {
        params.append('branch', branch.trim());
      }

      const response = await fetch(`/api/repo/tree?${params}`);
      const data: TreeResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Failed to load files');
      }

      const treeData = data as TreeResponse;
      setFiles(treeData.files);
      setCurrentBranch(treeData.branch);

      if (treeData.files.length === 0) {
        setError('No markdown files found in this repository');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const loadFile = async (path: string) => {
    if (!owner || !repo) return;

    setLoadingFile(true);
    setSelectedFile(path);
    setFileContent('');

    try {
      const params = new URLSearchParams({ 
        owner, 
        repo, 
        path,
      });
      if (currentBranch) {
        params.append('ref', currentBranch);
      }

      const response = await fetch(`/api/repo/file?${params}`);
      const data: FileResponse | { error: string } = await response.json();

      if (!response.ok) {
        throw new Error('error' in data ? data.error : 'Failed to load file');
      }

      const fileData = data as FileResponse;
      const html = marked.parse(fileData.markdown);
      setFileContent(html as string);
    } catch (err: any) {
      setError(`Failed to load file: ${err.message}`);
      setFileContent('');
    } finally {
      setLoadingFile(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e0e0e0', 
        backgroundColor: '#f8f9fa',
        flexShrink: 0
      }}>
        <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 'bold' }}>
          Markdown Viewer
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Owner (e.g., vercel)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          />
          <input
            type="text"
            placeholder="Repository (e.g., next.js)"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          />
          <input
            type="text"
            placeholder="Branch (optional)"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minWidth: '120px'
            }}
          />
          <button
            onClick={loadFiles}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {loading ? 'Loading...' : 'Load Files'}
          </button>
        </div>
        {currentBranch && (
          <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#666' }}>
            Branch: {currentBranch}
          </p>
        )}
        {error && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ 
          width: '300px', 
          borderRight: '1px solid #e0e0e0', 
          backgroundColor: '#f8f9fa',
          overflow: 'auto',
          flexShrink: 0
        }}>
          {files.length > 0 && (
            <div style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                Markdown Files ({files.length})
              </h3>
              <div>
                {files.map((file) => (
                  <button
                    key={file}
                    onClick={() => loadFile(file)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      margin: '2px 0',
                      textAlign: 'left',
                      border: '1px solid transparent',
                      borderRadius: '4px',
                      backgroundColor: selectedFile === file ? '#e3f2fd' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: selectedFile === file ? '#1976d2' : '#333',
                      wordBreak: 'break-word'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFile !== file) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFile !== file) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {file}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
          {loadingFile ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '200px',
              fontSize: '16px',
              color: '#666'
            }}>
              Loading file...
            </div>
          ) : fileContent ? (
            <MarkdownViewer html={fileContent} />
          ) : selectedFile ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: '#666',
              fontSize: '16px'
            }}>
              Failed to load file content
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              fontSize: '16px',
              color: '#999',
              textAlign: 'center'
            }}>
              {files.length > 0 ? 'Select a markdown file to view' : 'Load a repository to get started'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}