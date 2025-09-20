#!/bin/bash
# Workflow performance metrics for MoneyWise
set -e
START_TIME=$(date +%s)
# ...existing job logic...
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo "Workflow duration: $DURATION seconds" >> workflow-performance.log
