# Collaborative Task Board - Real-time Team Collaboration

A production-ready Chrome extension with AWS backend for real-time collaborative task management across teams managing multiple clients.

## Architecture Overview

```
┌─────────────────┐
│ Chrome Extension│
│   (Frontend)    │
└────────┬────────┘
         │ WebSocket (WSS)
         │ REST API (HTTPS)
         ▼
┌─────────────────┐
│   API Gateway   │
│   + Cognito     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda/ECS     │
│  (Node.js API)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DynamoDB      │
│  (Database)     │
└─────────────────┘
```

## Technology Stack

### Frontend (Extension)
- Vanilla JavaScript (ES6+)
- WebSocket client for real-time updates
- Chrome Extension APIs
- Modern CSS with responsive design

### Backend (AWS)
- **API Gateway**: RESTful API + WebSocket endpoint
- **Lambda** or **ECS Fargate**: Node.js application server
- **DynamoDB**: NoSQL database (scalable, serverless)
- **Cognito**: User authentication and authorization
- **CloudWatch**: Logging and monitoring
- **IAM**: Fine-grained access control

## Security Features

✅ **Authentication**: AWS Cognito with JWT tokens
✅ **Authorization**: Role-based access control (RBAC)
✅ **Encryption**: TLS 1.3 for all communications
✅ **Data Validation**: Input sanitization on client and server
✅ **Rate Limiting**: API Gateway throttling
✅ **CORS**: Properly configured cross-origin policies
✅ **SQL Injection Prevention**: NoSQL with parameterized queries
✅ **XSS Prevention**: Content Security Policy + sanitization

## Project Structure

```
collaborative-task-board/
├── extension/              # Chrome Extension
│   ├── manifest.json
│   ├── src/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── styles.css
│   │   ├── api/
│   │   │   ├── client.js      # API client
│   │   │   └── websocket.js   # WebSocket handler
│   │   ├── auth/
│   │   │   └── auth.js        # Authentication
│   │   ├── components/
│   │   │   ├── board.js
│   │   │   ├── list.js
│   │   │   └── task.js
│   │   └── utils/
│   │       ├── helpers.js
│   │       └── validators.js
│   └── icons/
├── backend/                # AWS Backend
│   ├── lambda/             # Lambda functions
│   │   ├── api/
│   │   │   ├── boards.js
│   │   │   ├── lists.js
│   │   │   ├── tasks.js
│   │   │   └── users.js
│   │   └── websocket/
│   │       ├── connect.js
│   │       ├── disconnect.js
│   │       └── message.js
│   ├── models/             # Data models
│   │   ├── Board.js
│   │   ├── List.js
│   │   ├── Task.js
│   │   └── User.js
│   ├── services/           # Business logic
│   │   ├── boardService.js
│   │   ├── listService.js
│   │   ├── taskService.js
│   │   └── notificationService.js
│   ├── middleware/         # Express middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── utils/
│   │   ├── db.js
│   │   └── logger.js
│   ├── infrastructure/     # IaC
│   │   ├── cloudformation/ # or Terraform
│   │   └── serverless.yml
│   ├── package.json
│   └── README.md
├── docs/                   # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── DEVELOPMENT.md
└── README.md
```

## Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- Node.js 18+ and npm
- AWS CLI configured
- Chrome browser

### Backend Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

```bash
cd backend
npm install
npm run deploy
```

### Extension Installation

1. Update `extension/src/config.js` with your API endpoints
2. Load extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

## Features

### Core Functionality
- ✅ Real-time collaboration (multiple users can edit simultaneously)
- ✅ Multiple boards per organization
- ✅ Customizable lists and tasks
- ✅ Drag-and-drop task management
- ✅ Task labels and priorities
- ✅ Task descriptions and links
- ✅ User presence indicators
- ✅ Activity history

### Team Features
- 👥 User authentication and profiles
- 🔒 Board-level permissions (view/edit)
- 📢 Real-time notifications
- 👀 See who's currently viewing a board
- 📝 Task comments (future)
- 📎 File attachments (future)

## Database Schema

### DynamoDB Tables

#### Boards Table
- PK: `BOARD#{boardId}`
- SK: `METADATA`
- Attributes: name, createdBy, createdAt, organizationId

#### Lists Table
- PK: `BOARD#{boardId}`
- SK: `LIST#{listId}`
- Attributes: name, order, createdAt

#### Tasks Table
- PK: `LIST#{listId}`
- SK: `TASK#{taskId}`
- Attributes: title, description, link, label, assignedTo, createdBy, createdAt, updatedAt

#### Users Table
- PK: `USER#{userId}`
- SK: `PROFILE`
- Attributes: email, name, organizationId, role

#### BoardMembers Table (Access Control)
- PK: `BOARD#{boardId}`
- SK: `USER#{userId}`
- Attributes: role (owner/editor/viewer), joinedAt

## API Endpoints

### REST API

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

#### Boards
- `GET /boards` - List user's boards
- `POST /boards` - Create board
- `GET /boards/:id` - Get board details
- `PUT /boards/:id` - Update board
- `DELETE /boards/:id` - Delete board
- `POST /boards/:id/members` - Add member
- `DELETE /boards/:id/members/:userId` - Remove member

#### Lists
- `GET /boards/:boardId/lists` - Get lists
- `POST /boards/:boardId/lists` - Create list
- `PUT /lists/:id` - Update list
- `DELETE /lists/:id` - Delete list
- `PUT /lists/:id/reorder` - Reorder list

#### Tasks
- `GET /lists/:listId/tasks` - Get tasks
- `POST /lists/:listId/tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PUT /tasks/:id/move` - Move task to different list

### WebSocket Events

#### Client → Server
- `board:join` - Join board room
- `board:leave` - Leave board room
- `task:update` - Real-time task update
- `task:move` - Real-time task move

#### Server → Client
- `board:update` - Board data changed
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `task:moved` - Task moved
- `user:joined` - User joined board
- `user:left` - User left board

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev          # Local development with SAM Local
npm test             # Run tests
npm run lint         # Run ESLint
npm run deploy:dev   # Deploy to dev environment
npm run deploy:prod  # Deploy to production
```

### Extension Development
```bash
cd extension
# Make changes to src/ files
# Reload extension in chrome://extensions/
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
AWS_REGION=us-east-1
DYNAMODB_TABLE_PREFIX=taskboard-dev
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
WEBSOCKET_API_ENDPOINT=wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev
CORS_ORIGIN=chrome-extension://your-extension-id
LOG_LEVEL=info
```

### Extension (config.js)
```javascript
const CONFIG = {
  API_BASE_URL: 'https://xxxxx.execute-api.us-east-1.amazonaws.com/dev',
  WS_URL: 'wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev',
  COGNITO_REGION: 'us-east-1',
  COGNITO_USER_POOL_ID: 'us-east-1_xxxxx',
  COGNITO_CLIENT_ID: 'xxxxx'
};
```

## Monitoring & Logging

- **CloudWatch Logs**: All Lambda function logs
- **CloudWatch Metrics**: API Gateway, Lambda, DynamoDB metrics
- **X-Ray**: Distributed tracing
- **Custom Metrics**: User activity, error rates

## Testing

```bash
# Backend unit tests
cd backend
npm test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Cost Estimation (AWS)

For a team of 50 users with moderate usage:

- **DynamoDB**: ~$5-10/month (on-demand pricing)
- **Lambda**: ~$5-15/month (1M requests)
- **API Gateway**: ~$5-10/month
- **Cognito**: Free tier covers 50 users
- **CloudWatch**: ~$5/month

**Total**: ~$20-40/month

## Contributing

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for coding standards and contribution guidelines.

## License

Internal company use only.

## Support

For issues or questions:
1. Check documentation in `/docs`
2. Review CloudWatch logs
3. Contact DevOps team

---

**Version**: 2.0.0 (Collaborative)  
**Last Updated**: February 2026
# extension-kanban
