# CI Pipeline

The sandboxd Backstage plugin uses GitHub Actions for continuous integration and delivery.

## Setup

The CI pipeline requires the following repository secrets:

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm publish token for publishing the plugin packages |

## Pipeline Stages

### Build and Test (on every push and PR)

- **Matrix**: Node.js 20.x and 22.x
- **Steps**:
  1. Checkout the repository
  2. Setup Node.js with caching
  3. Install dependencies (`npm ci`)
  4. Build all packages (`npx backstage-cli package build --all`)
  5. Run frontend tests (`cd packages/frontend && npx backstage-cli package test`)
  6. Run backend tests (`cd packages/backend && npx backstage-cli package test`)
  7. Run lint (`npx backstage-cli package lint --all`)

### Publish (on push to main only)

- **Trigger**: `push` to `refs/heads/main`
- **Condition**: Only runs after the Build and Test stage passes
- **Steps**:
  1. Checkout the repository
  2. Setup Node.js 20.x
  3. Install dependencies
  4. Build all packages
  5. Publish frontend package (`npm publish --access public`)
  6. Publish backend package (`npm publish --access public`)

## Local Development

To run the same checks locally:

```bash
# Build all packages
npx backstage-cli package build --all

# Run frontend tests
cd packages/frontend && npx backstage-cli package test --watchAll=false

# Run backend tests
cd packages/backend && npx backstage-cli package test --watchAll=false

# Run lint
npx backstage-cli package lint --all
```

## Adding New CI Jobs

To add a new job, add it to the `jobs` section in `.github/workflows/ci.yml`. Use the `needs` field to depend on the `build-and-test` job.

## Publishing to a Private Registry

If you need to publish to a private registry instead of npm, update the publish job:

```yaml
- name: Publish frontend package
  run: |
    cd packages/frontend
    npm publish --registry https://your-private-registry.example.com/
  env:
    NODE_AUTH_TOKEN: ${{ secrets.REGISTRY_TOKEN }}
```
