'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface MarkdownViewerProps {
  html: string;
}

export default function MarkdownViewer({ html }: MarkdownViewerProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: html,
    editable: true,
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(html, false);
    }
  }, [html, editor]);

  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '16px',
      height: '100%',
      overflow: 'auto',
      backgroundColor: '#fafafa'
    }}>
      <EditorContent 
        editor={editor}
        style={{
          minHeight: '400px',
          outline: 'none'
        }}
      />
    </div>
  );
}