import React from 'react';
import { SandboxStatus } from '../SandboxdApi';
interface AppCardStatusProps {
    status: SandboxStatus;
}
/**
 * Colored status indicator for sandboxd app status.
 */
export declare const AppCardStatus: React.FC<AppCardStatusProps>;
export {};
