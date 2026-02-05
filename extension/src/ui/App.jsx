import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CONFIG } from "../config.js";
import {
  ensureSeedData,
  loadWorkspace,
  saveWorkspace,
  setCurrentUser,
  loadSettings,
  saveSettings,
} from "../ui/data/workspaceStore.js";
import { signIn, signOut, getAuthToken } from "../auth.js";
import { BoardPicker } from "./components/BoardPicker.jsx";
import { ListColumn } from "./components/ListColumn.jsx";
import { TaskCard } from "./components/TaskCard.jsx";
import { CreateBar } from "./components/CreateBar.jsx";

function nowIso() {
  return new Date().toISOString();
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function sortByOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function recomputeOrder(items) {
  return items.map((it, idx) => ({ ...it, order: idx }));
}

export default function App() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [status, setStatus] = useState(
    CONFIG.ENABLE_OFFLINE_MODE ? "Mock/offline mode" : "Live mode",
  );
  const [workspace, setWorkspace] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    popupWidth: 600,
    popupHeight: 600,
    keepOpenInWindow: false,
  });
  const [authLoading, setAuthLoading] = useState(true);

  console.log(213);

  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      try {
        // Require sign-in on open. signIn will return a mock user in non-extension dev.
        const info = await signIn();
        console.debug("App: signIn() returned", info);
        console.debug(
          "App: CONFIG.ENABLE_OFFLINE_MODE =",
          CONFIG.ENABLE_OFFLINE_MODE,
        );
        setUser(info);
        await setCurrentUser(info);

        // Try to read token (if available) for visibility
        try {
          const token = await getAuthToken();
          console.debug("App: getAuthToken() =>", token);
        } catch (tokenErr) {
          console.debug("App: getAuthToken() error", tokenErr);
        }

        await ensureSeedData();
        const ws = await loadWorkspace();
        console.debug("App: loaded workspace", ws);
        setWorkspace(ws);
        const s = await loadSettings();
        setSettings(s);
        setStatus(
          CONFIG.ENABLE_OFFLINE_MODE ? "Mock/offline mode" : "Live mode",
        );
      } catch (e) {
        console.error("Auth/load failed", e);
        setStatus("Please sign in to use the board");
      } finally {
        setAuthLoading(false);
      }
    })().catch((e) => {
      console.error(e);
      setStatus("Failed to load workspace");
      setAuthLoading(false);
    });
  }, []);

  const activeBoard = useMemo(() => {
    if (!workspace) return null;
    return (
      workspace.boards.find((b) => b.id === workspace.activeBoardId) ||
      workspace.boards[0] ||
      null
    );
  }, [workspace]);

  const listsForBoard = useMemo(() => {
    if (!workspace || !activeBoard) return [];
    return workspace.lists
      .filter((l) => l.boardId === activeBoard.id)
      .slice()
      .sort(sortByOrder);
  }, [workspace, activeBoard]);

  const tasksForBoard = useMemo(() => {
    if (!workspace || !activeBoard) return [];
    const listIds = new Set(listsForBoard.map((l) => l.id));
    return workspace.tasks
      .filter((t) => listIds.has(t.listId))
      .slice()
      .sort(sortByOrder);
  }, [workspace, activeBoard, listsForBoard]);

  const tasksByListId = useMemo(() => {
    const map = new Map();
    for (const list of listsForBoard) map.set(list.id, []);
    for (const task of tasksForBoard) {
      if (!map.has(task.listId)) map.set(task.listId, []);
      map.get(task.listId).push(task);
    }
    for (const [k, v] of map.entries()) map.set(k, v.slice().sort(sortByOrder));
    return map;
  }, [listsForBoard, tasksForBoard]);

  async function commit(nextWorkspace, nextStatus) {
    setWorkspace(nextWorkspace);
    await saveWorkspace(nextWorkspace);
    if (nextStatus) setStatus(nextStatus);
  }

  async function onSelectBoard(boardId) {
    if (!workspace) return;
    await commit(
      { ...workspace, activeBoardId: boardId },
      CONFIG.ENABLE_OFFLINE_MODE ? "Mock/offline mode" : "Live mode",
    );
  }

  async function onCreateBoard(name) {
    if (!workspace) return;
    const id = crypto.randomUUID();
    const board = {
      id,
      name,
      description: "",
      organizationId: workspace.organizationId,
      createdBy: workspace.currentUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isArchived: false,
    };

    console.log("board", board);

    const next = {
      ...workspace,
      boards: [board, ...workspace.boards],
      activeBoardId: id,
    };
    await commit(next, "Board created");
  }

  async function handleSignIn() {
    try {
      const info = await signIn();
      setUser(info);
      await setCurrentUser(info);
      setStatus("Signed in");
    } catch (err) {
      console.error("Sign-in failed", err);
      setStatus("Sign-in failed");
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setStatus("Signed out");
  }

  async function applySettings(next) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await saveSettings(merged);
    // If keepOpenInWindow is enabled, open a new window and close popup
    if (
      merged.keepOpenInWindow &&
      typeof chrome !== "undefined" &&
      chrome.windows
    ) {
      chrome.windows.create({
        url: "/popup.html",
        type: "popup",
        width: merged.popupWidth,
        height: merged.popupHeight,
      });
      // close current popup if running as extension action
      if (chrome.runtime && chrome.windows) {
        window.close();
      }
    }
  }

  async function onRenameBoard(boardId, name) {
    if (!workspace) return;
    const next = {
      ...workspace,
      boards: workspace.boards.map((b) =>
        b.id === boardId ? { ...b, name, updatedAt: nowIso() } : b,
      ),
    };
    await commit(next, "Board updated");
  }

  async function onCreateList(name) {
    if (!workspace || !activeBoard) return;
    const id = crypto.randomUUID();
    const order = listsForBoard.length;
    const list = {
      id,
      boardId: activeBoard.id,
      name,
      order,
      createdBy: workspace.currentUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const next = { ...workspace, lists: [...workspace.lists, list] };
    await commit(next, "List created");
  }

  async function onRenameList(listId, name) {
    if (!workspace) return;
    const next = {
      ...workspace,
      lists: workspace.lists.map((l) =>
        l.id === listId ? { ...l, name, updatedAt: nowIso() } : l,
      ),
    };
    await commit(next, "List updated");
  }

  async function onCreateTask(listId, title) {
    if (!workspace) return;
    const id = crypto.randomUUID();
    const existing = tasksByListId.get(listId) || [];
    const task = {
      id,
      listId,
      title,
      description: "",
      link: "",
      label: "none",
      assignedTo: null,
      createdBy: workspace.currentUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      order: existing.length,
    };
    const next = { ...workspace, tasks: [...workspace.tasks, task] };
    await commit(next, "Task created");
  }

  async function onUpdateTask(taskId, patch) {
    if (!workspace) return;
    const next = {
      ...workspace,
      tasks: workspace.tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch, updatedAt: nowIso() } : t,
      ),
    };
    await commit(next, "Task updated");
  }

  function findTask(taskId) {
    return workspace?.tasks.find((t) => t.id === taskId) || null;
  }

  function findList(listId) {
    return workspace?.lists.find((l) => l.id === listId) || null;
  }

  const listIds = useMemo(
    () => listsForBoard.map((l) => l.id),
    [listsForBoard],
  );

  // DnD IDs are namespaced to avoid collisions
  const taskDndId = (taskId) => `task:${taskId}`;
  const listDndId = (listId) => `list:${listId}`;

  const taskIdsByListDnd = useMemo(() => {
    const result = {};
    for (const list of listsForBoard) {
      const tasks = tasksByListId.get(list.id) || [];
      result[listDndId(list.id)] = tasks.map((t) => taskDndId(t.id));
    }
    return result;
  }, [listsForBoard, tasksByListId]);

  async function onDragStart(event) {
    const { active } = event;
    if (!active?.id) return;
    const id = String(active.id);
    if (id.startsWith("task:")) setActiveTaskId(id.slice("task:".length));
  }

  async function onDragEnd(event) {
    setActiveTaskId(null);
    if (!workspace || !activeBoard) return;

    const { active, over } = event;
    if (!active?.id || !over?.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Reorder lists
    if (activeId.startsWith("list:") && overId.startsWith("list:")) {
      const a = activeId.slice("list:".length);
      const b = overId.slice("list:".length);
      if (a === b) return;

      const oldIndex = listIds.indexOf(a);
      const newIndex = listIds.indexOf(b);
      if (oldIndex === -1 || newIndex === -1) return;

      const nextListsForBoard = arrayMove(listsForBoard, oldIndex, newIndex);
      const nextOrdered = recomputeOrder(nextListsForBoard);

      const next = {
        ...workspace,
        lists: workspace.lists.map((l) => {
          const updated = nextOrdered.find((nl) => nl.id === l.id);
          return updated
            ? { ...l, order: updated.order, updatedAt: nowIso() }
            : l;
        }),
      };
      await commit(next, "Lists reordered");
      return;
    }

    // Move/reorder tasks
    if (activeId.startsWith("task:")) {
      const taskId = activeId.slice("task:".length);
      const task = findTask(taskId);
      if (!task) return;

      // Determine destination list
      let destListId = null;
      let destTaskId = null;

      if (overId.startsWith("task:")) {
        destTaskId = overId.slice("task:".length);
        const destTask = findTask(destTaskId);
        destListId = destTask?.listId || null;
      } else if (overId.startsWith("list:")) {
        destListId = overId.slice("list:".length);
      }
      if (!destListId) return;

      const srcListId = task.listId;
      const srcTasks = (tasksByListId.get(srcListId) || [])
        .slice()
        .sort(sortByOrder);
      const dstTasks = (tasksByListId.get(destListId) || [])
        .slice()
        .sort(sortByOrder);

      // Remove from source
      const srcIndex = srcTasks.findIndex((t) => t.id === taskId);
      if (srcIndex === -1) return;
      srcTasks.splice(srcIndex, 1);

      const moved = { ...task, listId: destListId };

      // Insert into destination
      let insertIndex = dstTasks.length;
      if (destTaskId) {
        const overIndex = dstTasks.findIndex((t) => t.id === destTaskId);
        if (overIndex !== -1) insertIndex = overIndex;
      }
      dstTasks.splice(insertIndex, 0, moved);

      const nextSrc = recomputeOrder(srcTasks);
      const nextDst = recomputeOrder(dstTasks);
      const touchedTaskIds = new Set([
        ...nextSrc.map((t) => t.id),
        ...nextDst.map((t) => t.id),
      ]);

      const next = {
        ...workspace,
        tasks: workspace.tasks.map((t) => {
          if (!touchedTaskIds.has(t.id)) return t;
          const updated =
            nextSrc.find((x) => x.id === t.id) ||
            nextDst.find((x) => x.id === t.id);
          return updated
            ? {
                ...t,
                listId: updated.listId,
                order: updated.order,
                updatedAt: nowIso(),
              }
            : t;
        }),
      };

      await commit(
        next,
        srcListId === destListId ? "Tasks reordered" : "Task moved",
      );
    }
  }

  if (!workspace || !activeBoard) {
    // While authenticating, show a loading state.
    if (authLoading) {
      return (
        <div className="app">
          <div className="topbar">
            <div className="brand">Task Board</div>
            <div className="status">{status}</div>
          </div>
          <div className="empty">Loading…</div>
        </div>
      );
    }

    // If not authenticated, require sign-in before using the board.
    if (!user) {
      return (
        <div className="app">
          <div className="topbar">
            <div className="brand">Task Board</div>
            <div className="status">{status}</div>
          </div>
          <div style={{ padding: 20 }}>
            <h3>Please sign in with Google to continue</h3>
            <p>
              You must be signed in to use the board. Your Gmail address will be
              used as your username.
            </p>
            <button className="btn" onClick={handleSignIn}>
              Sign in with Google
            </button>
          </div>
        </div>
      );
    }
    // Otherwise we have no workspace/board but are authenticated: show loading.
    return (
      <div className="app">
        <div className="topbar">
          <div className="brand">Task Board</div>
          <div className="status">{status}</div>
        </div>
        <div className="empty">Loading…</div>
      </div>
    );
  }

  const activeTask = activeTaskId ? findTask(activeTaskId) : null;

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">Task Board</div>
        <div className="topControls">
          {user ? (
            <div className="userInfo">
              <span className="userName">{user.name || user.email}</span>
              <button className="btn small" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="btn" onClick={handleSignIn}>
              Sign in with Google
            </button>
          )}

          <div className="settings">
            <label style={{ fontSize: 12, marginRight: 6 }}>Popup</label>
            <input
              type="number"
              value={settings.popupWidth}
              style={{ width: 60 }}
              onChange={(e) =>
                applySettings({ popupWidth: Number(e.target.value) || 600 })
              }
            />
            <input
              type="number"
              value={settings.popupHeight}
              style={{ width: 60, marginLeft: 6 }}
              onChange={(e) =>
                applySettings({ popupHeight: Number(e.target.value) || 600 })
              }
            />
            <label style={{ marginLeft: 8, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={settings.keepOpenInWindow}
                onChange={(e) =>
                  applySettings({ keepOpenInWindow: e.target.checked })
                }
              />{" "}
              Open in window
            </label>
          </div>
        </div>
        <BoardPicker
          boards={workspace.boards}
          activeBoardId={activeBoard.id}
          onSelectBoard={onSelectBoard}
          onCreateBoard={onCreateBoard}
          onRenameBoard={(name) => onRenameBoard(activeBoard.id, name)}
        />
        <div
          className="status"
          title={
            CONFIG.ENABLE_OFFLINE_MODE
              ? "Offline/mock data"
              : "Backend connected"
          }
        >
          {status}
        </div>
      </div>

      <CreateBar onCreateList={onCreateList} />

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="board">
          <SortableContext
            items={listsForBoard.map((l) => listDndId(l.id))}
            strategy={horizontalListSortingStrategy}
          >
            {listsForBoard.map((list) => {
              const tasks = tasksByListId.get(list.id) || [];
              return (
                <SortableContext
                  key={list.id}
                  items={taskIdsByListDnd[listDndId(list.id)] || []}
                  strategy={verticalListSortingStrategy}
                >
                  <ListColumn
                    dndId={listDndId(list.id)}
                    list={list}
                    tasks={tasks}
                    onRename={(name) => onRenameList(list.id, name)}
                    onCreateTask={(title) => onCreateTask(list.id, title)}
                    onUpdateTask={onUpdateTask}
                    taskDndId={taskDndId}
                  />
                </SortableContext>
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <div className="footerHint">
        Tip: drag tasks between lists. This is stored locally for now; later
        we’ll sync to the backend.
      </div>
    </div>
  );
}
