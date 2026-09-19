import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }
  });

  io.on('connection', (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join_room', (room) => {
      if (room) {
        socket.join(room);
        // console.log(`[Socket.IO] ${socket.id} joined room: ${room}`);
      }
    });

    socket.on('leave_room', (room) => {
      if (room) {
        socket.leave(room);
      }
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
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
