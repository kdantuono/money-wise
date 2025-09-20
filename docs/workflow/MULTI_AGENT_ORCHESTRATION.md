# 🤖 MoneyWise Multi-Agent Orchestration System

## Overview

The MoneyWise Multi-Agent Orchestration System is a comprehensive tmux-based framework designed to coordinate multiple
AI agents working simultaneously on different aspects of the MoneyWise personal finance application. This system enables
efficient parallel development across feature clusters while maintaining code quality and coordination.

## Architecture

### 🧠 Agent Clusters

The system organizes agents into specialized clusters based on feature domains:

#### 1. **AI Intelligence Cluster** (`ai-intelligence`)

- **Architect Agent**: System design and architectural decisions
- **Backend Agent**: NestJS API, ML categorization, data models
- **Frontend Agent**: Next.js components, AI feature interfaces
- **Security Agent**: Authentication, authorization, data protection

#### 2. **Notification Engine Cluster** (`notification-engine`)

- **Backend Agent**: Notification API, real-time messaging
- **Frontend Agent**: Toast notifications, alert components
- **Mobile Agent**: Push notifications, React Native alerts
- **Tester Agent**: Notification testing, cross-platform validation

#### 3. **Event Streaming Cluster** (`event-streaming`)

- **Core Agent**: WebSocket servers, event processing
- **Alt-Backend Agent**: Alternative streaming implementations
- **Performance Agent**: Load testing, optimization
- **Tester Agent**: Streaming functionality validation

### 🔗 Communication System

- **Inter-agent messaging**: Coordinated communication between agents
- **Cluster broadcasting**: Cluster-wide announcements and updates
- **Quality gate integration**: Automated quality validation notifications
- **Alert system**: Critical issue escalation and response

### 📊 Monitoring Dashboard

- **Real-time status**: Live cluster and agent health monitoring
- **Performance metrics**: System resource usage and performance
- **Activity logs**: Communication history and agent activity
- **Health reports**: Comprehensive system status reports

## Quick Start

### Prerequisites

```bash
# Install tmux if not already installed
sudo apt-get update && sudo apt-get install tmux

# Ensure all dependencies are installed
cd /home/nemesi/dev/money-wise
npm install
```

### 1. Initialize the System

```bash
# First-time setup
./scripts/orchestration-integration.sh init
```

### 2. Start Coordinated Development

```bash
# Start working on a specific feature
./scripts/orchestration-integration.sh start financial-goals

# Or start general development
./scripts/orchestration-integration.sh start
```

### 3. Access the Orchestrator

```bash
# Attach to the main orchestration session
tmux attach -t moneywise-orchestrator
```

### 4. Monitor System Status

```bash
# Check overall system status
./scripts/orchestration-integration.sh status

# Open monitoring dashboard
./scripts/orchestration-integration.sh monitor
```

## Core Scripts

### 🎛️ Main Orchestrator (`tmux-agent-orchestrator.sh`)

Master control script for managing all agent clusters.

```bash
# Start the orchestrator
./scripts/tmux-agent-orchestrator.sh start

# Start specific cluster
./scripts/tmux-agent-orchestrator.sh start-cluster ai-intelligence

# Stop everything
./scripts/tmux-agent-orchestrator.sh stop

# Show status
./scripts/tmux-agent-orchestrator.sh status
```

### 💬 Communication System (`agent-communication.sh`)

Handles all inter-agent and inter-cluster communication.

```bash
# Send message to specific agent
./scripts/agent-communication.sh send-agent architect INFO "System design review completed"

# Broadcast to all agents
./scripts/agent-communication.sh broadcast SUCCESS "All quality gates passed"

# Send quality gate results
./scripts/agent-communication.sh quality ai-backend ml-categorization PASS

# Coordinate deployment
./scripts/agent-communication.sh deploy financial-goals ai-backend ai-frontend notif-backend

# Send alerts
./scripts/agent-communication.sh alert CRITICAL stream-core "Memory usage at 95%"
```

### 📊 Monitoring Dashboard (`agent-monitoring.sh`)

Provides comprehensive system monitoring and health checks.

```bash
# Show cluster status
./scripts/agent-monitoring.sh status

# Show detailed agent status
./scripts/agent-monitoring.sh agents

# Show system metrics
./scripts/agent-monitoring.sh metrics

# Create monitoring dashboard
./scripts/agent-monitoring.sh dashboard

# Generate health report
./scripts/agent-monitoring.sh health-report
```

### 🔗 Integration Controller (`orchestration-integration.sh`)

Unified interface that integrates all components with existing workflows.

```bash
# Initialize complete system
./scripts/orchestration-integration.sh init

# Start coordinated workflow
./scripts/orchestration-integration.sh start feature-name

# Run quality gates
./scripts/orchestration-integration.sh quality

# Deploy to environment
./scripts/orchestration-integration.sh deploy development

# Run coordinated testing
./scripts/orchestration-integration.sh test backend

# Sync all agents
./scripts/orchestration-integration.sh sync main
```

## Workflow Examples

### 🚀 Feature Development Workflow

```bash
# 1. Start feature development
./scripts/orchestration-integration.sh start user-authentication

# 2. Access orchestrator to coordinate agents
tmux attach -t moneywise-orchestrator

# 3. Monitor progress
./scripts/orchestration-integration.sh monitor

# 4. Run quality gates when ready
./scripts/orchestration-integration.sh quality

# 5. Deploy to development
./scripts/orchestration-integration.sh deploy development

# 6. Run tests
./scripts/orchestration-integration.sh test all
```

### 🔄 Sync and Quality Workflow

```bash
# 1. Sync all agents with latest main
./scripts/orchestration-integration.sh sync main

# 2. Run comprehensive testing
./scripts/orchestration-integration.sh test all

# 3. Validate quality gates
./scripts/orchestration-integration.sh quality

# 4. Check system status
./scripts/orchestration-integration.sh status
```

### 🚨 Emergency Response Workflow

```bash
# 1. Check system status immediately
./scripts/agent-monitoring.sh full

# 2. Send critical alert
./scripts/agent-communication.sh alert CRITICAL system "Production issue detected"

# 3. Coordinate emergency response
./scripts/agent-communication.sh broadcast ALERT "Emergency response initiated"

# 4. Generate health report
./scripts/agent-monitoring.sh health-report
```

## Tmux Navigation

### Session Structure

```
moneywise-orchestrator/          # Main orchestrator session
├── control                      # Master control window
├── overview                     # System overview
├── communication               # Agent communication hub
├── monitor-dashboard           # Real-time monitoring
└── logs                        # System logs

moneywise-ai-intelligence/      # AI Intelligence cluster
├── architect                   # System architect agent
├── backend                     # AI/ML backend agent
├── frontend                    # AI frontend agent
└── security                    # Security specialist agent

moneywise-notification-engine/  # Notification cluster
├── backend                     # Notification backend
├── frontend                    # Notification frontend
├── mobile                      # Mobile notifications
└── tester                      # Notification testing

moneywise-event-streaming/      # Event streaming cluster
├── core                        # Core streaming agent
├── alt-backend                 # Alternative implementation
├── performance                 # Performance optimization
└── tester                      # Streaming testing
```

### Navigation Commands

```bash
# List all sessions
tmux list-sessions

# Attach to specific session
tmux attach -t moneywise-orchestrator
tmux attach -t moneywise-ai-intelligence

# Switch between windows within session
Ctrl+b + 0-9    # Switch to window number
Ctrl+b + n      # Next window
Ctrl+b + p      # Previous window

# Switch between panes within window
Ctrl+b + arrow keys    # Navigate panes
Ctrl+b + z            # Zoom/unzoom pane
```

## Integration with Existing Workflows

### CI/CD Integration

The orchestration system seamlessly integrates with MoneyWise's existing CI/CD pipeline:

- **Quality Gates**: Automated validation using existing `npm run quality:gates`
- **Testing Integration**: Coordinates with `npm run test:backend`, `npm run test:web`, `npm run test:e2e`
- **Docker Orchestration**: Works with existing `docker-compose.dev.yml`
- **Branch Management**: Coordinates with git workflows and branch strategies

### Development Environment

```bash
# Standard MoneyWise development
npm run dev                    # Traditional approach

# Multi-agent orchestrated development
./scripts/orchestration-integration.sh start    # Orchestrated approach
```

### Quality Validation

```bash
# Manual quality gates
npm run quality:kiss
npm run quality:srp
npm run quality:tdd
npm run quality:gates

# Orchestrated quality validation
./scripts/orchestration-integration.sh quality
```

## Communication Patterns

### Message Types

- **INFO** ℹ️: Informational messages
- **SUCCESS** ✅: Successful operations
- **WARNING** ⚠️: Warning conditions
- **ERROR** ❌: Error conditions
- **TASK** 📋: Task assignments
- **SYNC** 🔄: Synchronization requests
- **DEPLOY** 🚀: Deployment coordination
- **TEST** 🧪: Testing activities
- **QUALITY** 🏆: Quality gate results
- **ALERT** 🚨: Critical alerts

### Communication Channels

- **Global**: System-wide communications
- **Cluster-specific**: Communications within agent clusters
- **Agent-specific**: Direct agent communications
- **Quality**: Quality gate results and validation
- **Alerts**: Critical system alerts

## Monitoring and Health Checks

### Health Monitoring

- **Cluster Status**: Active/inactive cluster monitoring
- **Agent Health**: Individual agent responsiveness
- **System Metrics**: CPU, memory, disk usage
- **Service Health**: Docker services, database connectivity
- **Git Status**: Repository status and synchronization

### Performance Metrics

- **Resource Usage**: Real-time system resource monitoring
- **Load Average**: System load monitoring
- **Service Response**: API and service health checks
- **Communication Activity**: Agent interaction monitoring

## Troubleshooting

### Common Issues

1. **Tmux sessions not starting**

   ```bash
   # Check tmux installation
   tmux -V

   # Kill existing sessions if needed
   tmux kill-server

   # Restart orchestration
   ./scripts/orchestration-integration.sh init
   ./scripts/orchestration-integration.sh start
   ```

2. **Agents not responding**

   ```bash
   # Check agent status
   ./scripts/agent-monitoring.sh agents

   # Restart specific cluster
   ./scripts/tmux-agent-orchestrator.sh restart-cluster ai-intelligence
   ```

3. **Communication failures**

   ```bash
   # Check communication logs
   ./scripts/agent-communication.sh logs global

   # Reinitialize communication
   ./scripts/agent-communication.sh init
   ```

### Debugging Commands

```bash
# Complete system status
./scripts/agent-monitoring.sh full

# View communication logs
./scripts/agent-communication.sh logs global 50

# Generate health report
./scripts/agent-monitoring.sh health-report

# Check prerequisites
./scripts/orchestration-integration.sh init
```

## Best Practices

### Development Workflow

1. **Always start with system initialization**

   ```bash
   ./scripts/orchestration-integration.sh init
   ```

2. **Use feature-specific workflows**

   ```bash
   ./scripts/orchestration-integration.sh start feature-name
   ```

3. **Monitor system health regularly**

   ```bash
   ./scripts/orchestration-integration.sh status
   ```

4. **Run quality gates before deployment**

   ```bash
   ./scripts/orchestration-integration.sh quality
   ```

### Agent Coordination

1. **Use appropriate communication channels**
   - Direct agent messages for specific tasks
   - Cluster broadcasts for cluster-wide updates
   - Global broadcasts for system-wide notifications

2. **Coordinate deployments properly**

   ```bash
   ./scripts/agent-communication.sh deploy feature-name agent1 agent2 agent3
   ```

3. **Handle alerts appropriately**
   - Use CRITICAL for system-threatening issues
   - Use HIGH for important but non-critical issues
   - Use WARNING for general attention needed

### Quality Assurance

1. **Integrate quality gates into workflow**
2. **Use coordinated testing for comprehensive validation**
3. **Monitor agent communications for quality results**
4. **Generate regular health reports**

## Advanced Configuration

### Custom Agent Roles

You can extend the system by adding custom agent roles:

1. **Edit cluster scripts** to add new panes
2. **Update communication mappings** in `agent-communication.sh`
3. **Add monitoring for new agents** in `agent-monitoring.sh`

### Environment-Specific Configuration

The system supports different environments:

- **Development**: Full agent coordination with monitoring
- **Staging**: Reduced agent set for staging validation
- **Production**: Monitoring and alert-focused configuration

### Performance Tuning

- **Adjust tmux configuration** for optimal performance
- **Configure monitoring intervals** based on system capacity
- **Optimize communication logging** for high-activity periods

## Conclusion

The MoneyWise Multi-Agent Orchestration System provides a powerful framework for coordinated development across multiple
AI agents. By leveraging tmux sessions, structured communication, and comprehensive monitoring, it enables efficient
parallel development while maintaining code quality and system reliability.

For additional support or questions, refer to the individual script help commands:

```bash
./scripts/tmux-agent-orchestrator.sh help
./scripts/agent-communication.sh help
./scripts/agent-monitoring.sh help
./scripts/orchestration-integration.sh help
```
