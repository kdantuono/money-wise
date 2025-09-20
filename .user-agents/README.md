# MoneyWise User-Accessible Agent System

## Overview

This directory provides direct user access to the MoneyWise enhanced multi-agent orchestration system. You can now interact directly with specialized AI agents that follow ultrathinking methodology, documentation-driven development, and comprehensive quality assurance.

## Quick Start

```bash
# List available agents
./agent-cli.sh agents list

# Create a backend development agent for authentication
./agent-cli.sh agents create backend-dev user-authentication

# Start ultrathinking process for an agent
./agent-cli.sh agents ultrathink backend-dev

# Request review agent validation
./agent-cli.sh agents review backend-dev
```

## Agent Capabilities

Each agent in the enhanced system provides:

- **Ultrathinking**: Critical analysis before action
- **Documentation-driven**: Always refers to project docs
- **Quality-first**: Incorporates KISS, SRP, TDD principles
- **Inter-agent collaboration**: Communicates with other agents
- **100% compliance**: Dedicated review validation

## Available Agents

- **devops**: DevOps Engineer - CI/CD, Infrastructure, Automation reasoning
- **reasoning-coordinator**: 🧠 Reasoning Coordinator - Inter-agent communication, Critical analysis
- **accessibility**: A11y Specialist - WCAG 2.1 AA compliance, User empathy
- **backend-dev**: Senior NestJS Developer - TDD, TypeORM, Security-first, Ultrathinking
- **performance**: Performance Engineer - Core Web Vitals, Optimization, Data analysis
- **documenter**: Technical Writer - API docs, Architecture, Clear communication
- **architect**: System Architect - Design patterns, Scalability, Strategic thinking
- **frontend-dev**: Senior React/Next.js Developer - Component-driven, A11y focused, Reasoning
- **reviewer**: Code Reviewer - Standards, Best practices, Quality enforcement
- **tester**: QA Engineer - Unit/Integration/E2E testing, Quality reasoning
- **security**: Security Auditor - OWASP, Vulnerability scanning, Threat analysis
- **mobile-dev**: React Native Specialist - Cross-platform, Performance, Analytical
- **review-agent**: 🔍 Dedicated Review Agent - 100% Compliance Validation, Quality Guardian
- **api-dev**: REST/GraphQL API Specialist - OpenAPI, Contract-first, Critical thinking

## Enhanced Features

1. **Branch Alignment**: Proper main → develop → feature flow
2. **Agent Reasoning**: Critical thinking and analysis
3. **Documentation-driven**: Always complies with docs/
4. **Quality Standards**: Clean code, patterns, testing
5. **Review Agent**: 100% compliance validation
6. **User Accessible**: Direct interaction capabilities

## Usage Examples

### Feature Development
```bash
# Start comprehensive feature development
./agent-cli.sh agents create architect system-design
./agent-cli.sh agents create backend-dev api-implementation
./agent-cli.sh agents create frontend-dev ui-components
./agent-cli.sh agents create tester quality-validation
./agent-cli.sh agents review all
```

### Quality Assurance
```bash
# Run complete quality validation
./agent-cli.sh agents quality
./agent-cli.sh agents review backend-dev
./agent-cli.sh agents docs testing-standards
```

For more information, see the main documentation in /docs/
