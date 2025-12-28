const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./server/data/database.sqlite');

console.log('=== SQLite Migration Verification ===\n');

// Check clients
db.all('SELECT * FROM clients', (err, clients) => {
    if (err) {
        console.error('Error querying clients:', err);
        return;
    }
    
    console.log(`Found ${clients.length} clients:`);
    clients.forEach(client => {
        console.log(`  - ${client.name} (${client.id}) -> Room: ${client.room}`);
    });
    console.log();
    
    // Check media items for each client
    clients.forEach(client => {
        db.all('SELECT * FROM media_items WHERE clientId = ?', [client.id], (err, items) => {
            if (err) {
                console.error(`Error querying media for ${client.id}:`, err);
                return;
            }
            
            console.log(`Client "${client.name}" has ${items.length} media items:`);
            items.slice(0, 3).forEach(item => {
                console.log(`  - ${item.title} by ${item.artist || 'Unknown'} (${item.category})`);
            });
            if (items.length > 3) {
                console.log(`  ... and ${items.length - 3} more items`);
            }
            console.log();
        });
    });
});

// Check config
db.all('SELECT * FROM config', (err, configs) => {
    if (err) {
        console.error('Error querying config:', err);
        return;
    }
    
    console.log(`Found ${configs.length} configuration entries:`);
    configs.forEach(config => {
        const value = config.key.includes('secret') ? '***' : config.value;
        console.log(`  - ${config.key}: ${value}`);
    });
    console.log();
});

// Check users/PIN
db.all('SELECT * FROM users', (err, users) => {
    if (err) {
        console.error('Error querying users:', err);
        return;
    }
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
        console.log(`  - ${user.username}: PIN set (${user.pin.length} digits)`);
    });
    console.log();
    
    setTimeout(() => {
        db.close();
        console.log('Verification complete!');
    }, 1000);
});
