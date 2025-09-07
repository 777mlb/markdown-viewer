'use client';

import { useState, useMemo } from 'react';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
  isExpanded: boolean;
}

interface FileTreeViewProps {
  files: string[];
  selectedFile: string | null;
  onFileSelect: (path: string) => void;
}

export default function FileTreeView({ files, selectedFile, onFileSelect }: FileTreeViewProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fileTree = useMemo(() => {
    const root: TreeNode = { name: '', path: '', type: 'folder', children: [], isExpanded: true };
    
    files.forEach(filePath => {
      const parts = filePath.split('/');
      let currentNode = root;
      let currentPath = '';
      
      // Build the path progressively
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = index === parts.length - 1;
        
        let existingNode = currentNode.children.find(child => child.name === part);
        
        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: [],
            isExpanded: expandedFolders.has(currentPath)
          };
          currentNode.children.push(existingNode);
        }
        
        currentNode = existingNode;
      });
    });
    
    // Sort: folders first, then files, both alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    
    sortNodes(root.children);
    return root;
  }, [files, expandedFolders]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    const indentSize = 12;
    
    return (
      <div key={node.path}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: `${depth * indentSize + 8}px`,
            paddingRight: '8px',
            paddingTop: '2px',
            paddingBottom: '2px',
            cursor: 'pointer',
            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
            color: isSelected ? '#1976d2' : '#333',
            fontSize: '13px',
            lineHeight: '18px',
            userSelect: 'none'
          }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* Expand/Collapse Arrow */}
          {node.type === 'folder' && (
            <span
              style={{
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '2px',
                fontSize: '10px',
                color: '#666',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.1s ease'
              }}
            >
              ▶
            </span>
          )}
          
          {/* Spacing for files (no arrow) */}
          {node.type === 'file' && (
            <span style={{ width: '18px', flexShrink: 0 }} />
          )}
          
          {/* Folder/File Icon */}
          <span
            style={{
              marginRight: '6px',
              fontSize: '12px',
              color: node.type === 'folder' ? '#90a4ae' : '#66bb6a'
            }}
          >
            {node.type === 'folder' ? (isExpanded ? '📂' : '📁') : '📄'}
          </span>
          
          {/* File/Folder Name */}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {node.name}
          </span>
        </div>
        
        {/* Render children if folder is expanded */}
        {node.type === 'folder' && isExpanded && node.children.map(child =>
          renderNode(child, depth + 1)
        )}
      </div>
    );
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {fileTree.children.map(node => renderNode(node))}
    </div>
  );
}