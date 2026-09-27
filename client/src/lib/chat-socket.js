import { io } from 'socket.io-client';
import { auth } from '@/lib/firebase';

const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const socketUrl = import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, '');
const socketPath = import.meta.env.VITE_SOCKET_PATH || '/socket.io';

let socket;
let refreshingToken = false;

export async function getChatSocket() {
  const user = auth?.currentUser;
  if (!user) throw new Error('You must be signed in.');
  const token = await user.getIdToken();

  if (!socket) {
    socket = io(socketUrl, {
      path: socketPath,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 10_000,
      timeout: 10_000,
      auth: { token },
    });
    socket.on('connect_error', async (error) => {
      const code = error?.data?.code;
      if (refreshingToken || !auth?.currentUser || !['INVALID_AUTH_TOKEN', 'AUTH_REQUIRED'].includes(code)) return;
      refreshingToken = true;
      try {
        socket.auth = { token: await auth.currentUser.getIdToken(true) };
        socket.connect();
      } finally {
        refreshingToken = false;
      }
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export async function refreshChatSocketToken() {
  if (!socket || !auth?.currentUser) return;
  socket.auth = { token: await auth.currentUser.getIdToken(true) };
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = undefined;
}
