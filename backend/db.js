// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');

// const dbPath = path.resolve(__dirname, 'registros.db');
// const db = new sqlite3.Database(dbPath);

// db.serialize(() => {
//     db.run(`CREATE TABLE IF NOT EXISTS registros (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         data TEXT NOT NULL,
//         hora TEXT NOT NULL
//     )`);
// });

// module.exports = db;

// backend/db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.resolve(__dirname, 'registros.db');
const backupPath = path.resolve(__dirname, 'backup.json');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS registros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        hora TEXT NOT NULL
    )`, [], () => {
        db.get("SELECT COUNT(*) as count FROM registros", (err, row) => {
            if (!err && row.count === 0 && fs.existsSync(backupPath)) {
                const backupData = JSON.parse(fs.readFileSync(backupPath));
                const stmt = db.prepare("INSERT INTO registros (data, hora) VALUES (?, ?)");
                backupData.forEach(r => stmt.run(r.data, r.hora));
                stmt.finalize();
                console.log("Banco restaurado a partir do backup.");
            }
        });
    });
});

module.exports = db;
