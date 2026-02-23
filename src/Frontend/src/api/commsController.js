// src/api/commsController.js
import api from './axios';
import io from 'socket.io-client';

class CommsController {
  constructor() {
    this.socket = null;
  }

  // --- HTTP REST API ---
  async login(email, password) {
    const res = await api.post('/users/login', { email, password });
    return res.data;
  }

  async register(displayName, email, password) {
    const res = await api.post('/users/register', { displayName, email, password });
    return res.data;
  }

  async logout() {
    // Call an endpoint that clears the HttpOnly cookie: res.clearCookie('token')
    await api.post('/users/logout');
    this.disconnectSocket();
  }

  async fetchLobby() {
    const res = await api.get('/games/list');
    return res.data;
  }

  async joinGame(gameId) {
    const res = await api.post('/games/join', { gameId });
    return res.data;
  }

  async createGame(maxPlayers) {
    const res = await api.post('/games/create', { maxPlayers });
    return res.data;
  }

  // --- SOCKET CONNECTIONS ---
  connectSocket(gameId, callbacks) {
    this.disconnectSocket();

    // withCredentials ensures the HttpOnly cookie is sent during the handshake
    this.socket = io("/", { withCredentials: true });

    this.socket.on("connect", () => {
      this.socket.emit("join_game", { gameId });
      if (callbacks.onConnect) callbacks.onConnect(gameId);
    });

    this.socket.on("game_pulse", callbacks.onGamePulse);
    this.socket.on("action_log", callbacks.onActionLog);
    this.socket.on("game_event", callbacks.onGameEvent);
    this.socket.on("error", callbacks.onError);
  }

  sendAction(gameId, actionType, payload = {}) {
    if (this.socket) {
      console.log("➡️ Sending:", actionType, payload);
      this.socket.emit("game_action", { gameId, actionType, payload });
    }
  }

  sendQuit(gameId) {
    this.sendAction(gameId, "quit_game", {});
    this.disconnectSocket();
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new CommsController();