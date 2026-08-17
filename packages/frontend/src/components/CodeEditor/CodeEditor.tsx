import React, { useEffect, useRef, useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Toolbar,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useEntity } from '@backstage/plugin-catalog-react';
import { EditorView, EditorState, basicSetup } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  useSandboxdFileTree,
  useSandboxdReadFile,
  useSandboxdWriteFile,
} from '../SandboxdApi';
import { FileTree } from './FileTree';

/**
 * Determine a CodeMirror language extension from a file path.
 */
function langFromPath(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript();
    case 'py':
      return python();
    case 'html':
    case 'htm':
      return html();
    default:
      return undefined;
  }
}

/**
 * CodeMirror-based code editor with file tree sidebar.
 *
 * Connects to sandboxd's file API for reading/writing files and shows
 * a file tree on the left with the editor on the right.
 */
export const CodeEditor: React.FC = () => {
  const { entity } = useEntity();
  const entityName = entity.metadata.name;
  const { value: fileTree, loading: treeLoading, error: treeError } =
    useSandboxdFileTree(entityName);
  const readFile = useSandboxdReadFile();
  const writeFile = useSandboxdWriteFile();

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['/']),
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  /* ---------- file operations ---------- */

  const handleSelectFile = async (path: string) => {
    setSelectedPath(path);
    setLoading(true);
    try {
      const content = await readFile(entityName, path);
      setEditorContent(content);
      if (viewRef.current) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: content,
          },
        });
      }
    } catch {
      // error handled by fetch wrapper
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPath) return;
    setSaving(true);
    try {
      await writeFile(entityName, selectedPath, editorContent);
    } catch {
      // error handled by fetch wrapper
    } finally {
      setSaving(false);
    }
  };

  /* ---------- CodeMirror setup ---------- */

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: editorContent,
      extensions: [basicSetup, oneDark],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
      dispatch: (tx: any) => {
        view.update([tx]);
        if (tx.docChanged) {
          setEditorContent(view.state.doc.toString());
        }
      },
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Re-initialize editor when language changes (e.g. file switched)
  useEffect(() => {
    if (!viewRef.current || !selectedPath) return;
    const langExt = langFromPath(selectedPath);
    const extensions: (typeof basicSetup | typeof oneDark | ReturnType<typeof javascript> | ReturnType<typeof python> | ReturnType<typeof html>)[] = [
      basicSetup,
      oneDark,
    ];
    if (langExt) {
      extensions.push(langExt);
    }
    const newState = EditorState.create({
      doc: editorContent,
      extensions,
    });
    viewRef.current.setState(newState);
  }, [selectedPath]);

  if (treeLoading) {
    return (
      <Paper style={{ padding: 16 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight={300}
        >
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (treeError) {
    return (
      <Paper style={{ padding: 16 }}>
        <Typography variant="body2" color="error">
          Failed to load file tree: {treeError.message}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper style={{ display: 'flex', height: '100%', minHeight: 500 }}>
      {/* File tree sidebar */}
      <Box
        width={260}
        borderRight="1px solid #e0e0e0"
        display="flex"
        flexDirection="column"
      >
        <Toolbar variant="dense">
          <Typography variant="subtitle2" color="textSecondary">
            Files
          </Typography>
        </Toolbar>
        <Box flex={1} overflow="auto">
          <FileTree
            nodes={fileTree}
            selectedPath={selectedPath || undefined}
            onSelect={handleSelectFile}
            expandedPaths={expandedPaths}
            onToggleExpand={(path) => {
              setExpandedPaths((prev) => {
                const next = new Set(prev);
                if (next.has(path)) {
                  next.delete(path);
                } else {
                  next.add(path);
                }
                return next;
              });
            }}
          />
        </Box>
      </Box>

      {/* Editor area */}
      <Box flex={1} display="flex" flexDirection="column">
        <Toolbar
          variant="dense"
          style={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Box flex={1}>
            <Typography variant="subtitle2" color="textSecondary">
              {selectedPath || 'No file selected'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!selectedPath || saving}
          >
            Save
          </Button>
        </Toolbar>
        <Box
          flex={1}
          p={1}
          position="relative"
          style={{ overflow: 'hidden' }}
        >
          {loading && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              bgcolor="rgba(255,255,255,0.7)"
            >
              <CircularProgress />
            </Box>
          )}
          <div ref={editorRef} style={{ width: '100%', height: '100%' }} />
        </Box>
      </Box>
    </Paper>
  );
};
