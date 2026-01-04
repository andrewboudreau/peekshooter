#!/usr/bin/env node
// Bump version script - increments GAME_VERSION in game.js

const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, 'game.js');
const content = fs.readFileSync(gameJsPath, 'utf8');

const match = content.match(/const GAME_VERSION = (\d+);/);
if (!match) {
    console.error('Could not find GAME_VERSION in game.js');
    process.exit(1);
}

const currentVersion = parseInt(match[1]);
const newVersion = currentVersion + 1;

const newContent = content.replace(
    /const GAME_VERSION = \d+;/,
    `const GAME_VERSION = ${newVersion};`
);

fs.writeFileSync(gameJsPath, newContent);
console.log(`Version bumped: ${currentVersion} -> ${newVersion}`);
