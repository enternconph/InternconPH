import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { corsOriginCallback } from './cors.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOriginCallback,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  // Cross-origin & authenticated handshake verification
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'internconph_jwt_secret_2026_super_key');
        socket.user = decoded;
      } catch (err) {
        console.warn('[Socket.IO Auth]', err.message);
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // Auto-join entity rooms based on verified socket JWT claims
    if (socket.user) {
      if (socket.user.user_id) socket.join(`user_${socket.user.user_id}`);
      if (socket.user.institution_id) socket.join(`inst_${socket.user.institution_id}`);
      if (socket.user.org_id) socket.join(`org_${socket.user.org_id}`);
      if (socket.user.student_id) socket.join(`student_${socket.user.student_id}`);
    }

    // Keep existing manual room joining working for backwards compatibility / dynamic rooms
    socket.on('join_room', (room) => {
      if (room) {
        socket.join(room);
      }
    });

    socket.on('leave_room', (room) => {
      if (room) {
        socket.leave(room);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitUpdate(eventType, payload = {}) {
  if (!io) return;

  const data = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString()
  };

  const targetedRooms = [];
  if (payload.institution_id) targetedRooms.push(`inst_${payload.institution_id}`);
  if (payload.organization_id) targetedRooms.push(`org_${payload.organization_id}`);
  if (payload.user_id) targetedRooms.push(`user_${payload.user_id}`);
  if (payload.student_id) targetedRooms.push(`student_${payload.student_id}`);

  if (targetedRooms.length > 0) {
    // Deliver strictly to the targeted entity rooms to prevent system-wide broadcast floods
    const uniqueRooms = [...new Set(targetedRooms)];
    for (const room of uniqueRooms) {
      io.to(room).emit('data_updated', data);
      io.to(room).emit(eventType, payload);
    }
  } else {
    // Global broadcast only for system-wide events
    io.emit('data_updated', data);
    io.emit(eventType, payload);
  }
}
