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
    setStatus('Loading boards...');
    const boards = await fetchBoards();

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
    setStatus('Loaded');
  } catch (err) {
    console.error('Error loading boards:', err);
    setStatus('Failed to load boards', true);
  }
}

async function loadBoard(boardId) {
  try {
    setStatus('Loading board...');

    const tasks = await fetchBoardTasks(boardId);

    // Group tasks by listId since we don't have list names yet
    const listsById = new Map();

    tasks.forEach(task => {
      const listId = task.listId || 'unknown';

      if (!listsById.has(listId)) {
        listsById.set(listId, {
          id: listId,
          name: `List ${listId.slice(0, 6)}`, // placeholder name based on id
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

    setStatus('Board loaded');
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