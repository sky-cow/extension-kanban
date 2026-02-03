import { CONFIG } from '../../config.js';

// Workspace structure:
// {
//   organizationId: string,
//   currentUserId: string,
//   activeBoardId: string,
//   boards: Board[],
//   lists: List[],
//   tasks: Task[],
// }
//
// Board matches backend Board.toJSON():
// { id, name, description, organizationId, createdBy, createdAt, updatedAt, isArchived }
//
// List matches backend List.toJSON() (even if backend routes not implemented yet):
// { id, boardId, name, order, createdBy, createdAt, updatedAt }
//
// Task matches backend Task.toJSON():
// { id, listId, title, description, link, label, assignedTo, createdBy, createdAt, updatedAt, order }

const STORAGE_KEY = 'taskboard.workspace.v1';

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && chrome?.storage?.local;
}

async function storageGet(key) {
  if (hasChromeStorage()) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  }
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : undefined;
}

async function storageSet(key, value) {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [key]: value });
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function seedWorkspace() {
  const organizationId = CONFIG.ORGANIZATION_ID || 'local-org';
  const currentUserId = 'local-user-id';

  const boardId = crypto.randomUUID();
  const listTodo = crypto.randomUUID();
  const listDoing = crypto.randomUUID();
  const listDone = crypto.randomUUID();

  return {
    organizationId,
    currentUserId,
    activeBoardId: boardId,
    boards: [
      {
        id: boardId,
        name: 'Client Board',
        description: 'One client at a time, shared across teams.',
        organizationId,
        createdBy: currentUserId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        isArchived: false,
      },
    ],
    lists: [
      { id: listTodo, boardId, name: 'To do', order: 0, createdBy: currentUserId, createdAt: nowIso(), updatedAt: nowIso() },
      { id: listDoing, boardId, name: 'Doing', order: 1, createdBy: currentUserId, createdAt: nowIso(), updatedAt: nowIso() },
      { id: listDone, boardId, name: 'Done', order: 2, createdBy: currentUserId, createdAt: nowIso(), updatedAt: nowIso() },
    ],
    tasks: [
      {
        id: crypto.randomUUID(),
        listId: listTodo,
        title: 'Kickoff: clarify scope & owners',
        description: 'Add a short summary and who owns what.',
        link: '',
        label: 'important',
        assignedTo: null,
        createdBy: currentUserId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        order: 0,
      },
      {
        id: crypto.randomUUID(),
        listId: listDoing,
        title: 'Build Kanban UI in React',
        description: 'Drag/drop, edit, labels, links.',
        link: '',
        label: 'normal',
        assignedTo: null,
        createdBy: currentUserId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        order: 0,
      },
      {
        id: crypto.randomUUID(),
        listId: listDone,
        title: 'Bootstrap extension shell',
        description: 'Manifest + popup + storage.',
        link: '',
        label: 'low',
        assignedTo: null,
        createdBy: currentUserId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        order: 0,
      },
    ],
  };
}

export async function ensureSeedData() {
  const existing = await storageGet(STORAGE_KEY);
  if (existing) return;
  await storageSet(STORAGE_KEY, seedWorkspace());
}

export async function loadWorkspace() {
  const ws = await storageGet(STORAGE_KEY);
  if (!ws) return seedWorkspace();
  return ws;
}

export async function saveWorkspace(workspace) {
  await storageSet(STORAGE_KEY, workspace);
}

