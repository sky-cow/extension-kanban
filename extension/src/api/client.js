/**
 * API Client
 * 
 * Handles all HTTP requests to the backend API
 */

class APIClient {
  constructor(baseURL, getToken) {
    this.baseURL = baseURL;
    this.getToken = getToken;
  }

  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Board endpoints
  async getBoards() {
    return this.request('/boards');
  }

  async createBoard(data) {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBoard(boardId) {
    return this.request(`/boards/${boardId}`);
  }

  async updateBoard(boardId, data) {
    return this.request(`/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBoard(boardId) {
    return this.request(`/boards/${boardId}`, {
      method: 'DELETE',
    });
  }

  // Task endpoints
  async getTasks(listId, boardId) {
    return this.request(`/lists/${listId}/tasks?boardId=${boardId}`);
  }

  async createTask(listId, boardId, data) {
    return this.request(`/lists/${listId}/tasks?boardId=${boardId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(taskId, listId, boardId, data) {
    return this.request(`/tasks/${taskId}?listId=${listId}&boardId=${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId, listId, boardId) {
    return this.request(`/tasks/${taskId}?listId=${listId}&boardId=${boardId}`, {
      method: 'DELETE',
    });
  }

  async moveTask(taskId, listId, boardId, targetListId) {
    return this.request(`/tasks/${taskId}/move?listId=${listId}&boardId=${boardId}`, {
      method: 'PUT',
      body: JSON.stringify({ targetListId }),
    });
  }

  
}

if (typeof window !== 'undefined') {
  window.APIClient = APIClient;
}
