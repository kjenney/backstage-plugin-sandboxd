import React from 'react';
import { SandboxdPreset } from './AppStoreApi';
/**
 * A multi-step deploy wizard that guides the user from preset selection
 * through optional manifest customization to deployment.
 */
interface DeployWizardProps {
    presets: SandboxdPreset[];
    preselectedPreset?: SandboxdPreset | null;
    open: boolean;
    onClose: () => void;
    onDeployed: () => void;
}
export declare const DeployWizard: React.FC<DeployWizardProps>;
export {};
