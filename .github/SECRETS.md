# GitHub Actions Secrets

Set these in your repo: Settings → Secrets and variables → Actions

## Required for CI/CD

| Secret | Description |
|--------|-------------|
| `STAGING_HOST` | IP or hostname of staging server |
| `STAGING_USER` | SSH username for staging server |
| `STAGING_SSH_KEY` | Private SSH key for staging server |
| `PROD_HOST` | IP or hostname of production server |
| `PROD_USER` | SSH username for production server |
| `PROD_SSH_KEY` | Private SSH key for production server |

## Auto-provided by GitHub

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Auto-injected — used for pushing to GHCR |

## How to generate SSH key for deployment

```bash
ssh-keygen -t ed25519 -C "devdna-deploy" -f devdna-deploy-key
# Add devdna-deploy-key.pub to ~/.ssh/authorized_keys on your server
# Add devdna-deploy-key (private) as PROD_SSH_KEY secret in GitHub
```
