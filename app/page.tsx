'use client';

import { useState } from 'react';
import { marked } from 'marked';
import MarkdownViewer from '@/components/MarkdownViewer';
import FileTreeView from '@/components/FileTreeView';

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
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);

  const parseGithubUrl = (url: string): { owner: string; repo: string; branch?: string } | null => {
    try {
      // Remove trailing slashes and normalize
      const cleanUrl = url.trim().replace(/\/$/, '');
      
      // Support various GitHub URL formats
      const patterns = [
        // https://github.com/owner/repo
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
        // github.com/owner/repo (without protocol)
        /^(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+))?/,
        // Just owner/repo
        /^([^\/\s]+)\/([^\/\s]+)$/
      ];

      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match) {
          const [, owner, repo, branch] = match;
          // Clean up repo name (remove .git suffix if present)
          const cleanRepo = repo.replace(/\.git$/, '');
          return { owner, repo: cleanRepo, branch };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlChange = (url: string) => {
    setGithubUrl(url);
    const parsed = parseGithubUrl(url);
    if (parsed) {
      setOwner(parsed.owner);
      setRepo(parsed.repo);
      if (parsed.branch) {
        setBranch(parsed.branch);
      }
      setError('');
    }
  };

  const loadFiles = async () => {
    if (!owner.trim() || !repo.trim()) {
      if (githubUrl.trim()) {
        const parsed = parseGithubUrl(githubUrl);
        if (!parsed) {
          setError('Please enter a valid GitHub repository URL (e.g., https://github.com/vercel/next.js)');
          return;
        }
        setOwner(parsed.owner);
        setRepo(parsed.repo);
        if (parsed.branch) {
          setBranch(parsed.branch);
        }
      } else {
        setError('Please enter a GitHub repository URL or owner/repository details');
        return;
      }
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
        {/* GitHub URL Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '6px', 
            fontSize: '14px', 
            fontWeight: '500',
            color: '#333'
          }}>
            GitHub Repository URL
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="https://github.com/vercel/next.js or vercel/next.js"
              value={githubUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
                minWidth: '400px',
                flex: 1
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
        </div>

        {/* Manual Input Fields */}
        <details style={{ marginTop: '12px' }}>
          <summary style={{ 
            cursor: 'pointer', 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '8px'
          }}>
            Or enter details manually
          </summary>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Owner (e.g., vercel)"
              value={owner}
              onChange={(e) => {
                setOwner(e.target.value);
                setGithubUrl(''); // Clear URL when manually editing
              }}
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
              onChange={(e) => {
                setRepo(e.target.value);
                setGithubUrl(''); // Clear URL when manually editing
              }}
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
          </div>
        </details>
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
          width: '320px', 
          borderRight: '1px solid #e0e0e0', 
          backgroundColor: '#f8f9fa',
          overflow: 'auto',
          flexShrink: 0
        }}>
          {files.length > 0 && (
            <div>
              <div style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#ffffff'
              }}>
                <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '600', color: '#666' }}>
                  EXPLORER
                </h3>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#999', 
                  marginTop: '2px'
                }}>
                  {files.length} markdown files
                </div>
              </div>
              <FileTreeView 
                files={files}
                selectedFile={selectedFile}
                onFileSelect={loadFile}
              />
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