#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
    port: 3333,
    defaultWidth: 1920,
    defaultHeight: 1080,
    screenshotDir: 'screenshots',
    waitForGame: 1000,  // ms to wait after page load
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        output: null,
        width: CONFIG.defaultWidth,
        height: CONFIG.defaultHeight,
        delay: CONFIG.waitForGame,
        autoStart: true,
        help: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-o':
            case '--output':
                options.output = args[++i];
                break;
            case '-w':
            case '--width':
                options.width = parseInt(args[++i], 10);
                break;
            case '-h':
            case '--height':
                options.height = parseInt(args[++i], 10);
                break;
            case '-d':
            case '--delay':
                options.delay = parseInt(args[++i], 10);
                break;
            case '--no-auto-start':
                options.autoStart = false;
                break;
            case '--help':
                options.help = true;
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Peek Shooter Screenshot Tool

Usage: node screenshot.js [options]

Options:
  -o, --output <file>    Output filename (default: screenshot-<timestamp>.png)
  -w, --width <px>       Viewport width (default: 1920)
  -h, --height <px>      Viewport height (default: 1080)
  -d, --delay <ms>       Delay after page load before capture (default: 1000)
  --no-auto-start        Don't auto-click the start button
  --help                 Show this help message

Examples:
  node screenshot.js                          # Basic screenshot
  node screenshot.js -o test.png              # Custom filename
  node screenshot.js -w 1280 -h 720           # Custom resolution
  node screenshot.js -d 3000                  # Wait 3 seconds before capture
`);
}

async function startServer() {
    return new Promise((resolve, reject) => {
        const server = spawn('npx', ['serve', '.', '-l', CONFIG.port.toString()], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
        });

        let started = false;

        server.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('Accepting connections') && !started) {
                started = true;
                resolve(server);
            }
        });

        server.stderr.on('data', (data) => {
            const output = data.toString();
            // serve outputs to stderr sometimes
            if (output.includes('Accepting connections') && !started) {
                started = true;
                resolve(server);
            }
        });

        server.on('error', (err) => {
            reject(err);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            if (!started) {
                server.kill();
                reject(new Error('Server failed to start within 10 seconds'));
            }
        }, 10000);
    });
}

async function takeScreenshot(options) {
    let server = null;
    let browser = null;

    try {
        // Ensure screenshots directory exists
        if (!fs.existsSync(CONFIG.screenshotDir)) {
            fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
        }

        // Start local server
        console.log('Starting local server...');
        server = await startServer();
        console.log(`Server running on port ${CONFIG.port}`);

        // Give server a moment to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Launch browser
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                `--window-size=${options.width},${options.height}`,
                // WebGL support for headless
                '--enable-webgl',
                '--use-gl=angle',
                '--use-angle=swiftshader',
                '--enable-gpu-rasterization',
            ],
        });

        const page = await browser.newPage();
        await page.setViewport({
            width: options.width,
            height: options.height,
        });

        // Navigate to game
        console.log('Loading game...');
        await page.goto(`http://localhost:${CONFIG.port}`, {
            waitUntil: 'networkidle0',
        });

        // Click start button if auto-start enabled
        if (options.autoStart) {
            console.log('Starting game (Practice mode)...');
            // Click the Practice button (.offline) to start offline game
            await page.click('#start-screen button.offline');
            await page.waitForFunction(() => {
                const startScreen = document.getElementById('start-screen');
                return startScreen && startScreen.style.display === 'none';
            }, { timeout: 5000 });
        }

        // Wait for specified delay
        console.log(`Waiting ${options.delay}ms for scene to render...`);
        await new Promise(resolve => setTimeout(resolve, options.delay));

        // Wait for a render frame to complete
        await page.evaluate(() => {
            return new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });
        });

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.output || `screenshot-${timestamp}.png`;
        const filepath = path.join(CONFIG.screenshotDir, filename);

        // Take screenshot
        console.log(`Capturing screenshot...`);
        await page.screenshot({
            path: filepath,
            type: 'png',
        });

        console.log(`Screenshot saved: ${filepath}`);
        return filepath;

    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }
        if (server) {
            server.kill();
        }
    }
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    try {
        await takeScreenshot(options);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
