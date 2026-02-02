# Quick Start Guide - Collaborative Task Board

## What You Have

A production-ready, real-time collaborative task board system with:

✅ **Secure Backend** - AWS Lambda + API Gateway + DynamoDB
✅ **Real-Time Sync** - WebSocket for instant updates across all users  
✅ **Authentication** - AWS Cognito with JWT tokens
✅ **Chrome Extension** - Clean, intuitive interface
✅ **Role-Based Access** - Owner/Editor/Viewer permissions
✅ **Enterprise Security** - Rate limiting, input validation, CORS, encryption

## Architecture

```
Chrome Extension (Frontend)
       ↓
AWS API Gateway (REST + WebSocket)
       ↓
AWS Lambda (Node.js Backend)
       ↓
DynamoDB (Database)
       +
AWS Cognito (Authentication)
```

## Quick Deploy (15 minutes)

### 1. Set Up Cognito (5 min)

```bash
# Create user pool
aws cognito-idp create-user-pool \
  --pool-name task-board-users \
  --policies "PasswordPolicy={MinimumLength=8}"

# Create app client  
aws cognito-idp create-user-pool-client \
  --user-pool-id YOUR_POOL_ID \
  --client-name task-board-extension \
  --no-generate-secret

# Create test user
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_POOL_ID \
  --username test@company.com \
  --temporary-password TempPass123!
```

### 2. Deploy Backend (5 min)

```bash
cd backend
npm install

# Update .env with Cognito IDs
echo "COGNITO_USER_POOL_ID=YOUR_POOL_ID" >> .env
echo "COGNITO_CLIENT_ID=YOUR_CLIENT_ID" >> .env

# Deploy
serverless deploy --stage dev
```

### 3. Configure Extension (5 min)

```javascript
// Update extension/src/config.js
const CONFIG = {
  API_BASE_URL: 'https://YOUR_API.execute-api.us-east-1.amazonaws.com/dev/api',
  WS_URL: 'wss://YOUR_WS.execute-api.us-east-1.amazonaws.com/dev',
  COGNITO_USER_POOL_ID: 'us-east-1_XXXXX',
  COGNITO_CLIENT_ID: 'XXXXX',
};
```

Load extension in Chrome: `chrome://extensions/` → Load unpacked → Select `extension/` folder

## File Structure

```
collaborative-task-board/
├── backend/                    # AWS Backend
│   ├── src/
│   │   ├── models/            # Data models with validation
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, validation, errors
│   │   ├── websocket/         # Real-time handlers
│   │   ├── utils/             # DB client, logger
│   │   └── app.js             # Express app
│   ├── serverless.yml         # AWS infrastructure
│   └── package.json
│
├── extension/                  # Chrome Extension
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── auth/              # Authentication
│   │   ├── components/        # UI components
│   │   ├── utils/             # Helpers
│   │   ├── config.js          # Configuration
│   │   ├── popup.html         # Main UI
│   │   ├── popup.js           # App logic
│   │   └── styles.css         # Styling
│   └── manifest.json
│
└── docs/                       # Documentation
    ├── DEPLOYMENT.md          # Full deployment guide
    ├── API.md                 # API documentation
    └── SECURITY.md            # Security practices
```

## Code Quality Features

### Backend Best Practices

**Atomic Operations**
- Transaction writes for data consistency
- Proper error handling at every layer
- Retry logic for transient failures

**Security**
- JWT token validation on every request
- Input sanitization and validation (Joi)
- Rate limiting (100 req/15min per IP)
- CORS properly configured
- SQL injection prevention (NoSQL with parameterized queries)
- XSS prevention (Content Security Policy)

**Maintainability**
- Clear separation of concerns (Models, Services, Routes)
- Comprehensive error handling with custom error classes
- Structured logging (Winston)  
- Type validation schemas
- Async/await with proper error propagation

**Scalability**
- Serverless auto-scaling
- DynamoDB on-demand billing
- WebSocket connection management
- Efficient queries with proper indexes

### Frontend Best Practices

**Clean Code**
- Modular components
- Separated API client
- Configuration management
- Error handling with user feedback

**Real-Time Features**
- Automatic reconnection
- Heartbeat mechanism
- Optimistic UI updates
- Conflict resolution

## Key Files to Customize

### 1. Data Models (`backend/src/models/`)
- `Board.js` - Board structure and validation
- `List.js` - List structure
- `Task.js` - Task structure with labels

### 2. Business Logic (`backend/src/services/`)
- `boardService.js` - Board operations
- `taskService.js` - Task operations  
- `websocketService.js` - Real-time sync

### 3. API Routes (`backend/src/routes/`)
- `boards.js` - Board endpoints
- `tasks.js` - Task endpoints

### 4. Extension UI (`extension/src/`)
- `popup.html` - UI structure
- `popup.js` - Application logic
- `styles.css` - Styling
- `config.js` - Configuration

## Testing

### Test Backend Locally

```bash
cd backend
npm run dev
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Create board (with auth token)
curl -X POST http://localhost:3000/api/boards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Board","organizationId":"uuid"}'
```

### Test Extension

1. Load extension in Chrome
2. Open DevTools Console (F12)
3. Check for errors
4. Test creating boards, lists, tasks
5. Test drag-and-drop
6. Test real-time sync (open in 2 windows)

## Common Customizations

### Add New Task Field

1. Update `backend/src/models/Task.js` - add field and validation
2. Update `backend/src/services/taskService.js` - handle new field  
3. Update extension UI to show/edit new field

### Add Due Dates

```javascript
// In Task.js model
dueDate: Joi.date().optional(),

// In extension popup.js
<input type="date" id="taskDueDate">
```

### Add Task Comments

1. Create `Comment.js` model
2. Create `commentService.js`
3. Add comment routes
4. Update extension UI with comment section
5. Broadcast comments via WebSocket

### Add File Attachments

1. Set up S3 bucket
2. Add pre-signed URL generation
3. Update task model with attachment URLs
4. Add file upload UI in extension

## Monitoring

### View Logs

```bash
# API logs
serverless logs -f api --tail --stage dev

# WebSocket logs  
serverless logs -f websocketDefault --tail --stage dev
```

### CloudWatch Metrics

Go to AWS Console → CloudWatch:
- Lambda invocations and errors
- API Gateway requests and latency
- DynamoDB read/write capacity

## Cost Estimate

For 50 users with moderate usage:
- **Lambda**: $5-15/month
- **API Gateway**: $5-10/month  
- **DynamoDB**: $5-10/month (on-demand)
- **Cognito**: Free tier (< 50,000 MAU)
- **CloudWatch**: ~$5/month

**Total**: ~$20-40/month

## Security Checklist

- [ ] Cognito user pool configured
- [ ] Strong password policy enabled
- [ ] JWT tokens expiring appropriately (1 hour)
- [ ] CORS limited to your extension ID
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] CloudWatch logging enabled
- [ ] DynamoDB encryption at rest
- [ ] TLS 1.3 for all connections
- [ ] IAM roles follow least privilege

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Serverless Framework**: https://www.serverless.com/framework/docs
- **Chrome Extensions**: https://developer.chrome.com/docs/extensions/

## Next Steps

1. ✅ Deploy to AWS
2. ✅ Test basic functionality
3. ⏭️ Add your team members to Cognito
4. ⏭️ Customize branding and colors
5. ⏭️ Add company-specific features
6. ⏭️ Set up monitoring alerts
7. ⏭️ Deploy to production

## Getting Help

If you encounter issues:
1. Check CloudWatch logs for errors
2. Verify all environment variables are set
3. Test API endpoints with curl/Postman
4. Check browser console for frontend errors
5. Review the DEPLOYMENT.md guide

---

**You now have a production-ready, scalable, secure collaborative task board!** 🎉
