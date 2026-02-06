#!/usr/bin/env node

/**
 * Cleanup script to remove old Sonos configuration keys from database
 * Run this on Home Assistant to fix duplicate Sonos config keys
 * 
 * Usage: node cleanup-sonos-config.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function cleanup() {
  try {
    console.log('=== Sonos Configuration Cleanup ===\n');
    
    // Show current config
    console.log('Current Sonos configuration:');
    const currentConfig = await dbAll('SELECT key, value FROM config WHERE key LIKE "%sonos%" ORDER BY key');
    currentConfig.forEach(row => {
      console.log(`  ${row.key} = ${row.value}`);
    });
    console.log('');
    
    // Check for old keys
    const oldHost = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_server']);
    const oldPort = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_port']);
    const newHost = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_host']);
    const newPort = await dbGet('SELECT value FROM config WHERE key = ?', ['sonos_api_port']);
    
    if (oldHost) {
      console.log(`Found old key: sonos_server = ${oldHost.value}`);
      if (!newHost || !newHost.value) {
        console.log(`  Migrating to sonos_api_host...`);
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_host',
          oldHost.value,
        ]);
      } else {
        console.log(`  Keeping existing sonos_api_host = ${newHost.value}`);
      }
      console.log(`  Deleting old sonos_server key...`);
      await dbRun('DELETE FROM config WHERE key = ?', ['sonos_server']);
      console.log(`  ✓ Deleted sonos_server`);
    }
    
    if (oldPort) {
      console.log(`Found old key: sonos_port = ${oldPort.value}`);
      if (!newPort || !newPort.value) {
        console.log(`  Migrating to sonos_api_port...`);
        await dbRun('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [
          'sonos_api_port',
          oldPort.value,
        ]);
      } else {
        console.log(`  Keeping existing sonos_api_port = ${newPort.value}`);
      }
      console.log(`  Deleting old sonos_port key...`);
      await dbRun('DELETE FROM config WHERE key = ?', ['sonos_port']);
      console.log(`  ✓ Deleted sonos_port`);
    }
    
    if (!oldHost && !oldPort) {
      console.log('No old keys found. Database is clean!');
    }
    
    // Show final config
    console.log('\nFinal Sonos configuration:');
    const finalConfig = await dbAll('SELECT key, value FROM config WHERE key LIKE "%sonos%" ORDER BY key');
    finalConfig.forEach(row => {
      console.log(`  ${row.key} = ${row.value}`);
    });
    
    console.log('\n✓ Cleanup completed successfully!');
    console.log('Please restart the server for changes to take effect.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    db.close();
  }
}

cleanup();
