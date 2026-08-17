import React, { useState, useMemo, useCallback } from 'react';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@material-ui/core';
import {
  Search as SearchIcon,
  Launch as DeployIcon,
  FilterList as FilterIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
} from '@material-ui/icons';
import {
  useSandboxdPresets,
  useSandboxdRecipes,
  SandboxdPreset,
} from './AppStoreApi';
import { DeployWizard } from './DeployDialog';

/**
 * Category colors for preset chips — consistent mapping.
 */
const CATEGORY_COLORS: Record<string, string> = {
  Web: '#1976d2',
  'Data Science': '#9c27b0',
  Backend: '#388e3c',
  DevOps: '#ff9800',
  Database: '#795548',
  AI: '#f44336',
  CMS: '#009688',
  Other: '#607d8b',
};

function getCategoryColor(category: string | undefined): string {
  if (!category) return CATEGORY_COLORS.Other;
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

/**
 * A card representing a single curated preset in the app store.
 */
interface PresetCardProps {
  preset: SandboxdPreset;
  onDeploy: (preset: SandboxdPreset) => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, onDeploy }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        {preset.icon && (
          <img
            src={preset.icon}
            alt={preset.name}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              marginRight: 8,
              objectFit: 'contain',
            }}
          />
        )}
        {!preset.icon && (
          <StorageIcon
            style={{ color: getCategoryColor(preset.category), marginRight: 8 }}
          />
        )}
        <Typography variant="h6" noWrap>
          {preset.name}
        </Typography>
      </Box>

      {preset.description && (
        <Typography variant="body2" color="textSecondary" paragraph>
          {preset.description}
        </Typography>
      )}

      <Box display="flex" flexWrap="wrap" mb={1}>
        {preset.category && (
          <Chip
            label={preset.category}
            size="small"
            style={{
              backgroundColor: getCategoryColor(preset.category),
              color: '#fff',
              marginRight: 4,
              marginBottom: 4,
            }}
          />
        )}
        {preset.framework && (
          <Chip
            label={preset.framework}
            size="small"
            variant="outlined"
            style={{ marginRight: 4, marginBottom: 4 }}
          />
        )}
      </Box>
    </CardContent>
    <CardActions>
      <Button
        size="small"
        color="primary"
        startIcon={<DeployIcon />}
        onClick={() => onDeploy(preset)}
        fullWidth
      >
        Deploy
      </Button>
    </CardActions>
  </Card>
);

/**
 * Main App Store view — browsable catalog of sandboxd curated apps with
 * search, category filtering, and one-click deploy via the wizard.
 */
export const AppStoreView: React.FC = () => {
  const [revalidateKey, setRevalidateKey] = useState(0);

  const { value: presets, loading: loadingPresets, error: errorPresets } = useSandboxdPresets(revalidateKey);
  const { value: recipes, loading: loadingRecipes, error: errorRecipes } = useSandboxdRecipes(revalidateKey);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [showRecipes, setShowRecipes] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Deploy wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preselectedPreset, setPreselectedPreset] = useState<SandboxdPreset | null>(null);

  // Derive distinct categories for the filter dropdown
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    presets?.forEach((p) => p.category && catSet.add(p.category));
    return Array.from(catSet).sort();
  }, [presets]);

  // Filter presets by search query and category
  const filteredPresets = useMemo(() => {
    if (!presets) return [];
    return presets.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.framework?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [presets, searchQuery, categoryFilter]);

  const handleDeployClick = useCallback((preset: SandboxdPreset) => {
    setPreselectedPreset(preset);
    setWizardOpen(true);
  }, []);

  const handleDeployFromHeader = useCallback(() => {
    setPreselectedPreset(null);
    setWizardOpen(true);
  }, []);

  const handleFilterChange = useCallback(
    (event: React.ChangeEvent<{ value: unknown }>) => {
      setCategoryFilter(String(event.target.value));
    },
    [],
  );

  const isReady = !loadingPresets && !loadingRecipes;
  const hasError = !!errorPresets || !!errorRecipes;

  if (!isReady) {
    return (
      <Paper style={{ padding: 16 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (hasError) {
    return (
      <Paper style={{ padding: 16 }}>
        <Typography variant="body2" color="error">
          Failed to load app store: {errorPresets?.message || errorRecipes?.message}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper style={{ padding: 16 }}>
      {/* Header row */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">App Store</Typography>
        <Box display="flex" alignItems="center">
          <Chip
            label={`${filteredPresets.length} apps`}
            size="small"
            variant="outlined"
            style={{ marginRight: 8 }}
          />
          <Chip
            label={`${recipes?.length ?? 0} recipes`}
            size="small"
            variant="outlined"
            style={{ marginRight: 8 }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFilterOpen((o) => !o)}
            style={{ marginRight: 8 }}
          >
            Filters
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => setRevalidateKey((k) => k + 1)}
            disabled={loadingPresets}
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<DeployIcon />}
            onClick={handleDeployFromHeader}
          >
            Deploy New
          </Button>
        </Box>
      </Box>

      {/* Search bar */}
      <TextField
        fullWidth
        placeholder="Search apps by name, description, or framework…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        margin="normal"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="disabled" />
            </InputAdornment>
          ),
        }}
      />

      {/* Filter controls */}
      {filterOpen && (
        <Box mt={1} mb={2} display="flex" alignItems="center">
          <FormControl size="small" variant="outlined" style={{ minWidth: 180, marginRight: 8 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              onChange={handleFilterChange}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip
            label="Recipes"
            onClick={() => setShowRecipes((s) => !s)}
            variant={showRecipes ? 'default' : 'outlined'}
            style={{ cursor: 'pointer', marginRight: 8 }}
          />

          {(searchQuery || categoryFilter) && (
            <Button
              size="small"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      )}

      {/* Preset grid */}
      <Grid container spacing={2} style={{ marginTop: 8 }}>
        {filteredPresets.map((preset) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={preset.id}>
            <PresetCard preset={preset} onDeploy={handleDeployClick} />
          </Grid>
        ))}
      </Grid>

      {filteredPresets.length === 0 && (
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
          No apps match your filters. Try broadening your search.
        </Typography>
      )}

      {/* Recipes section */}
      {showRecipes && recipes && recipes.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Runtime Recipes
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Framework-specific sandbox.yaml configurations for custom deployments.
          </Typography>
          <Grid container spacing={2}>
            {recipes.map((recipe) => (
              <Grid item xs={12} sm={6} md={4} key={recipe.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      <StorageIcon
                        style={{ color: '#607d8b', marginRight: 8 }}
                      />
                      <Typography variant="h6" noWrap>
                        {recipe.name}
                      </Typography>
                    </Box>
                    {recipe.description && (
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {recipe.description}
                      </Typography>
                    )}
                    <Chip
                      label={recipe.framework}
                      size="small"
                      variant="outlined"
                      style={{ marginRight: 4 }}
                    />
                    {recipe.manifest && (
                      <Chip
                        icon={<StorageIcon />}
                        label="Custom manifest"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Deploy wizard */}
      {presets && (
        <DeployWizard
          presets={presets}
          preselectedPreset={preselectedPreset}
          open={wizardOpen}
          onClose={() => {
            setWizardOpen(false);
            setPreselectedPreset(null);
          }}
          onDeployed={() => {
            setRevalidateKey((k) => k + 1);
          }}
        />
      )}
    </Paper>
  );
};
