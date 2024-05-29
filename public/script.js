const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let selectedColor = '#FF0000';

let canvasSize = 2;
let pixels = [];
let scale = 20;
let canPlacePixel = true;
let placeCooldown = 1;  // 1 second
let expandTime = 256;  // 256 seconds
let pixelsPlaced = 0;

let panX = 0;
let panY = 0;

const socket = new WebSocket(`ws://${location.host}`);

socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === 'init') {
        pixels = data.canvas;
        canvasSize = data.canvasSize;
        resizeCanvas();
        drawCanvas();
    } else if (data.type === 'update') {
        pixels.push({ x: data.x, y: data.y, color: data.color });
        drawPixel(data.x, data.y, data.color);
    } else if (data.type === 'expand') {
        canvasSize = data.canvasSize;
        resizeCanvas();
        drawCanvas();
    }
};

document.querySelectorAll('.color').forEach(colorDiv => {
    colorDiv.addEventListener('click', () => {
        selectedColor = colorDiv.getAttribute('data-color');
        document.querySelectorAll('.color').forEach(div => div.style.border = '2px solid #fff');
        colorDiv.style.border = '2px solid #000';
    });
});

canvas.addEventListener('click', (e) => {
    if (!canPlacePixel) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - panX) / scale);
    const y = Math.floor((e.clientY - rect.top - panY) / scale);
    if (x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
        placePixel(x, y, selectedColor);
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const mouseX = (e.clientX - canvas.offsetLeft - panX) / scale;
    const mouseY = (e.clientY - canvas.offsetTop - panY) / scale;

    scale *= (1 - zoomIntensity * Math.sign(e.deltaY));
    panX = e.clientX - mouseX * scale;
    panY = e.clientY - mouseY * scale;

    drawCanvas();
});

document.addEventListener('keydown', (e) => {
    const panStep = 10;
    switch (e.key) {
        case 'w':
            panY += panStep;
            break;
        case 'a':
            panX += panStep;
            break;
        case 's':
            panY -= panStep;
            break;
        case 'd':
            panX -= panStep;
            break;
    }
    drawCanvas();
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    pixels.forEach(pixel => drawPixel(pixel.x, pixel.y, pixel.color));
    ctx.strokeStyle = '#00f';
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(0, 0, canvasSize * scale, canvasSize * scale);
    ctx.restore();
}

function drawPixel(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * scale, y * scale, scale, scale);
}

function placePixel(x, y, color) {
    socket.send(JSON.stringify({ type: 'placePixel', x, y, color }));
    drawPixel(x, y, color);
    canPlacePixel = false;
    placeCooldown = 1;
    pixelsPlaced++;
    if (pixelsPlaced >= 10) {
        pixelsPlaced = 0;
        saveCanvas();
    }
    setTimeout(() => canPlacePixel = true, placeCooldown * 1000);
}

function updateTimers() {
    if (placeCooldown > 0) {
        placeCooldown -= 0.1;
        if (placeCooldown < 0) placeCooldown = 0;
    }
    document.getElementById('placeTimer').textContent = `Place Timer: ${placeCooldown.toFixed(1)}s`;

    expandTime -= 0.1;
    if (expandTime <= 0) {
        expandTime = 256;
        canvasSize += 2;
        socket.send(JSON.stringify({ type: 'expand', canvasSize }));
        drawCanvas();
    }
    document.getElementById('expandTimer').textContent = `Expand Timer: ${expandTime.toFixed(1)}s`;
}

function saveCanvas() {
    fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ canvas: pixels, canvasSize })
    });
}

setInterval(updateTimers, 100);
resizeCanvas();
drawCanvas();
