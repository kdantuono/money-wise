#!/bin/bash
# Enhanced error reporting for MoneyWise (disabled by default)
set -e
if [ "$ENABLE_ERROR_REPORTING" = "true" ]; then
  # Example: send error to Slack/email (integration required)
  echo "Sending error report to Slack/email..."
  # curl -X POST -H 'Content-type: application/json' --data '{"text":"Workflow failed!"}' $SLACK_WEBHOOK_URL
else
  echo "Error reporting is disabled."
fi
