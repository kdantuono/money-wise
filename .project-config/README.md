# Project Configuration Directory

This directory contains project-level tracking and configuration files.

## Files

### `.epic-1.5-todos.json`
Epic task tracking for v1.5 development milestone. Contains structured todo items for the epic.

### `.prisma-migration-tracker.json`
Prisma database migration tracking and state management. Used for coordinating schema changes across environments.

## Purpose

These files are intentionally organized in `.project-config/` rather than the root directory to:
- Keep root directory clean and focused on source code
- Centralize project metadata and tracking information
- Make it clear these are project infrastructure files, not source code
- Enable easy discovery of all project-level configuration

## Guidelines

- Do not manually modify these files unless you understand the format
- Keep these files synchronized with actual project state
- Include these files in version control for team visibility
