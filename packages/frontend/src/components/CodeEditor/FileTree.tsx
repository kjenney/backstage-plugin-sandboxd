import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  CircularProgress,
} from '@material-ui/core';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ChevronDownIcon,
} from '@material-ui/icons';
import { SandboxFileNode } from '../SandboxdApi';

interface FileTreeProps {
  nodes?: SandboxFileNode[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
}

/**
 * Recursive file-tree node component.
 */
const FileTreeNode: React.FC<{
  node: SandboxFileNode;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  expandedPaths?: Set<string>;
  onToggleExpand?: (path: string) => void;
  depth: number;
}> = ({
  node,
  selectedPath,
  onSelect,
  expandedPaths,
  onToggleExpand,
  depth,
}) => {
  const isExpanded = expandedPaths?.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDirectory) {
      onToggleExpand?.(node.path);
    } else {
      onSelect?.(node.path);
    }
  };

  return (
    <>
      <ListItem
        button
        onClick={handleClick}
        selected={isSelected}
        style={{ paddingLeft: depth * 16 }}
      >
        <ListItemIcon style={{ minWidth: 24 }}>
          {node.isDirectory ? (
            isExpanded ? (
              <ChevronDownIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )
          ) : null}
        </ListItemIcon>
        <ListItemIcon style={{ minWidth: 24 }}>
          {node.isDirectory ? (
            <FolderIcon fontSize="small" style={{ color: '#fbc02d' }} />
          ) : (
            <FileIcon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText primary={node.name} />
      </ListItem>
      {node.isDirectory && isExpanded && node.children && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List disablePadding>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
                depth={depth + 1}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

/**
 * File tree sidebar component for the code editor.
 */
export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  selectedPath,
  onSelect,
  expandedPaths = new Set(),
  onToggleExpand,
}) => {
  if (!nodes) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight={100}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (nodes.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" style={{ padding: 8 }}>
        No files found.
      </Typography>
    );
  }

  return (
    <List>
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          depth={0}
        />
      ))}
    </List>
  );
};

import { Box } from '@material-ui/core';
