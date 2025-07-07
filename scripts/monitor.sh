#!/bin/bash

# J.A.R.V.I.S Monitoring Script
# Usage: ./scripts/monitor.sh

set -e

APP_NAME="jarvis-auth-system"
LOG_FILE="./logs/monitor.log"
ALERT_EMAIL="admin@your-domain.com"

# Create logs directory
mkdir -p ./logs

echo "🔍 Starting J.A.R.V.I.S monitoring..."

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message="$1"
    log_message "🚨 ALERT: $message"
    
    # Send email alert (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "J.A.R.V.I.S Alert" "$ALERT_EMAIL"
    fi
    
    # Send Slack notification (if configured)
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 J.A.R.V.I.S Alert: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Check if PM2 is running
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        send_alert "PM2 is not installed"
        return 1
    fi
    
    if ! pm2 list | grep -q "$APP_NAME"; then
        send_alert "Application $APP_NAME is not running"
        return 1
    fi
    
    local status=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .pm2_env.status")
    if [ "$status" != "online" ]; then
        send_alert "Application $APP_NAME is not online (status: $status)"
        return 1
    fi
    
    log_message "✅ PM2 status: OK"
    return 0
}

# Check application health
check_health() {
    local health_url="http://localhost:3000/api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null || echo "000")
    
    if [ "$response" != "200" ]; then
        send_alert "Health check failed (HTTP $response)"
        return 1
    fi
    
    log_message "✅ Health check: OK"
    return 0
}

# Check memory usage
check_memory() {
    local memory_usage=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .monit.memory")
    local memory_mb=$((memory_usage / 1024 / 1024))
    
    if [ "$memory_mb" -gt 500 ]; then
        send_alert "High memory usage: ${memory_mb}MB"
        return 1
    fi
    
    log_message "✅ Memory usage: ${memory_mb}MB"
    return 0
}

# Check CPU usage
check_cpu() {
    local cpu_usage=$(pm2 jlist | jq -r ".[] | select(.name == \"$APP_NAME\") | .monit.cpu")
    
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        send_alert "High CPU usage: ${cpu_usage}%"
        return 1
    fi
    
    log_message "✅ CPU usage: ${cpu_usage}%"
    return 0
}

# Check disk space
check_disk() {
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 80 ]; then
        send_alert "Low disk space: ${disk_usage}% used"
        return 1
    fi
    
    log_message "✅ Disk usage: ${disk_usage}%"
    return 0
}

# Check Google Sheets API
check_google_sheets() {
    local test_url="http://localhost:3000/api/sheets?sheetName=ชั้น4_พัน4"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$test_url" 2>/dev/null || echo "000")
    
    if [ "$response" != "200" ]; then
        send_alert "Google Sheets API check failed (HTTP $response)"
        return 1
    fi
    
    log_message "✅ Google Sheets API: OK"
    return 0
}

# Main monitoring loop
main() {
    log_message "🔍 Starting monitoring cycle..."
    
    local errors=0
    
    # Run all checks
    check_pm2 || ((errors++))
    check_health || ((errors++))
    check_memory || ((errors++))
    check_cpu || ((errors++))
    check_disk || ((errors++))
    check_google_sheets || ((errors++))
    
    if [ "$errors" -eq 0 ]; then
        log_message "✅ All systems operational"
    else
        log_message "⚠️  Found $errors issue(s)"
    fi
    
    # Clean up old logs (keep last 7 days)
    find ./logs -name "*.log" -mtime +7 -delete
    
    log_message "🔍 Monitoring cycle completed"
}

# Run monitoring
main

# Exit with error code if any issues found
if [ "$errors" -gt 0 ]; then
    exit 1
else
    exit 0
fi 