// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;
const backupPath = path.resolve(__dirname, 'backup.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rota para registrar um novo ponto
app.post('/api/registrar', (req, res) => {
    const { data, hora } = req.body;
    const stmt = db.prepare('INSERT INTO registros (data, hora) VALUES (?, ?)');

    stmt.run(data, hora, function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao salvar registro' });
        }

        // Atualiza o backup
        db.all('SELECT data, hora FROM registros', (err, rows) => {
            if (!err) {
                fs.writeFileSync(backupPath, JSON.stringify(rows, null, 2));
            }
        });

        res.status(200).json({ id: this.lastID });
    });

    stmt.finalize();
});

// Rota para listar todos os registros
app.get('/api/registros', (req, res) => {
    db.all('SELECT data, hora FROM registros ORDER BY id DESC LIMIT 10', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar registros' });
        }
        res.json(rows);
    });
});

// Rota para calcular saldo de horas
app.get('/api/saldo', (req, res) => {
    db.all('SELECT data, hora FROM registros ORDER BY data, hora', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao calcular saldo' });
        }

        const registrosPorDia = {};

        rows.forEach(({ data, hora }) => {
            if (!registrosPorDia[data]) registrosPorDia[data] = [];
            registrosPorDia[data].push(hora);
        });

        let saldoMinutos = 0;

        for (const data in registrosPorDia) {
            const horarios = registrosPorDia[data]
                .map(h => new Date(`1970-01-01T${h.padStart(8, '0')}`))
                .sort((a, b) => a - b);

            for (let i = 0; i < horarios.length; i += 2) {
                if (horarios[i + 1]) {
                    const diff = (horarios[i + 1] - horarios[i]) / (1000 * 60); // minutos
                    saldoMinutos += diff;
                }
            }

            saldoMinutos -= 480; // Subtrai 8h por dia (em minutos)
        }

        const horas = Math.floor(Math.abs(saldoMinutos) / 60);
        const minutos = Math.abs(saldoMinutos) % 60;
        const sinal = saldoMinutos >= 0 ? '' : '-';

        res.json({ saldo: `${sinal}${horas}h ${minutos}min` });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
