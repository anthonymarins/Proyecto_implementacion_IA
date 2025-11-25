require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- DIAGNÓSTICO DE INICIO ---
console.log("--- INICIANDO SERVIDOR ---");
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR CRÍTICO: No se encontró la variable DATABASE_URL.");
} else {
  console.log("✅ Variable DATABASE_URL detectada.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTA SETUP ---
app.get('/setup', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventario (
        id SERIAL PRIMARY KEY,
        herramienta VARCHAR(100) NOT NULL,
        cantidad INTEGER NOT NULL,
        pasillo INTEGER NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("<h1>✅ Sistema listo. Tabla verificada.</h1>");
  } catch (e) { res.status(500).send("Error: " + e.message); }
});

// --- RUTA GUARDAR (Upsert) ---
app.post('/guardar', async (req, res) => {
  const { herramienta, cantidad, pasillo } = req.body;
  if (!herramienta || !cantidad) return res.status(400).json({ error: "Datos incompletos" });

  try {
    const busqueda = await pool.query('SELECT * FROM inventario WHERE herramienta = $1', [herramienta]);

    if (busqueda.rows.length > 0) {
      const fila = busqueda.rows[0];
      const nuevaCant = fila.cantidad + parseInt(cantidad);
      await pool.query('UPDATE inventario SET cantidad = $1, pasillo = $2, fecha = CURRENT_TIMESTAMP WHERE id = $3', [nuevaCant, pasillo, fila.id]);
      console.log(`🔄 ACTUALIZADO: ${herramienta} -> ${nuevaCant}`);
      res.json({ status: 'actualizado', total: nuevaCant });
    } else {
      await pool.query('INSERT INTO inventario (herramienta, cantidad, pasillo) VALUES ($1, $2, $3)', [herramienta, cantidad, pasillo]);
      console.log(`✨ CREADO: ${herramienta}`);
      res.json({ status: 'creado' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- RUTA BUSCAR ---
app.get('/buscar', async (req, res) => {
  const { nombre } = req.query;
  
  if (!nombre) return res.status(400).json({ error: "Falta nombre" });

  try {
    const resultado = await pool.query('SELECT * FROM inventario WHERE herramienta = $1', [nombre]);
    
    if (resultado.rows.length > 0) {
      console.log(`🔎 BUSQUEDA ÉXITOSA: ${nombre}`);
      res.json({ encontrado: true, datos: resultado.rows[0] });
    } else {
      console.log(`⚠️ BUSQUEDA VACÍA: ${nombre}`);
      res.json({ encontrado: false });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('🚀 Backend listo en puerto 3000'));