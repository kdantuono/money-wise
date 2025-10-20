# ADR-001: Monorepo Structure with Turborepo

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Development Team
**Technical Story**: EPIC-1.5 Infrastructure & Quality

## Context

MoneyWise is a multi-platform personal finance application requiring:
- Backend API (NestJS)
- Web application (Next.js)
- Mobile application (React Native - future)
- Shared UI components and utilities
- Consistent dependency management
- Coordinated deployments

We need to decide on the repository structure that will best support our multi-platform architecture while maintaining developer productivity and code quality.

## Decision

We will use a **monorepo structure** managed by **Turborepo** with pnpm workspaces.

### Repository Structure

```
money-wise/
├── apps/
│   ├── backend/          # NestJS API server
│   ├── web/              # Next.js web application
│   └── mobile/           # React Native mobile app (future)
├── packages/
│   ├── ui/               # Shared React components
│   ├── config/           # Shared configuration (ESLint, TypeScript)
│   └── utils/            # Shared utilities
├── docs/                 # Documentation
├── .github/              # CI/CD workflows
└── turbo.json            # Turborepo configuration
```

### Key Technologies

- **Build System**: Turborepo (incremental builds, remote caching)
- **Package Manager**: pnpm (efficient disk usage, strict dependency resolution)
- **Workspace Protocol**: pnpm workspaces
- **Shared Packages**: Internal packages via `workspace:*` protocol

## Rationale

### Why Monorepo?

**✅ Advantages**:
1. **Code Sharing**: Direct import of shared types, components, and utilities
2. **Atomic Changes**: Single PR can update backend API + frontend consumer
3. **Consistent Tooling**: Unified ESLint, TypeScript, and testing configuration
4. **Simplified Refactoring**: IDE refactoring works across all packages
5. **Single CI/CD Pipeline**: Coordinated deployment of all applications

**❌ Alternatives Considered**:
- **Multi-repo** (rejected): Complex dependency management, difficult atomic changes
- **Git submodules** (rejected): Poor DX, manual syncing required

### Why Turborepo?

**✅ Advantages**:
1. **Incremental Builds**: Only rebuilds changed packages and dependents
2. **Remote Caching**: Share build artifacts across team and CI
3. **Parallel Execution**: Automatic task orchestration based on dependency graph
4. **Simple Configuration**: Minimal setup compared to alternatives

**❌ Alternatives Considered**:
- **Nx** (rejected): More complex, unnecessary features for our scale
- **Lerna** (rejected): Primarily for package publishing, less build optimization
- **Rush** (rejected): Overkill for small team, steeper learning curve

### Why pnpm?

**✅ Advantages**:
1. **Disk Efficiency**: Content-addressable storage saves ~50% disk space
2. **Strict Dependencies**: Prevents phantom dependencies (packages not in package.json)
3. **Fast Installs**: Symlink-based approach faster than npm/yarn
4. **Workspace Support**: First-class monorepo support

## Consequences

### Positive

- **Faster Development**: Shared code changes immediately available to consumers
- **Better Type Safety**: Shared TypeScript types ensure backend/frontend contract adherence
- **Simplified Dependency Updates**: Single `pnpm update` updates all workspaces
- **Improved CI Performance**: Turborepo caching reduces build times by ~70%
- **Easier Onboarding**: New developers clone one repo and run `pnpm install`

### Negative

- **Larger Repository Size**: Single repo contains all application code
- **Potential Build Complexity**: Circular dependencies must be carefully avoided
- **Learning Curve**: Team must understand Turborepo and pnpm concepts
- **Tooling Configuration**: Some IDE features require workspace-aware setup

### Mitigations

- **Repository Size**: Use `.gitignore` for node_modules, dist, build artifacts
- **Circular Dependencies**: Enforce unidirectional dependency graph (apps → packages)
- **Learning Curve**: Provide comprehensive documentation and pairing sessions
- **IDE Setup**: Maintain workspace-specific VS Code settings

## Implementation

### Initial Setup

```bash
# Initialize monorepo
pnpm init
pnpm add -D turbo

# Create workspace structure
mkdir -p apps/{backend,web} packages/{ui,config,utils}

# Configure pnpm workspace (pnpm-workspace.yaml)
packages:
  - 'apps/*'
  - 'packages/*'

# Configure Turborepo (turbo.json)
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

### Package Dependencies

```json
// apps/web/package.json
{
  "dependencies": {
    "@money-wise/ui": "workspace:*",
    "@money-wise/utils": "workspace:*"
  }
}
```

### Build Commands

```bash
# Build all apps and packages
pnpm turbo build

# Run tests across all workspaces
pnpm turbo test

# Lint entire monorepo
pnpm turbo lint

# Filter to specific workspace
pnpm turbo build --filter=web
```

## Monitoring

- **Build Time Metrics**: Track Turborepo cache hit rate (target: >80%)
- **Disk Usage**: Monitor pnpm store size (should be <2GB)
- **Developer Experience**: Survey team quarterly on monorepo pain points

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspace Guide](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)
- [ADR-002: Configuration Management](./ADR-002-configuration-management.md)

---

**Superseded By**: N/A
**Related ADRs**: ADR-002, ADR-003
