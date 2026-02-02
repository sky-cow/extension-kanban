# Deployment Guide - Collaborative Task Board

This guide walks you through deploying the complete real-time collaborative task board system on AWS.

## Prerequisites

Before you begin, ensure you have:

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js 18+ and npm installed
- Serverless Framework CLI installed: `npm install -g serverless`
- Chrome browser for testing

## Architecture Overview

```
Users → Chrome Extension → API Gateway (REST + WebSocket) → Lambda → DynamoDB
                    ↓
               AWS Cognito (Authentication)
```

## Step 1: Set Up AWS Cognito (User Authentication)

### 1.1 Create User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name collaborative-task-board-users \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email \
  --schema Name=email,Required=true Name=organizationId,AttributeDataType=String,Mutable=true
```

Note the `UserPoolId` from the response (e.g., `us-east-1_XXXXXXXXX`).

### 1.2 Create App Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name task-board-extension \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --read-attributes email username \
  --write-attributes email
```

Note the `ClientId` from the response.

### 1.3 Create Cognito Domain (for hosted UI - optional)

```bash
aws cognito-idp create-user-pool-domain \
  --domain your-unique-domain-name \
  --user-pool-id us-east-1_XXXXXXXXX
```

### 1.4 Create Test User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@company.com \
  --user-attributes Name=email,Value=testuser@company.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

## Step 2: Deploy Backend to AWS

### 2.1 Set Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cat > .env << EOF
NODE_ENV=development
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
LOG_LEVEL=info
CORS_ORIGIN=chrome-extension://your-extension-id
EOF
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Deploy to AWS (Dev Environment)

```bash
serverless deploy --stage dev --region us-east-1
```

This will:
- Create Lambda functions
- Set up API Gateway (REST + WebSocket)
- Create DynamoDB tables
- Configure IAM roles
- Set up CloudWatch logging

**Important**: Note the endpoints from the deployment output:
```
endpoints:
  ANY - https://abc123.execute-api.us-east-1.amazonaws.com/dev/{proxy+}
  wss://xyz789.execute-api.us-east-1.amazonaws.com/dev
```

### 2.4 Verify Deployment

Test the health endpoint:
```bash
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-02T12:00:00.000Z"
}
```

## Step 3: Configure Chrome Extension

### 3.1 Update Configuration

Edit `extension/src/config.js` with your AWS endpoints:

```javascript
const CONFIG = {
  API_BASE_URL: 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/api',
  WS_URL: 'wss://YOUR_WS_ID.execute-api.us-east-1.amazonaws.com/dev',
  COGNITO_USER_POOL_ID: 'us-east-1_XXXXXXXXX',
  COGNITO_CLIENT_ID: 'XXXXXXXXXXXXXXXXXXXXXXXXXX',
  COGNITO_REGION: 'us-east-1',
  ORGANIZATION_ID: 'generate-a-uuid-for-your-org',
};
```

### 3.2 Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Note the extension ID (e.g., `abcdefghijklmnopqrstuvwxyz`)

### 3.3 Update CORS in Backend

Update the CORS_ORIGIN in your backend `.env`:

```
CORS_ORIGIN=chrome-extension://YOUR_EXTENSION_ID
```

Redeploy:
```bash
serverless deploy --stage dev
```

## Step 4: Test the System

### 4.1 Test Authentication

1. Click the extension icon
2. Log in with your Cognito user credentials
3. You should see the task board interface

### 4.2 Test Real-Time Collaboration

1. Open the extension in two different Chrome windows/profiles
2. Log in with the same or different users
3. Create a board in one window
4. Add a task in one window
5. Verify it appears immediately in the other window

### 4.3 Monitor Logs

View Lambda logs:
```bash
serverless logs -f api --tail --stage dev
```

View CloudWatch logs in AWS Console:
- Go to CloudWatch → Log groups
- Find `/aws/lambda/collaborative-task-board-dev-api`
- Check for errors or issues

## Step 5: Production Deployment

### 5.1 Create Production Environment Variables

```bash
cd backend
cat > .env.production << EOF
NODE_ENV=production
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_PROD_POOL_ID
COGNITO_CLIENT_ID=PROD_CLIENT_ID
LOG_LEVEL=warn
CORS_ORIGIN=chrome-extension://PROD_EXTENSION_ID
EOF
```

### 5.2 Deploy to Production

```bash
serverless deploy --stage prod --region us-east-1
```

### 5.3 Enable Monitoring

Set up CloudWatch alarms for:
- Lambda errors
- API Gateway 4xx/5xx errors
- DynamoDB throttling
- High latency

## Security Hardening

### Enable WAF on API Gateway

```bash
aws wafv2 create-web-acl \
  --name task-board-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

### Enable DynamoDB Point-in-Time Recovery

Already enabled in serverless.yml, but verify:
```bash
aws dynamodb describe-continuous-backups \
  --table-name collaborative-task-board-prod-boards
```

### Rotate Secrets

- Rotate Cognito app client secrets regularly
- Update Lambda environment variables
- Redeploy application

## Cost Optimization

### Enable DynamoDB Auto Scaling

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/collaborative-task-board-prod-boards \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 1 \
  --max-capacity 10
```

### Set Lambda Reserved Concurrency

Limit concurrent executions to control costs:
```bash
aws lambda put-function-concurrency \
  --function-name collaborative-task-board-prod-api \
  --reserved-concurrent-executions 10
```

## Monitoring & Alerting

### Create CloudWatch Dashboard

```bash
aws cloudwatch put-dashboard \
  --dashboard-name collaborative-task-board \
  --dashboard-body file://dashboard.json
```

### Create SNS Topic for Alerts

```bash
aws sns create-topic --name task-board-alerts
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:task-board-alerts \
  --protocol email \
  --notification-endpoint your-email@company.com
```

## Troubleshooting

### Issue: WebSocket not connecting

**Check:**
1. WebSocket URL is correct in config.js
2. Token is being sent in query string
3. Cognito JWT is valid
4. Check CloudWatch logs for connection errors

### Issue: CORS errors

**Fix:**
1. Verify CORS_ORIGIN includes your extension ID
2. Redeploy backend after changing CORS settings
3. Check API Gateway CORS configuration

### Issue: Authentication failing

**Check:**
1. Cognito User Pool ID is correct
2. App Client ID is correct
3. User exists and is confirmed
4. Password meets requirements

### Issue: DynamoDB throttling

**Fix:**
1. Switch to on-demand billing mode
2. Or increase provisioned capacity
3. Implement caching layer

## Backup & Disaster Recovery

### Manual Backup

```bash
aws dynamodb create-backup \
  --table-name collaborative-task-board-prod-boards \
  --backup-name manual-backup-$(date +%Y%m%d)
```

### Restore from Backup

```bash
aws dynamodb restore-table-from-backup \
  --target-table-name collaborative-task-board-restored \
  --backup-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/boards/backup/12345
```

## Updates & Maintenance

### Deploy Code Updates

```bash
# Test in dev first
serverless deploy --stage dev

# Then production
serverless deploy --stage prod
```

### Database Migration

For schema changes:
1. Create new tables with updated schema
2. Write migration script to copy data
3. Update application to use new tables
4. Verify data integrity
5. Delete old tables

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review security groups and IAM roles
3. Verify all environment variables
4. Test with curl/Postman first
5. Contact DevOps team

---

**Important Links:**
- AWS Console: https://console.aws.amazon.com/
- Cognito Console: https://console.aws.amazon.com/cognito/
- CloudWatch: https://console.aws.amazon.com/cloudwatch/
- DynamoDB: https://console.aws.amazon.com/dynamodb/
