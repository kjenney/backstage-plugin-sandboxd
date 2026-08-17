import React from 'react';
import { SandboxApp } from '../SandboxdApi';
interface AppListTableProps {
    apps: SandboxApp[];
    onRefresh?: () => void;
}
/**
 * Table rendering sandboxd app list with status, preview URL, and agent activity.
 */
export declare const AppListTable: React.FC<AppListTableProps>;
export {};
