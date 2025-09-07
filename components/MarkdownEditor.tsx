'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';

interface MarkdownEditorProps {
  owner: string;
  repo: string;
  path: string;
  baseBranch?: string;
  baseSha: string;
  initialMarkdown: string;
  onPublishResult?: (result: { prUrl: string; prNumber: number }) => void;
  onConflict?: (conflict: { upstreamSha: string; upstreamMarkdown: string }) => void;
}

interface CreatePRRequest {
  owner: string;
  repo: string;
  path: string;
  baseBranch?: string;
  baseSha: string;
  markdown: string;
  prTitle?: string;
  prBody?: string;
}

export default function MarkdownEditor({
  owner,
  repo,
  path,
  baseBranch,
  baseSha,
  initialMarkdown,
  onPublishResult,
  onConflict
}: MarkdownEditorProps) {
  const [currentHtml, setCurrentHtml] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');

  // Create turndown service for HTML to Markdown conversion
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: marked.parse(initialMarkdown) as string,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Get the HTML content and track changes
      const html = editor.getHTML();
      setCurrentHtml(html);
    },
  });

  // Convert current HTML back to markdown for comparison and publishing
  const getCurrentMarkdown = () => {
    if (!currentHtml) return initialMarkdown;
    return turndownService.turndown(currentHtml);
  };

  const hasChanges = getCurrentMarkdown().trim() !== initialMarkdown.trim();

  const handlePublish = async () => {
    if (!hasChanges || isPublishing) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const request: CreatePRRequest = {
        owner,
        repo,
        path,
        baseBranch,
        baseSha,
        markdown: getCurrentMarkdown(),
        prTitle: prTitle.trim() || undefined,
        prBody: prBody.trim() || undefined,
      };

      const response = await fetch('/api/pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Conflict - upstream changed
        onConflict?.(data);
        setPublishError('File changed on GitHub. Please reload or resolve conflicts.');
        return;
      }

      if (!response.ok) {
        setPublishError(data.error || 'Failed to create pull request');
        return;
      }

      // Success!
      onPublishResult?.(data);
      
      // Show success toast
      setPublishError(null);
      
    } catch (error) {
      console.error('Error publishing:', error);
      setPublishError('Network error occurred while creating pull request');
    } finally {
      setIsPublishing(false);
    }
  };

  // Set initial HTML content when editor is ready
  useEffect(() => {
    if (editor && initialMarkdown && !currentHtml) {
      const html = marked.parse(initialMarkdown) as string;
      setCurrentHtml(html);
    }
  }, [editor, initialMarkdown, currentHtml]);

  // Update editor content when initialMarkdown changes (e.g., after conflict reload)
  useEffect(() => {
    if (editor && initialMarkdown) {
      const newHtml = marked.parse(initialMarkdown) as string;
      if (newHtml !== currentHtml) {
        editor.commands.setContent(newHtml);
        setCurrentHtml(newHtml);
      }
    }
  }, [initialMarkdown, editor]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#ffffff',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button
            onClick={handlePublish}
            disabled={!hasChanges || isPublishing}
            style={{
              padding: '8px 16px',
              backgroundColor: !hasChanges || isPublishing ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: !hasChanges || isPublishing ? 'not-allowed' : 'pointer',
            }}
          >
            {isPublishing ? 'Publishing...' : 'Publish (Create PR)'}
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {showAdvanced ? 'Hide Options' : 'PR Options'}
          </button>

          {hasChanges && (
            <span style={{ 
              fontSize: '12px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Advanced Options */}
        {showAdvanced && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#495057',
                marginBottom: '4px'
              }}>
                PR Title (optional)
              </label>
              <input
                type="text"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                placeholder={`Update ${path}`}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: '#495057',
                marginBottom: '4px'
              }}>
                PR Description (optional)
              </label>
              <textarea
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                placeholder="Edited via Notion-like editor"
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {publishError && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            {publishError}
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflow: 'auto',
        backgroundColor: '#ffffff'
      }}>
        <EditorContent
          editor={editor}
          style={{
            minHeight: '400px',
            outline: 'none'
          }}
        />
      </div>
    </div>
  );
}