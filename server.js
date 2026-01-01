const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game state
const rooms = new Map();
const playerRooms = new Map();

// Player class
class Player {
    constructor(id, slot) {
        this.id = id;
        this.slot = slot; // 0 or 1 (which side of the arena)
        this.state = {
            crouch: 0,
            lean: 0,
            strafe: 0,
            lookYaw: 0,
            lookPitch: 0,
            weaponHand: 'right',
            health: 100,
        };
        this.lastUpdate = Date.now();
    }
}

// Room class
class Room {
    constructor(id) {
        this.id = id;
        this.players = new Map();
        this.state = 'waiting'; // waiting, playing, finished
        this.scores = [0, 0];
        this.roundTime = 0;
        this.createdAt = Date.now();
    }

    addPlayer(socketId) {
        if (this.players.size >= 2) return null;
        const slot = this.players.size; // 0 or 1
        const player = new Player(socketId, slot);
        this.players.set(socketId, player);
        return player;
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
    }

    getOpponent(socketId) {
        for (const [id, player] of this.players) {
            if (id !== socketId) return player;
        }
        return null;
    }

    isFull() {
        return this.players.size >= 2;
    }

    isEmpty() {
        return this.players.size === 0;
    }
}

// Find or create a room
function findAvailableRoom() {
    for (const [id, room] of rooms) {
        if (!room.isFull() && room.state === 'waiting') {
            return room;
        }
    }
    // Create new room
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room = new Room(roomId);
    rooms.set(roomId, room);
    return room;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Join matchmaking
    socket.on('join', (data) => {
        const room = findAvailableRoom();
        const player = room.addPlayer(socket.id);

        if (!player) {
            socket.emit('error', { message: 'Could not join room' });
            return;
        }

        socket.join(room.id);
        playerRooms.set(socket.id, room.id);

        console.log(`Player ${socket.id} joined room ${room.id} as slot ${player.slot}`);

        // Send join confirmation
        socket.emit('joined', {
            roomId: room.id,
            playerId: socket.id,
            slot: player.slot,
        });

        // Check if game can start
        if (room.isFull()) {
            room.state = 'playing';
            io.to(room.id).emit('gameStart', {
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    slot: p.slot,
                })),
            });
            console.log(`Game starting in room ${room.id}`);
        } else {
            socket.emit('waiting', { message: 'Waiting for opponent...' });
        }
    });

    // Player state update
    socket.on('state', (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Update player state
        player.state = { ...player.state, ...data };
        player.lastUpdate = Date.now();

        // Broadcast to opponent
        socket.to(room.id).emit('opponentState', {
            playerId: socket.id,
            slot: player.slot,
            state: player.state,
        });
    });

    // Player shot
    socket.on('shoot', (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        const player = room.players.get(socket.id);
        if (!player) return;

        // Broadcast shot to opponent
        socket.to(room.id).emit('opponentShoot', {
            playerId: socket.id,
            slot: player.slot,
            state: player.state,
        });
    });

    // Player hit registration
    socket.on('hit', (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        const opponent = room.getOpponent(socket.id);
        if (!opponent) return;

        // Apply damage
        opponent.state.health = Math.max(0, opponent.state.health - data.damage);

        // Broadcast hit
        io.to(room.id).emit('playerHit', {
            targetId: opponent.id,
            targetSlot: opponent.slot,
            damage: data.damage,
            health: opponent.state.health,
        });

        // Check for kill
        if (opponent.state.health <= 0) {
            const player = room.players.get(socket.id);
            room.scores[player.slot]++;

            io.to(room.id).emit('playerKilled', {
                killerId: socket.id,
                killerSlot: player.slot,
                targetId: opponent.id,
                targetSlot: opponent.slot,
                scores: room.scores,
            });

            // Reset for next round after delay
            setTimeout(() => {
                if (room.state === 'playing') {
                    resetRound(room);
                }
            }, 3000);
        }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const roomId = playerRooms.get(socket.id);
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.removePlayer(socket.id);

                // Notify remaining player
                socket.to(room.id).emit('opponentLeft', {
                    message: 'Opponent disconnected',
                });

                // Clean up empty rooms
                if (room.isEmpty()) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (empty)`);
                } else {
                    room.state = 'waiting';
                }
            }
            playerRooms.delete(socket.id);
        }
    });
});

function resetRound(room) {
    // Reset player health
    for (const player of room.players.values()) {
        player.state.health = 100;
    }

    io.to(room.id).emit('roundReset', {
        scores: room.scores,
    });
}

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Peek Shooter server running on http://localhost:${PORT}`);
});
