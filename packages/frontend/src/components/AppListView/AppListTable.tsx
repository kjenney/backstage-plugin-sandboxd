import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  Button,
} from '@material-ui/core';
import { OpenInNew as OpenInNewIcon } from '@material-ui/icons';
import { SandboxApp, SandboxStatus } from '../SandboxdApi';
import { AppCardStatus } from '../AppCard/AppCardStatus';

const STATUS_COLORS: Record<SandboxStatus, string> = {
  running:  '#4caf50',
  sleeping: '#ff9800',
  stopped:  '#f44336',
};

interface AppListTableProps {
  apps: SandboxApp[];
  onRefresh?: () => void;
}

/**
 * Table rendering sandboxd app list with status, preview URL, and agent activity.
 */
export const AppListTable: React.FC<AppListTableProps> = ({
  apps,
  onRefresh,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>App Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Preview URL</TableCell>
            <TableCell>Agent Activity</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {apps.map((app) => (
            <TableRow key={app.name} hover>
              <TableCell>
                <Tooltip title={`Entity app: ${app.name}`}>
                  <span style={{ fontWeight: 500 }}>{app.name}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <AppCardStatus status={app.status} />
              </TableCell>
              <TableCell>
                {app.previewUrl ? (
                  <Tooltip title={app.previewUrl}>
                    <Button
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      href={app.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </Button>
                  </Tooltip>
                ) : (
                  <span style={{ color: '#999' }}>—</span>
                )}
              </TableCell>
              <TableCell>
                {app.agentActive ? (
                  <Chip
                    label={app.agentModel || 'Active'}
                    size="small"
                    style={{
                      backgroundColor: STATUS_COLORS[app.status] + '22',
                      border: `1px solid ${STATUS_COLORS[app.status]}44`,
                      color: STATUS_COLORS[app.status],
                    }}
                  />
                ) : (
                  <span style={{ color: '#999' }}>Idle</span>
                )}
              </TableCell>
              <TableCell>
                <Tooltip title="Refresh list">
                  <Button
                    size="small"
                    onClick={onRefresh}
                    disabled={!onRefresh}
                  >
                    ↻
                  </Button>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
