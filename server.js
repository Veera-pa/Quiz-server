// ------------------------------------------------------------
//  🔥 QUIZ SERVER – ONE USB / TWO PHONES READY
// ------------------------------------------------------------
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// ------------------------------------------------------------
//  Rooms data
// ------------------------------------------------------------
const rooms = {}; 
// rooms[quizTitle] = { players: [{id, name, wins, rank, avatar}], roomId, status }

console.log('🟢 Quiz server initialized');

// ------------------------------------------------------------
//  Helper: generate unique room ID
// ------------------------------------------------------------
function generateRoomId() {
  return Math.random().toString(36).substr(2, 9);
}

// ------------------------------------------------------------
//  Client Connected
// ------------------------------------------------------------
io.on('connection', (socket) => {
  console.log('🟩 User connected:', socket.id);

  // ------------------------------
  // Register player
  // ------------------------------
  socket.on('register-player', (data) => {
    socket.playerInfo = {
      id: socket.id,
      name: data.name || 'Unknown',
      wins: data.wins || 0,
      rank: data.rank || 'Rookie',
      avatar: data.avatar || ''
    };
    console.log(`👤 Player registered: ${socket.id} ->`, socket.playerInfo);
  });

  // ------------------------------
  // Join quiz
  // ------------------------------
  socket.on('join-quiz', (quizTitle) => {
    console.log(`🎮 ${socket.id} requested to join quiz: ${quizTitle}`);

    if (!rooms[quizTitle]) {
      rooms[quizTitle] = { players: [], roomId: generateRoomId(), status: 'waiting' };
      console.log(`📌 Created room for quiz: ${quizTitle}`);
    }

    const room = rooms[quizTitle];

    // Add player if not already in room
    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push(socket.playerInfo);
      socket.join(room.roomId);
      console.log(`➕ Added ${socket.id} to room:`, room.roomId);
    }

    // Notify player waiting
    if (room.players.length === 1) {
      socket.emit('waiting', { status: 'Searching for opponent…' });
      return;
    }

    // Match players when 2 connected
    if (room.players.length >= 2 && room.status === 'waiting') {
      room.status = 'matched';
      const [playerA, playerB] = room.players;

      // Send opponent info
      io.to(playerA.id).emit('opponent_found', {
        opponentName: playerB.name,
        opponentWins: playerB.wins,
        opponentRank: playerB.rank,
        opponentAvatar: playerB.avatar
      });

      io.to(playerB.id).emit('opponent_found', {
        opponentName: playerA.name,
        opponentWins: playerA.wins,
        opponentRank: playerA.rank,
        opponentAvatar: playerA.avatar
      });

      console.log(`🎯 MATCH READY: ${playerA.id} <--> ${playerB.id}`);

      // Start quiz after 2 seconds
      setTimeout(() => {
        io.to(playerA.id).emit('quiz-starting');
        io.to(playerB.id).emit('quiz-starting');
        console.log(`🚀 Quiz started for room: ${room.roomId}`);
      }, 2000);
    }
  });

  // ------------------------------
  // Handle disconnect
  // ------------------------------
  socket.on('disconnect', () => {
    console.log('🟥 User disconnected:', socket.id);

    // Remove from rooms
    for (const quizTitle in rooms) {
      const room = rooms[quizTitle];
      room.players = room.players.filter(p => p.id !== socket.id);

      // If room is empty, delete it
      if (room.players.length === 0) delete rooms[quizTitle];
      else if (room.players.length === 1) room.status = 'waiting';
    }
  });
});

// ------------------------------------------------------------
//  Health Check
// ------------------------------------------------------------
app.get('/', (_, res) => {
  res.send('🔥 Quiz server running. Build: ' + new Date().toISOString());
});

// ------------------------------------------------------------
//  Start Server
// ------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Quiz server running on port ${PORT}`));
