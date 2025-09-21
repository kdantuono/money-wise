#!/usr/bin/env node

/**
 * MoneyWise CI Health Dashboard Server
 *
 * Real-time web dashboard for monitoring CI/CD health status
 * with live updates and interactive visualization.
 *
 * @author Claude Code
 * @version 1.0.0
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const CIHealthMonitor = require('./ci-health-monitor');
const WorkflowAnalyzer = require('./workflow-analyzer');

class HealthDashboardServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.healthMonitor = new CIHealthMonitor();
    this.workflowAnalyzer = new WorkflowAnalyzer();
    this.clients = new Set();

    this.setupRoutes();
    this.setupSocketHandlers();
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Serve static dashboard files
    this.app.use(express.static(path.join(__dirname, '../dashboard')));
    this.app.use(express.json());

    // API endpoints
    this.app.get('/api/health', this.handleHealthStatus.bind(this));
    this.app.get('/api/workflows', this.handleWorkflowAnalysis.bind(this));
    this.app.get('/api/history', this.handleHealthHistory.bind(this));
    this.app.get('/api/alerts', this.handleAlerts.bind(this));
    this.app.post('/api/manual-check', this.handleManualHealthCheck.bind(this));

    // Dashboard route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../dashboard/index.html'));
    });
  }

  /**
   * Setup Socket.IO handlers for real-time updates
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 Client connected: ${socket.id}`);
      this.clients.add(socket);

      // Send initial data
      this.sendInitialData(socket);

      socket.on('disconnect', () => {
        console.log(`📱 Client disconnected: ${socket.id}`);
        this.clients.delete(socket);
      });

      socket.on('request-manual-check', async () => {
        console.log('🔄 Manual health check requested via socket');
        await this.triggerHealthCheck();
      });
    });
  }

  /**
   * Send initial dashboard data to newly connected client
   */
  async sendInitialData(socket) {
    try {
      const [health, workflows, history, alerts] = await Promise.all([
        this.getCurrentHealth(),
        this.getWorkflowAnalysis(),
        this.getHealthHistory(),
        this.getAlerts()
      ]);

      socket.emit('initial-data', {
        health,
        workflows,
        history,
        alerts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send initial data:', error.message);
      socket.emit('error', { message: 'Failed to load initial data' });
    }
  }

  /**
   * API: Get current health status
   */
  async handleHealthStatus(req, res) {
    try {
      const health = await this.getCurrentHealth();
      res.json(health);
    } catch (error) {
      console.error('Failed to get health status:', error.message);
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }

  /**
   * API: Get workflow analysis
   */
  async handleWorkflowAnalysis(req, res) {
    try {
      const analysis = await this.getWorkflowAnalysis();
      res.json(analysis);
    } catch (error) {
      console.error('Failed to get workflow analysis:', error.message);
      res.status(500).json({ error: 'Failed to get workflow analysis' });
    }
  }

  /**
   * API: Get health history
   */
  async handleHealthHistory(req, res) {
    try {
      const history = await this.getHealthHistory();
      res.json(history);
    } catch (error) {
      console.error('Failed to get health history:', error.message);
      res.status(500).json({ error: 'Failed to get health history' });
    }
  }

  /**
   * API: Get alerts
   */
  async handleAlerts(req, res) {
    try {
      const alerts = await this.getAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Failed to get alerts:', error.message);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }

  /**
   * API: Trigger manual health check
   */
  async handleManualHealthCheck(req, res) {
    try {
      console.log('🔄 Manual health check triggered via API');
      await this.triggerHealthCheck();
      res.json({ status: 'triggered', message: 'Health check initiated' });
    } catch (error) {
      console.error('Failed to trigger health check:', error.message);
      res.status(500).json({ error: 'Failed to trigger health check' });
    }
  }

  /**
   * Get current health status
   */
  async getCurrentHealth() {
    return this.healthMonitor.getCurrentHealth();
  }

  /**
   * Get workflow analysis (cached or fresh)
   */
  async getWorkflowAnalysis() {
    try {
      const analysisFile = path.join(__dirname, '../workflow-analysis.json');
      const data = await fs.readFile(analysisFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If no cached analysis, run fresh analysis
      console.log('📊 Running fresh workflow analysis...');
      return await this.workflowAnalyzer.analyzeAllWorkflows();
    }
  }

  /**
   * Get health history data
   */
  async getHealthHistory() {
    try {
      const historyFile = path.join(__dirname, '../monitoring-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      const parsed = JSON.parse(data);

      // Return last 50 records for dashboard
      return {
        records: parsed.healthHistory?.slice(-50) || [],
        lastUpdated: parsed.lastUpdated
      };
    } catch (error) {
      return { records: [], lastUpdated: null };
    }
  }

  /**
   * Get recent alerts
   */
  async getAlerts() {
    try {
      const historyFile = path.join(__dirname, '../monitoring-history.json');
      const data = await fs.readFile(historyFile, 'utf8');
      const parsed = JSON.parse(data);

      // Return last 20 alerts
      return parsed.alerts?.slice(-20) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Trigger health check and broadcast updates
   */
  async triggerHealthCheck() {
    try {
      await this.healthMonitor.runHealthCheck();

      // Broadcast updated data to all clients
      const [health, history, alerts] = await Promise.all([
        this.getCurrentHealth(),
        this.getHealthHistory(),
        this.getAlerts()
      ]);

      this.broadcastUpdate({
        type: 'health-update',
        data: { health, history, alerts },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Health check failed:', error.message);

      this.broadcastUpdate({
        type: 'error',
        data: { message: 'Health check failed', error: error.message },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast update to all connected clients
   */
  broadcastUpdate(update) {
    this.io.emit('update', update);
    console.log(`📡 Broadcasted ${update.type} to ${this.clients.size} clients`);
  }

  /**
   * Start the dashboard server
   */
  async start() {
    try {
      // Initialize health monitor
      await this.healthMonitor.validateConfiguration();
      await this.healthMonitor.loadHistoricalData();

      // Create dashboard directory if it doesn't exist
      await this.ensureDashboardFiles();

      // Start the server
      this.server.listen(this.port, () => {
        console.log('🚀 CI Health Dashboard Server started');
        console.log(`📊 Dashboard URL: http://localhost:${this.port}`);
        console.log(`🔌 WebSocket enabled for real-time updates`);
      });

      // Set up periodic health checks
      this.setupPeriodicChecks();

    } catch (error) {
      console.error('❌ Failed to start dashboard server:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup periodic health checks and broadcasts
   */
  setupPeriodicChecks() {
    // Health check every 2 minutes
    setInterval(async () => {
      if (this.clients.size > 0) {
        await this.triggerHealthCheck();
      }
    }, 120000);

    // Workflow analysis every 15 minutes
    setInterval(async () => {
      if (this.clients.size > 0) {
        console.log('🔄 Running periodic workflow analysis...');
        try {
          const analysis = await this.workflowAnalyzer.analyzeAllWorkflows();

          this.broadcastUpdate({
            type: 'workflow-update',
            data: analysis,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Periodic workflow analysis failed:', error.message);
        }
      }
    }, 900000);
  }

  /**
   * Ensure dashboard HTML files exist
   */
  async ensureDashboardFiles() {
    const dashboardDir = path.join(__dirname, '../dashboard');

    try {
      await fs.access(dashboardDir);
    } catch {
      await fs.mkdir(dashboardDir, { recursive: true });
    }

    // Create basic index.html if it doesn't exist
    const indexPath = path.join(dashboardDir, 'index.html');
    try {
      await fs.access(indexPath);
    } catch {
      await this.createBasicDashboard(indexPath);
    }
  }

  /**
   * Create basic dashboard HTML
   */
  async createBasicDashboard(indexPath) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoneyWise CI Health Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .alert { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .alert-critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 MoneyWise CI Health Dashboard</h1>

        <div class="card">
            <h2>📊 Current Status</h2>
            <div id="current-status">Loading...</div>
            <button onclick="triggerManualCheck()">🔄 Manual Check</button>
        </div>

        <div class="card">
            <h2>📈 Health Metrics</h2>
            <div id="health-metrics">Loading...</div>
        </div>

        <div class="card">
            <h2>🚨 Recent Alerts</h2>
            <div id="alerts">Loading...</div>
        </div>

        <div class="card">
            <h2>⚙️ Workflows</h2>
            <div id="workflows">Loading...</div>
        </div>
    </div>

    <script>
        const socket = io();

        socket.on('initial-data', (data) => {
            updateDashboard(data);
        });

        socket.on('update', (update) => {
            if (update.type === 'health-update') {
                updateHealthData(update.data);
            } else if (update.type === 'workflow-update') {
                updateWorkflowData(update.data);
            }
        });

        function updateDashboard(data) {
            updateHealthData(data);
            updateWorkflowData(data.workflows);
        }

        function updateHealthData(data) {
            const status = data.health?.status || 'unknown';
            const statusClass = 'status-' + status;

            document.getElementById('current-status').innerHTML =
                '<span class="' + statusClass + '">● ' + status.toUpperCase() + '</span>' +
                '<div class="timestamp">Last updated: ' + new Date().toLocaleString() + '</div>';

            if (data.health?.metrics) {
                const metrics = data.health.metrics;
                document.getElementById('health-metrics').innerHTML =
                    '<div class="metric">Success Rate: ' + (metrics.successRate * 100).toFixed(1) + '%</div>' +
                    '<div class="metric">Avg Duration: ' + Math.round(metrics.averageDuration) + 's</div>' +
                    '<div class="metric">Active Runs: ' + metrics.activeRuns + '</div>' +
                    '<div class="metric">Recent Runs: ' + metrics.recentRuns.length + '</div>';
            }

            if (data.alerts) {
                const alertsHtml = data.alerts.slice(-5).map(alert =>
                    '<div class="alert alert-' + alert.type + '">' +
                    '<strong>' + alert.type.toUpperCase() + ':</strong> ' + alert.message +
                    '<div class="timestamp">' + new Date(alert.timestamp).toLocaleString() + '</div>' +
                    '</div>'
                ).join('');

                document.getElementById('alerts').innerHTML = alertsHtml || 'No recent alerts';
            }
        }

        function updateWorkflowData(workflows) {
            if (!workflows || !workflows.workflows) return;

            const workflowsHtml = workflows.workflows.map(workflow => {
                const statusIcon = workflow.health.status === 'healthy' ? '✅' :
                                 workflow.health.status === 'warning' ? '⚠️' : '❌';

                return '<div class="card">' +
                       '<h4>' + statusIcon + ' ' + workflow.name + '</h4>' +
                       '<div class="metric">Success: ' + (workflow.metrics.successRate * 100).toFixed(1) + '%</div>' +
                       '<div class="metric">Avg Duration: ' + Math.round(workflow.metrics.averageDuration) + 's</div>' +
                       '<div class="metric">Recent Failures: ' + workflow.metrics.recentFailures + '</div>' +
                       '</div>';
            }).join('');

            document.getElementById('workflows').innerHTML = workflowsHtml;
        }

        function triggerManualCheck() {
            socket.emit('request-manual-check');
        }
    </script>
</body>
</html>`;

    await fs.writeFile(indexPath, html);
    console.log('📝 Created basic dashboard HTML');
  }

  /**
   * Stop the dashboard server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Dashboard server stopped');
    }
  }
}

// CLI interface
if (require.main === module) {
  const port = process.env.PORT || 3001;
  const dashboard = new HealthDashboardServer(port);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    dashboard.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    dashboard.stop();
    process.exit(0);
  });

  // Start the dashboard
  dashboard.start().catch(error => {
    console.error('❌ Failed to start dashboard:', error.message);
    process.exit(1);
  });
}

module.exports = HealthDashboardServer;