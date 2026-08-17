import React from 'react';
import { SandboxFileNode } from '../SandboxdApi';
interface FileTreeProps {
    nodes?: SandboxFileNode[];
    selectedPath?: string;
    onSelect?: (path: string) => void;
    expandedPaths?: Set<string>;
    onToggleExpand?: (path: string) => void;
}
/**
 * File tree sidebar component for the code editor.
 */
export declare const FileTree: React.FC<FileTreeProps>;
export {};
