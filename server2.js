const express = require("express");
const WebSocket = require("ws");
const app = express();

const server = app.listen(3000, () => console.log("Servidor ECG en puerto 3000"));
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    // Retransmisión directa (Broadcast) a los navegadores [cite: 74]
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data); 
      }
    });
  });
});

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<body style="background:#000; color:#0f0; font-family:monospace; overflow:hidden;">
  <h3>Monitor ECG Tiempo Real (500Hz)</h3>
  <canvas id="scope"></canvas>

<script>
  const canvas = document.getElementById("scope");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = 400;

  let dataPoints = new Float32Array(1000); // Ventana de 1000 muestras 
  const socket = new WebSocket("wss://" + location.host);
  socket.binaryType = "arraybuffer";

  socket.onmessage = (event) => {
    const rawData = new Uint16Array(event.data);
    // Desplazar datos antiguos y añadir nuevos
    dataPoints.set(dataPoints.subarray(rawData.length));
    for(let i=0; i<rawData.length; i++) {
      dataPoints[dataPoints.length - rawData.length + i] = rawData[i] * (3.3 / 4095);
    }
  };

  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // Efecto de persistencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for(let i=0; i<dataPoints.length; i++) {
      let x = i * (canvas.width / dataPoints.length);
      let y = canvas.height - (dataPoints[i] / 3.3 * canvas.height);
      if(i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    requestAnimationFrame(draw);
  }
  draw();
</script>
</body>
</html>
  `);
});