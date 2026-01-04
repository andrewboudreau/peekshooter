/**
 * Multiplayer Connection Test
 * Tests that two players can connect and play against each other
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

// Test utilities
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient(name) {
    return new Promise((resolve, reject) => {
        const socket = io(SERVER_URL, {
            autoConnect: false,
            reconnection: false,
        });

        const client = {
            name,
            socket,
            playerId: null,
            roomId: null,
            slot: null,
            gameStarted: false,
            opponentState: null,
            wasHit: false,
            wasKilled: false,
            health: 100,
            events: [],
        };

        socket.on('connect', () => {
            client.playerId = socket.id;
            console.log(`[${name}] Connected with ID: ${socket.id}`);
        });

        socket.on('connect_error', (err) => {
            console.error(`[${name}] Connection error:`, err.message);
            reject(err);
        });

        socket.on('joined', (data) => {
            client.roomId = data.roomId;
            client.slot = data.slot;
            client.events.push({ type: 'joined', data });
            console.log(`[${name}] Joined room ${data.roomId} as slot ${data.slot}`);
        });

        socket.on('waiting', (data) => {
            client.events.push({ type: 'waiting', data });
            console.log(`[${name}] Waiting for opponent...`);
        });

        socket.on('gameStart', (data) => {
            client.gameStarted = true;
            client.events.push({ type: 'gameStart', data });
            console.log(`[${name}] Game started! Players:`, data.players);
        });

        socket.on('opponentState', (data) => {
            client.opponentState = data.state;
        });

        socket.on('opponentShoot', (data) => {
            client.events.push({ type: 'opponentShoot', data });
            console.log(`[${name}] Opponent shot!`);
        });

        socket.on('playerHit', (data) => {
            if (data.targetId === socket.id) {
                client.wasHit = true;
                client.health = data.health;
            }
            client.events.push({ type: 'playerHit', data });
            console.log(`[${name}] Player hit! Target: ${data.targetId === socket.id ? 'ME' : 'OPPONENT'}, Health: ${data.health}`);
        });

        socket.on('playerKilled', (data) => {
            if (data.targetId === socket.id) {
                client.wasKilled = true;
            }
            client.events.push({ type: 'playerKilled', data });
            console.log(`[${name}] Player killed! Target: ${data.targetId === socket.id ? 'ME' : 'OPPONENT'}`);
        });

        socket.on('roundReset', (data) => {
            client.health = 100;
            client.wasHit = false;
            // Note: don't reset wasKilled here so tests can verify kill happened
            client.events.push({ type: 'roundReset', data });
            console.log(`[${name}] Round reset! Scores:`, data.scores);
        });

        socket.on('opponentLeft', (data) => {
            client.events.push({ type: 'opponentLeft', data });
            console.log(`[${name}] Opponent left!`);
        });

        socket.connect();

        // Wait for connection
        const timeout = setTimeout(() => {
            reject(new Error(`[${name}] Connection timeout`));
        }, 5000);

        socket.once('connect', () => {
            clearTimeout(timeout);
            resolve(client);
        });
    });
}

// Test functions
async function testTwoPlayerConnection() {
    console.log('\n=== TEST: Two Player Connection ===\n');

    const player1 = await createClient('Player1');
    const player2 = await createClient('Player2');

    // Both players join
    player1.socket.emit('join', {});
    await wait(200);
    player2.socket.emit('join', {});
    await wait(500);

    // Verify both joined same room
    const sameRoom = player1.roomId === player2.roomId;
    console.log(`\nSame room: ${sameRoom ? 'YES' : 'NO'}`);
    console.log(`Player1 room: ${player1.roomId}, slot: ${player1.slot}`);
    console.log(`Player2 room: ${player2.roomId}, slot: ${player2.slot}`);

    // Verify game started for both
    const bothStarted = player1.gameStarted && player2.gameStarted;
    console.log(`Both received gameStart: ${bothStarted ? 'YES' : 'NO'}`);

    // Verify different slots
    const differentSlots = player1.slot !== player2.slot;
    console.log(`Different slots: ${differentSlots ? 'YES' : 'NO'}`);

    // Cleanup
    player1.socket.disconnect();
    player2.socket.disconnect();

    return sameRoom && bothStarted && differentSlots;
}

async function testStateSync() {
    console.log('\n=== TEST: State Synchronization ===\n');

    const player1 = await createClient('Player1');
    const player2 = await createClient('Player2');

    // Join and start game
    player1.socket.emit('join', {});
    await wait(200);
    player2.socket.emit('join', {});
    await wait(500);

    if (!player1.gameStarted || !player2.gameStarted) {
        console.log('Game did not start!');
        player1.socket.disconnect();
        player2.socket.disconnect();
        return false;
    }

    // Player1 sends state update
    const testState = {
        crouch: 0.5,
        lean: -0.3,
        strafe: 0.2,
        lookYaw: 0.1,
        lookPitch: -0.1,
    };

    console.log('Player1 sending state:', testState);
    player1.socket.emit('state', testState);
    await wait(300);

    // Check if Player2 received the state
    const received = player2.opponentState !== null;
    console.log(`Player2 received opponent state: ${received ? 'YES' : 'NO'}`);

    if (received) {
        console.log('Received state:', player2.opponentState);
        const stateMatch =
            Math.abs(player2.opponentState.crouch - testState.crouch) < 0.01 &&
            Math.abs(player2.opponentState.lean - testState.lean) < 0.01;
        console.log(`State values match: ${stateMatch ? 'YES' : 'NO'}`);
    }

    // Cleanup
    player1.socket.disconnect();
    player2.socket.disconnect();

    return received;
}

async function testShootingAndHits() {
    console.log('\n=== TEST: Shooting and Hit Registration ===\n');

    const player1 = await createClient('Player1');
    const player2 = await createClient('Player2');

    // Join and start game
    player1.socket.emit('join', {});
    await wait(200);
    player2.socket.emit('join', {});
    await wait(500);

    if (!player1.gameStarted || !player2.gameStarted) {
        console.log('Game did not start!');
        player1.socket.disconnect();
        player2.socket.disconnect();
        return false;
    }

    // Player1 shoots
    console.log('Player1 shooting...');
    player1.socket.emit('shoot', {});
    await wait(200);

    // Check if Player2 received shoot event
    const shootReceived = player2.events.some(e => e.type === 'opponentShoot');
    console.log(`Player2 received shoot event: ${shootReceived ? 'YES' : 'NO'}`);

    // Player1 registers a hit on Player2
    console.log('Player1 registering hit...');
    player1.socket.emit('hit', { damage: 25 });
    await wait(200);

    // Check if Player2 was hit
    console.log(`Player2 was hit: ${player2.wasHit ? 'YES' : 'NO'}`);
    console.log(`Player2 health: ${player2.health}`);

    // Cleanup
    player1.socket.disconnect();
    player2.socket.disconnect();

    return shootReceived && player2.wasHit && player2.health === 75;
}

async function testKillAndRoundReset() {
    console.log('\n=== TEST: Kill and Round Reset ===\n');

    const player1 = await createClient('Player1');
    const player2 = await createClient('Player2');

    // Join and start game
    player1.socket.emit('join', {});
    await wait(200);
    player2.socket.emit('join', {});
    await wait(500);

    if (!player1.gameStarted || !player2.gameStarted) {
        console.log('Game did not start!');
        player1.socket.disconnect();
        player2.socket.disconnect();
        return false;
    }

    // Player1 does enough damage to kill Player2
    console.log('Player1 dealing fatal damage...');
    player1.socket.emit('hit', { damage: 100 });
    await wait(500);

    // Check if Player2 was killed
    console.log(`Player2 was killed: ${player2.wasKilled ? 'YES' : 'NO'}`);

    // Wait for round reset (server has 3 second delay)
    console.log('Waiting for round reset...');
    await wait(3500);

    // Check if round reset was received
    const roundResetReceived = player2.events.some(e => e.type === 'roundReset');
    console.log(`Round reset received: ${roundResetReceived ? 'YES' : 'NO'}`);
    console.log(`Player2 health after reset: ${player2.health}`);

    // Cleanup
    player1.socket.disconnect();
    player2.socket.disconnect();

    return player2.wasKilled && roundResetReceived && player2.health === 100;
}

async function testPlayerDisconnect() {
    console.log('\n=== TEST: Player Disconnect Handling ===\n');

    const player1 = await createClient('Player1');
    const player2 = await createClient('Player2');

    // Join and start game
    player1.socket.emit('join', {});
    await wait(200);
    player2.socket.emit('join', {});
    await wait(500);

    if (!player1.gameStarted || !player2.gameStarted) {
        console.log('Game did not start!');
        player1.socket.disconnect();
        player2.socket.disconnect();
        return false;
    }

    // Player2 disconnects
    console.log('Player2 disconnecting...');
    player2.socket.disconnect();
    await wait(300);

    // Check if Player1 received disconnect notification
    const disconnectReceived = player1.events.some(e => e.type === 'opponentLeft');
    console.log(`Player1 received opponentLeft: ${disconnectReceived ? 'YES' : 'NO'}`);

    // Cleanup
    player1.socket.disconnect();

    return disconnectReceived;
}

// Run all tests
async function runTests() {
    console.log('========================================');
    console.log('    PEEK SHOOTER MULTIPLAYER TESTS');
    console.log('========================================');
    console.log('Make sure server is running: npm start\n');

    const results = {
        connection: false,
        stateSync: false,
        shooting: false,
        killReset: false,
        disconnect: false,
    };

    try {
        results.connection = await testTwoPlayerConnection();
        await wait(500);

        results.stateSync = await testStateSync();
        await wait(500);

        results.shooting = await testShootingAndHits();
        await wait(500);

        results.killReset = await testKillAndRoundReset();
        await wait(500);

        results.disconnect = await testPlayerDisconnect();
    } catch (err) {
        console.error('\nTest error:', err.message);
        console.log('Is the server running? Run: npm start');
    }

    // Summary
    console.log('\n========================================');
    console.log('           TEST RESULTS');
    console.log('========================================');
    console.log(`Two Player Connection: ${results.connection ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`State Synchronization: ${results.stateSync ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Shooting & Hits:       ${results.shooting ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Kill & Round Reset:    ${results.killReset ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`Disconnect Handling:   ${results.disconnect ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log('========================================');

    const allPassed = Object.values(results).every(r => r);
    console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED'}`);

    process.exit(allPassed ? 0 : 1);
}

runTests();
