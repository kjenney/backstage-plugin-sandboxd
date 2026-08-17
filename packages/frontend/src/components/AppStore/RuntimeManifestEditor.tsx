import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@material-ui/core';
import {
  Code as CodeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Build as BuildIcon,
} from '@material-ui/icons';
import {
  useSandboxdValidateManifest,
  useSandboxdCreateApp,
  useSandboxdRecipes,
  SandboxdRecipe,
} from './AppStoreApi';

/**
 * A manifest editor for sandboxd runtime manifests (sandbox.yaml).
 *
 * Allows users to:
 *   - Write/edit a JSON manifest for custom app configuration
 *   - Validate the manifest against sandboxd's schema
 *   - Deploy from a validated manifest
 *   - Start from a recipe template
 */
export const RuntimeManifestEditor: React.FC = () => {
  const [manifestText, setManifestText] = useState('');
  const [validationResult, setValidationResult] =
    useState<{ valid: boolean; errors?: string[]; warnings?: string[] } | null>(
      null,
    );
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [appName, setAppName] = useState('');

  const validateManifest = useSandboxdValidateManifest();
  const createApp = useSandboxdCreateApp();
  const { value: recipes } = useSandboxdRecipes();

  const handleValidate = useCallback(async () => {
    try {
      const parsed = JSON.parse(manifestText);
      const result = await validateManifest(parsed);
      setValidationResult(result);
    } catch {
      setValidationResult({
        valid: false,
        errors: ['Invalid JSON — please check your manifest syntax'],
      });
    }
  }, [manifestText, validateManifest]);

  const handleDeploy = useCallback(async () => {
    if (!appName.trim()) {
      setDeployError('App name is required');
      return;
    }

    setDeploying(true);
    setDeployError(null);
    try {
      const parsed = JSON.parse(manifestText);
      await createApp({
        name: appName.trim(),
        manifest: parsed,
      });
      setDeploySuccess(true);
      setManifestText('');
      setAppName('');
      setValidationResult(null);
    } catch (err) {
      setDeployError(
        err instanceof Error ? err.message : 'Deployment failed',
      );
    } finally {
      setDeploying(false);
    }
  }, [manifestText, appName, createApp]);

  const handleUseRecipe = useCallback((recipe: SandboxdRecipe) => {
    if (recipe.manifest) {
      setManifestText(JSON.stringify(recipe.manifest, null, 2));
      setAppName(recipe.name);
    }
  }, []);

  const isValid = validationResult?.valid ?? null;

  return (
    <Paper style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>
        Runtime Manifest Editor
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Write a custom sandbox.yaml manifest as JSON, validate it, and deploy.
        Choose a recipe template below to get started quickly.
      </Typography>

      {/* App name field */}
      <TextField
        fullWidth
        label="App Name"
        value={appName}
        onChange={(e) => setAppName(e.target.value)}
        margin="normal"
        helperText="The name for your deployed app"
      />

      {/* Manifest editor */}
      <Box mt={2}>
        <Typography variant="subtitle2" gutterBottom>
          Manifest (JSON)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={16}
          value={manifestText}
          onChange={(e) => setManifestText(e.target.value)}
          placeholder={`{
  "framework": "react",
  "resources": {
    "memory": "512mb",
    "cpu": "1"
  },
  "env": {
    "NODE_ENV": "production"
  }
}`}
          style={{ fontFamily: 'monospace' }}
        />
      </Box>

      {/* Action buttons */}
      <Box mt={2} display="flex">
        <Button
          variant="outlined"
          startIcon={<BuildIcon />}
          onClick={handleValidate}
          disabled={!manifestText.trim()}
          style={{ marginRight: 8 }}
        >
          Validate
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<BuildIcon />}
          onClick={handleDeploy}
          disabled={!manifestText.trim() || !appName.trim() || deploying}
        >
          {deploying ? 'Deploying…' : 'Deploy'}
        </Button>
      </Box>

      {/* Validation results */}
      {validationResult && (
        <Box mt={2}>
          {isValid ? (
            <Box
              display="flex"
              alignItems="flex-start"
              style={{
                padding: 12,
                backgroundColor: '#e8f5e9',
                borderRadius: 4,
                border: '1px solid #c8e6c9',
              }}
            >
              <CheckCircleIcon style={{ marginRight: 8, color: '#4caf50' }} />
              <Box>
                <Typography variant="body2">Manifest is valid</Typography>
                {validationResult.warnings &&
                  validationResult.warnings.length > 0 && (
                    <Box mt={1}>
                      {validationResult.warnings.map((w, i) => (
                        <Typography key={i} variant="caption">
                          <WarningIcon fontSize="small" /> {w}
                        </Typography>
                      ))}
                    </Box>
                  )}
              </Box>
            </Box>
          ) : (
            <Box
              display="flex"
              alignItems="flex-start"
              style={{
                padding: 12,
                backgroundColor: '#ffebee',
                borderRadius: 4,
                border: '1px solid #ffcdd2',
              }}
            >
              <WarningIcon style={{ marginRight: 8, color: '#f44336' }} />
              <Box>
                {validationResult.errors?.map((e, i) => (
                  <Typography key={i} variant="body2">{e}</Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Deploy status */}
      {deploySuccess && (
        <Box
          mt={2}
          display="flex"
          alignItems="center"
          style={{
            padding: 12,
            backgroundColor: '#e8f5e9',
            borderRadius: 4,
            border: '1px solid #c8e6c9',
          }}
        >
          <CheckCircleIcon style={{ marginRight: 8, color: '#4caf50' }} />
          <Typography variant="body2">
            App <strong>{appName}</strong> deployed successfully!
          </Typography>
        </Box>
      )}
      {deployError && (
        <Box
          mt={2}
          display="flex"
          alignItems="center"
          style={{
            padding: 12,
            backgroundColor: '#ffebee',
            borderRadius: 4,
            border: '1px solid #ffcdd2',
          }}
        >
          <WarningIcon style={{ marginRight: 8, color: '#f44336' }} />
          <Typography variant="body2">{deployError}</Typography>
        </Box>
      )}

      {/* Recipe templates */}
      {recipes && recipes.length > 0 && (
        <Box mt={4}>
          <Divider />
          <Typography variant="h6" style={{ marginTop: 16 }} gutterBottom>
            Starter Templates
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Click a recipe to load its manifest as a starting point.
          </Typography>
          <Grid container spacing={2}>
            {recipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CodeIcon
                        style={{ color: '#607d8b', marginRight: 8 }}
                      />
                      <Typography variant="h6" noWrap>
                        {recipe.name}
                      </Typography>
                    </Box>
                    {recipe.description && (
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        paragraph
                      >
                        {recipe.description}
                      </Typography>
                    )}
                    <Chip
                      label={recipe.framework}
                      size="small"
                      variant="outlined"
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => handleUseRecipe(recipe)}
                      disabled={!recipe.manifest}
                    >
                      Use Template
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Paper>
  );
};
