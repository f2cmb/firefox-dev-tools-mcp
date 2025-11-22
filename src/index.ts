#!/usr/bin/env node

import { FirefoxDevToolsServer } from './server.js';

async function main() {
  try {
    const server = new FirefoxDevToolsServer();
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
