const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let canvasData = { canvas: [], canvasSize: 2 };

const dataPath = path.join(__dirname, 'canvasData.json');
if (fs.existsSync(dataPath)) {
    const savedData = JSON.parse(fs.readFileSync(dataPath));
    canvasData = savedData;
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.post('/save', (req, res) => {
    canvasData = req.body;
    fs.writeFileSync(dataPath, JSON.stringify(canvasData, null, 2));
    res.sendStatus(200);
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', canvas: canvasData.canvas, canvasSize: canvasData.canvasSize }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'placePixel') {
            canvasData.canvas.push({ x: data.x, y: data.y, color: data.color });
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', x: data.x, y: data.y, color: data.color }));
                }
            });
        } else if (data.type === 'expand') {
            canvasData.canvasSize = data.canvasSize;
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'expand', canvasSize: data.canvasSize }));
                }
            });
        }
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

module.exports = app;
