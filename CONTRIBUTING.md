# Contributing

Quick start:

```bash
git clone https://github.com/Nardjo/stashbox.git
cd stashbox
pnpm install
pnpm dev
```

Requires Node 22+ and pnpm 10+. The repo is a pnpm + Turborepo monorepo: apps live under `apps/*`, shared packages under `packages/*`.

Common tasks:

```bash
pnpm lint        # ESLint across the workspace
pnpm typecheck   # tsc --noEmit across the workspace
pnpm test        # run all tests
pnpm build       # build all apps and packages
pnpm format      # prettier --write
```
