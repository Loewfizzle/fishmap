# Development Guide

This document explains the most common tasks when working on Fishmap locally.

## Running the Application

### Development Server (recommended for daily work)

\\\powershell
npm run dev
\\\

This starts Vite with hot module replacement. Open the URL shown in the terminal (usually \http://localhost:5173\).

### Production Preview

\\\powershell
npm run build
npm run preview
\\\

Builds the app and serves the production bundle locally.

## Common npm Scripts

| Command              | Description                                      |
|----------------------|--------------------------------------------------|
| \
pm run dev\        | Start development server                        |
| \
pm run build\      | Production build                                |
| \
pm run preview\    | Preview production build                        |
| \
pm run typecheck\  | Run TypeScript type checking                    |
| \
pm run lint\       | Run ESLint                                      |
| \
pm run format\     | Format code with Prettier                       |
| \
pm run etl-sample\ | Regenerate the sample dataset                   |
| \
pm run etl-validate\ | Validate the current sample data              |
| \
pm run full-verify\| Run typecheck + lint + build + data validation  |
| \
pm run clean\      | Remove all gitignored build artifacts           |
| \
pm run docker-etl\ | Build and run the ETL inside Docker             |

## Working with Data (ETL)

The project uses a Python-based ETL pipeline.

### Quick Data Refresh (Sample)

\\\powershell
npm run etl-sample
\\\

Or with Docker (more reproducible):

\\\powershell
npm run docker-etl
\\\

### Validate Data

\\\powershell
npm run etl-validate
\\\

See [docs/ETL-RUNBOOK.md](./ETL-RUNBOOK.md) for the full process of doing real data updates.

## Full Verification

To run the complete local check suite:

\\\powershell
npm run full-verify
\\\

This runs:
- TypeScript type checking
- Linting
- Production build
- Data validation

## Git Workflow

- The default branch is \main\.
- All historical development branches (\execute-plan/*\) have been cleaned up.
- Please create feature branches from \main\ for any new work.

## Useful Docker Commands

Rebuild the ETL image:

\\\powershell
docker build -f Dockerfile.etl -t fishmap-etl .
\\\

## Notes

- The current dataset is a curated sample (see \data/processed/DATA-VERIFICATION.md\).
- For full offline testing, use the "Download Grand Rapids Region" button in the app after running a production build.
