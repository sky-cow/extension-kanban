// popup.js

// Use global CONFIG and APIClient from config.js and client.js

const statusEl = document.getElementById('status');
const boardSelectEl = document.getElementById('board-select');
const boardContainerEl = document.getElementById('board-container');
const refreshBtn = document.getElementById('refresh-btn');

// For now: unauthenticated local dev, so getToken just returns null.
// When you wire Cognito, replace this with a real token getter.
const apiClient = new APIClient(CONFIG.API_BASE_URL, async () => null);

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? '#ffb3b3' : '#ffffff';
}

function getMockData() {
  // Minimal seed data shaped like the backend responses (Board.toJSON / Task.toJSON)
  const boardId = '11111111-1111-1111-1111-111111111111';
  const listTodo = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const listDoing = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const listDone = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  return {
    boards: [
      {
        id: boardId,
        name: 'Mock Board',
        description: 'Frontend-only mock data (no backend/db/auth yet)',
        organizationId: CONFIG.ORGANIZATION_ID || 'local-org',
        createdBy: 'local-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isArchived: false,
      },
    ],
    tasksByBoardId: {
      [boardId]: [
        {
          id: 't1',
          listId: listTodo,
          title: 'Wire up Kanban UI',
          description: 'Render lists and tasks from mock data',
          link: '',
          label: 'important',
          assignedTo: null,
          createdBy: 'local-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: 1,
        },
        {
          id: 't2',
          listId: listDoing,
          title: 'Add drag & drop (later)',
          description: 'Pure FE first; sync later when BE is ready',
          link: '',
          label: 'normal',
          assignedTo: null,
          createdBy: 'local-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: 1,
        },
        {
          id: 't3',
          listId: listDone,
          title: 'Bootstrap extension shell',
          description: 'manifest + popup + styles',
          link: '',
          label: 'low',
          assignedTo: null,
          createdBy: 'local-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: 1,
        },
      ],
    },
    listNameById: {
      [listTodo]: 'To do',
      [listDoing]: 'Doing',
      [listDone]: 'Done',
    },
  };
}

// Call the real backend: GET /api/boards
async function fetchBoards() {
  const response = await apiClient.request('/boards');
  // backend returns { success, data, count }
  return response.data || [];
}

// Call the real backend: GET /api/boards/:boardId/tasks
async function fetchBoardTasks(boardId) {
  const response = await apiClient.request(`/boards/${boardId}/tasks`);
  // backend returns { success, data, count }
  return response.data || [];
}

async function loadBoards() {
  try {
    setStatus(CONFIG.ENABLE_OFFLINE_MODE ? 'Loading boards (mock)...' : 'Loading boards...');
    const mock = getMockData();
    const boards = CONFIG.ENABLE_OFFLINE_MODE ? mock.boards : await fetchBoards();

    boardSelectEl.innerHTML = '';

    boards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.name || 'Untitled board';
      boardSelectEl.appendChild(option);
    });

    if (boards.length === 0) {
      boardContainerEl.innerHTML = '<p>No boards yet.</p>';
      setStatus('No boards found');
      return;
    }

    const firstBoardId = boardSelectEl.value;
    await loadBoard(firstBoardId);
    setStatus(CONFIG.ENABLE_OFFLINE_MODE ? 'Loaded (mock mode)' : 'Loaded');
  } catch (err) {
    console.error('Error loading boards:', err);
    // Fallback to mock data so FE work can continue even if backend/db isn't up.
    const mock = getMockData();
    boardSelectEl.innerHTML = '';
    mock.boards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = `${board.name} (mock)`;
      boardSelectEl.appendChild(option);
    });
    if (mock.boards.length > 0) {
      await loadBoard(mock.boards[0].id, { forceMock: true });
      setStatus('Backend unavailable — using mock data', true);
      return;
    }
    setStatus('Failed to load boards', true);
  }
}

async function loadBoard(boardId, opts = {}) {
  try {
    const useMock = CONFIG.ENABLE_OFFLINE_MODE || opts.forceMock;
    setStatus(useMock ? 'Loading board (mock)...' : 'Loading board...');

    const mock = getMockData();
    const tasks = useMock
      ? (mock.tasksByBoardId[boardId] || [])
      : await fetchBoardTasks(boardId);

    // Group tasks by listId since we don't have list names yet
    const listsById = new Map();

    tasks.forEach(task => {
      const listId = task.listId || 'unknown';

      if (!listsById.has(listId)) {
        listsById.set(listId, {
          id: listId,
          name: (useMock && mock.listNameById[listId]) ? mock.listNameById[listId] : `List ${listId.slice(0, 6)}`,
          tasks: []
        });
      }

      listsById.get(listId).tasks.push(task);
    });

    // Render lists and tasks
    boardContainerEl.innerHTML = '';

    if (listsById.size === 0) {
      boardContainerEl.innerHTML = '<p>No tasks yet for this board.</p>';
      setStatus('Board loaded (empty)');
      return;
    }

    // Sort lists by id for stable layout (you can later sort by order if you store it)
    const lists = Array.from(listsById.values());

    lists.forEach(list => {
      const listEl = document.createElement('section');
      listEl.className = 'list';

      const titleEl = document.createElement('div');
      titleEl.className = 'list-title';
      titleEl.textContent = list.name;
      listEl.appendChild(titleEl);

      const taskListEl = document.createElement('div');
      taskListEl.className = 'task-list';

      // Sort tasks by their "order" field
      list.tasks.sort((a, b) => (a.order || 0) - (b.order || 0));

      list.tasks.forEach(task => {
        const taskEl = document.createElement('article');
        taskEl.className = 'task';

        const title = document.createElement('div');
        title.className = 'task-title';
        title.textContent = task.title || 'Untitled task';
        taskEl.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'task-meta';

        const labelPart = task.label && task.label !== 'none'
          ? `[${task.label}] `
          : '';

        meta.textContent = `${labelPart}${task.description || ''}`.trim();
        taskEl.appendChild(meta);

        if (task.link) {
          const linkEl = document.createElement('a');
          linkEl.href = task.link;
          linkEl.textContent = 'Open link';
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';
          linkEl.style.display = 'block';
          linkEl.style.fontSize = '11px';
          linkEl.style.marginTop = '2px';
          taskEl.appendChild(linkEl);
        }

        taskListEl.appendChild(taskEl);
      });

      listEl.appendChild(taskListEl);
      boardContainerEl.appendChild(listEl);
    });

    setStatus(useMock ? 'Board loaded (mock mode)' : 'Board loaded');
  } catch (err) {
    console.error('Error loading board:', err);
    setStatus('Failed to load board', true);
  }
}

// Event wiring
boardSelectEl.addEventListener('change', () => {
  const boardId = boardSelectEl.value;
  if (boardId) {
    loadBoard(boardId);
  }
});

refreshBtn.addEventListener('click', () => {
  const boardId = boardSelectEl.value;
  if (boardId) {
    loadBoard(boardId);
  } else {
    loadBoards();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadBoards();
});