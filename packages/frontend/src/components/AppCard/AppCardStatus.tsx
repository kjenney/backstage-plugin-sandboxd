import React from 'react';
import { Chip } from '@material-ui/core';
import { FiberManualRecord as DotIcon } from '@material-ui/icons';
import { SandboxStatus } from '../SandboxdApi';

const STATUS_CONFIG: Record<SandboxStatus, { label: string; color: string }> = {
  running:  { label: 'Running',  color: '#4caf50' },  // green
  sleeping: { label: 'Sleeping', color: '#ff9800' },  // amber
  stopped:  { label: 'Stopped',  color: '#f44336' },  // red
};

interface AppCardStatusProps {
  status: SandboxStatus;
}

/**
 * Colored status indicator for sandboxd app status.
 */
export const AppCardStatus: React.FC<AppCardStatusProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];

  return (
    <Chip
      label={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <DotIcon style={{ fontSize: 12, color: config.color }} />
          {config.label}
        </span>
      }
      style={{
        backgroundColor: config.color + '22',
        border: `1px solid ${config.color}44`,
        color: config.color,
        fontWeight: 500,
      }}
      size="small"
    />
  );
};
