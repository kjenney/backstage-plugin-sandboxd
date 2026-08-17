import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Collapse,
} from '@mui/material';
import {
  Launch as DeployIcon,
  Storage as StorageIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  SandboxdPreset,
  useSandboxdCreateApp,
  useSandboxdValidateManifest,
  useSandboxdCreateEntity,
} from './AppStoreApi';

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

export const DeployWizard: React.FC<DeployWizardProps> = ({
  presets,
  preselectedPreset,
  open,
  onClose,
  onDeployed,
}) => {
  const [step, setStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<SandboxdPreset | null>(null);
  const [appName, setAppName] = useState('');
  const [customManifest, setCustomManifest] = useState<string>('');
  const [useCustomManifest, setUseCustomManifest] = useState(false);
  const [manifestValid, setManifestValid] = useState<boolean | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploySuccess, setDeploySuccess] = useState(false);

  const createApp = useSandboxdCreateApp();
  const validateManifest = useSandboxdValidateManifest();
  const createEntity = useSandboxdCreateEntity();

  // Pre-select the preset from AppStoreView card click
  React.useEffect(() => {
    if (open && preselectedPreset) {
      setSelectedPreset(preselectedPreset);
      setAppName(preselectedPreset.name);
      setStep(1); // Skip to step 1 (configure) when preselected
    }
  }, [open, preselectedPreset]);

  const reset = () => {
    setStep(0);
    setSelectedPreset(null);
    setAppName('');
    setCustomManifest('');
    setUseCustomManifest(false);
    setManifestValid(null);
    setDeploying(false);
    setDeployError(null);
    setDeploySuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleNext = () => {
    if (step === 0 && selectedPreset) {
      setAppName(selectedPreset.name);
      setStep(1);
    } else if (step === 1 && appName.trim()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployError(null);
    try {
      const payload: {
        name: string;
        presetId?: string;
        manifest?: Record<string, unknown>;
      } = { name: appName.trim() };

      if (selectedPreset) {
        payload.presetId = selectedPreset.id;
      }

      if (useCustomManifest && customManifest.trim()) {
        try {
          const parsed = JSON.parse(customManifest);
          payload.manifest = parsed;
        } catch {
          setDeployError('Invalid JSON in custom manifest');
          setDeploying(false);
          return;
        }
      }

      const app = await createApp(payload);

      // After successful deploy, create a corresponding Backstage entity
      // so the app appears in the Software Catalog with sandboxd annotations
      try {
        await createEntity(app.id);
      } catch (entityErr) {
        // Entity creation failure is non-fatal — the entity sync provider
        // will pick up the entity on the next periodic sync
        console.warn(
          'Failed to create Backstage entity for deployed app (will sync later):',
          entityErr,
        );
      }

      setDeploySuccess(true);
    } catch (err) {
      setDeployError(
        err instanceof Error ? err.message : 'Deployment failed',
      );
    } finally {
      setDeploying(false);
    }
  };

  const handleManifestValidate = async () => {
    try {
      const parsed = JSON.parse(customManifest);
      const result = await validateManifest(parsed);
      setManifestValid(result.valid);
    } catch {
      setManifestValid(false);
    }
  };

  const handleDone = () => {
    reset();
    onDeployed();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      {/* Step 0: Preset Selection */}
      {step === 0 && (
        <>
          <DialogTitle>Select an App to Deploy</DialogTitle>
          <DialogContent dividers>
            <DialogContentText style={{ marginBottom: 16 }}>
              Choose a curated app from the store, or skip to deploy a custom app.
            </DialogContentText>

            <List>
              {presets.map((preset) => (
                <ListItem
                  key={preset.id}
                  button
                  selected={selectedPreset?.id === preset.id}
                  onClick={() => setSelectedPreset(preset)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      {preset.icon ? (
                        <img src={preset.icon} alt={preset.name} width="100%" />
                      ) : (
                        <StorageIcon />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={preset.name}
                    secondary={
                      <>
                        {preset.description}
                        <Box mt={0.5}>
                          {preset.category && (
                            <Chip
                              label={preset.category}
                              size="small"
                              style={{ marginRight: 4 }}
                            />
                          )}
                          {preset.framework && (
                            <Chip
                              label={preset.framework}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </>
                    }
                  />
                  <Radio
                    checked={selectedPreset?.id === preset.id}
                    onChange={() => setSelectedPreset(preset)}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleNext}
              disabled={!selectedPreset}
              endIcon={<ArrowForwardIcon />}
            >
              Continue
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 1: App Name & Manifest */}
      {step === 1 && (
        <>
          <DialogTitle>Configure Deployment</DialogTitle>
          <DialogContent dividers>
            {selectedPreset && (
              <Box mb={2}>
                <Typography variant="subtitle1" color="textSecondary">
                  Selected Preset
                </Typography>
                <Chip
                  label={selectedPreset.name}
                  onClick={() => setStep(0)}
                  style={{ cursor: 'pointer' }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              label="App Name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              margin="normal"
              required
            />

            <Divider style={{ margin: '16px 0' }} />

            <FormControl component="fieldset" style={{ marginTop: 8 }}>
              <FormLabel component="legend">Deployment Mode</FormLabel>
              <RadioGroup
                value={useCustomManifest ? 'custom' : 'preset'}
                onChange={(e) => setUseCustomManifest(e.target.value === 'custom')}
              >
                <FormControlLabel
                  value="preset"
                  control={<Radio />}
                  label="Use preset defaults (recommended)"
                />
                <FormControlLabel
                  value="custom"
                  control={<Radio />}
                  label="Custom manifest (advanced)"
                />
              </RadioGroup>
            </FormControl>

            <Collapse in={useCustomManifest}>
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Provide a sandbox.yaml manifest as JSON to customize the
                  deployment. This overrides preset defaults.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Custom Manifest (JSON)"
                  value={customManifest}
                  onChange={(e) => setCustomManifest(e.target.value)}
                  margin="normal"
                  style={{ fontFamily: 'monospace' }}
                />
                <Box mt={1} display="flex" alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleManifestValidate}
                    style={{ marginRight: 8 }}
                  >
                    Validate
                  </Button>
                  {manifestValid === true && (
                    <Chip
                      label="Valid"
                      size="small"
                      color="primary"
                      icon={<CheckCircleIcon />}
                    />
                  )}
                  {manifestValid === false && (
                    <Chip label="Invalid" size="small" color="error" />
                  )}
                </Box>
              </Box>
            </Collapse>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!appName.trim()}
              endIcon={<ArrowForwardIcon />}
            >
              Review
            </Button>
          </DialogActions>
        </>
      )}

      {/* Step 2: Review & Deploy */}
      {step === 2 && (
        <>
          <DialogTitle>Review & Deploy</DialogTitle>
          <DialogContent dividers>
            {!deploySuccess && !deploying && (
              <>
                <DialogContentText style={{ marginBottom: 16 }}>
                  Confirm your deployment settings before proceeding.
                </DialogContentText>

                <Typography variant="subtitle1" gutterBottom>
                  Deployment Summary
                </Typography>
                <Box mb={1}>
                  <Typography variant="body2">
                    <strong>App Name:</strong> {appName}
                  </Typography>
                  {selectedPreset && (
                    <Typography variant="body2">
                      <strong>Preset:</strong> {selectedPreset.name}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Mode:</strong>{' '}
                    {useCustomManifest ? 'Custom Manifest' : 'Preset Defaults'}
                  </Typography>
                </Box>

                {useCustomManifest && customManifest && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Manifest
                    </Typography>
                    <Box
                      component="pre"
                      style={{
                        background: '#f5f5f5',
                        padding: 8,
                        borderRadius: 4,
                        overflow: 'auto',
                        fontSize: 12,
                      }}
                    >
                      {customManifest}
                    </Box>
                  </Box>
                )}
              </>
            )}

            {deploying && (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={4}
              >
                <CircularProgress size={48} />
                <Typography variant="body1" style={{ marginTop: 16 }}>
                  Deploying {appName}…
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  This may take a moment.
                </Typography>
              </Box>
            )}

            {deploySuccess && (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={4}
              >
                <CheckCircleIcon color="primary" style={{ fontSize: 64 }} />
                <Typography variant="h6" style={{ marginTop: 16 }}>
                  Deployed Successfully
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>{appName}</strong> is now running.
                </Typography>
              </Box>
            )}

            {deployError && (
              <Box
                mt={2}
                display="flex"
                alignItems="flex-start"
                style={{
                  padding: 12,
                  backgroundColor: '#ffebee',
                  borderRadius: 4,
                  border: '1px solid #ffcdd2',
                }}
              >
                <Typography variant="body2" color="error">{deployError}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {!deploySuccess && !deploying && (
              <>
                <Button onClick={handleBack} startIcon={<ArrowBackIcon />}>
                  Back
                </Button>
                <Button
                  onClick={handleDeploy}
                  variant="contained"
                  color="primary"
                  startIcon={<DeployIcon />}
                >
                  Deploy
                </Button>
              </>
            )}
            {deploySuccess && (
              <Button onClick={handleDone} variant="contained" color="primary">
                Done
              </Button>
            )}
            {deployError && !deploying && (
              <Button onClick={handleDeploy}>Retry</Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
