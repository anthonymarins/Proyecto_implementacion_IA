import React, { useState, useRef } from 'react';
import { Camera, Save, AlertTriangle, CheckCircle, Package, Search, MapPin, Box } from 'lucide-react';
import './App.css';

const REGLAS = {
  'Martillo': { p: 1, c: 'Golpe' }, 'Mazo': { p: 1, c: 'Golpe' },
  'Destornillador': { p: 2, c: 'Manual' }, 'Llave Inglesa': { p: 2, c: 'Manual' },
  'Alicates': { p: 2, c: 'Manual' }, 'Sierra de Mano': { p: 3, c: 'Corte' },
  'Cuchilla': { p: 3, c: 'Corte' }, 'Cincel': { p: 3, c: 'Corte' },
  'Taladro': { p: 4, c: 'Eléctrico' }, 'Prensa': { p: 5, c: 'Sujeción' }
};

export default function App() {
  // Estados Generales
  const [modo, setModo] = useState('registrar'); // 'registrar' | 'buscar'
  const [img, setImg] = useState(null);
  const [tool, setTool] = useState('');
  const [conf, setConf] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  // Estado Registrar
  const [cant, setCant] = useState(1);
  const [pasillo, setPasillo] = useState(1);
  // Eliminamos el estado 'msg' para evitar el error de setState en useEffect

  // Estado Buscar
  const [searchResult, setSearchResult] = useState(null); 

  // --- SOLUCIÓN DE INGENIERÍA: CÁLCULO DERIVADO (Sin useEffect) ---
  // Calculamos el mensaje del experto directamente en el renderizado.
  let expertMsg = null;
  if (modo === 'registrar' && tool && REGLAS[tool]) {
    const r = REGLAS[tool];
    if (pasillo !== r.p) {
      expertMsg = { t: 'warn', txt: `⚠️ El ${tool} va en Pasillo ${r.p}` };
    } else {
      expertMsg = { t: 'ok', txt: `✅ Ubicación correcta (${r.c})` };
    }
  }

  // --- 1. PROCESAR IMAGEN (IA) ---
  const procesarImagen = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImg(URL.createObjectURL(file));
    setLoading(true);
    setTool('');
    setSearchResult(null);

    const formData = new FormData();
    formData.append('imagen', file);

    try {
      const res = await fetch('https://servicio-ia-herramientas.onrender.com/reconocer', { method: 'POST', body: formData });
      const data = await res.json();
      
      if (data.herramienta) {
        setTool(data.herramienta);
        setConf(data.confianza);
        
        if (modo === 'buscar') {
          buscarEnBD(data.herramienta); 
        } else {
          // Modo Registrar: Sugerir pasillo directamente al detectar
          if (REGLAS[data.herramienta]) setPasillo(REGLAS[data.herramienta].p);
        }
      }
    } catch (err) { alert("Error IA: " + err.message); }
    setLoading(false);
  };

  // --- 2. BUSCAR EN BASE DE DATOS ---
  const buscarEnBD = async (nombre) => {
    try {
      const res = await fetch(`https://backend-inventario-0avx.onrender.com/buscar?nombre=${nombre}`);
      const data = await res.json();
      setSearchResult(data);
    } catch (err) { alert("Error BD: " + err.message); }
  };

  // --- 3. GUARDAR EN BASE DE DATOS ---
  const guardar = async () => {
    if (!tool) return;
    try {
      await fetch('https://backend-inventario-0avx.onrender.com/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herramienta: tool, cantidad: cant, pasillo })
      });
      alert("✅ Guardado exitosamente");
      setImg(null); setTool(''); setCant(1);
    } catch (err) { alert("Error Guardando: " + err.message); }
  };

  return (
    <>
      <style>{'./App.css'}</style>
      <div className="container">
        <header className="header">
          <h1><Package /> Inventario por Reconocimiento</h1>
        </header>

        {/* Pestañas de Navegación */}
        <div className="tabs">
          <button 
            className={`tab ${modo === 'registrar' ? 'active' : ''}`}
            onClick={() => { setModo('registrar'); setImg(null); setTool(''); }}
          >
            <Save size={18} /> Registrar
          </button>
          <button 
            className={`tab ${modo === 'buscar' ? 'active' : ''}`}
            onClick={() => { setModo('buscar'); setImg(null); setTool(''); }}
          >
            <Search size={18} /> Buscar
          </button>
        </div>

        <div className={`card mode-${modo}`}>
          {/* Zona de Cámara */}
          <div className="camera-zone" onClick={() => fileRef.current.click()}>
            {img ? <img src={img} alt="Tool" /> : (
              <div className="placeholder">
                <Camera size={48} />
                <p>{modo === 'registrar' ? 'FOTO PARA REGISTRAR' : 'FOTO PARA BUSCAR'}</p>
              </div>
            )}
            {loading && <div className="loader">Analizando...</div>}
          </div>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={procesarImagen} />

          {/* Resultado Reconocimiento */}
          {tool && (
            <div className="result-header">
              <h2>{tool}</h2>
              <span className="confidence">{(conf * 100).toFixed(0)}% Confianza</span>
            </div>
          )}

          {/* --- UI MODO REGISTRAR --- */}
          {modo === 'registrar' && (
            <div className={`controls ${!tool ? 'disabled' : ''}`}>
              <div className="form-group">
                <label>Cantidad a Ingresar</label>
                <div className="counter">
                  <button onClick={() => setCant(Math.max(1, cant - 1))}>-</button>
                  <span>{cant}</span>
                  <button onClick={() => setCant(cant + 1)}>+</button>
                </div>
              </div>
              <div className="form-group">
                <label>Pasillo</label>
                <div className="grid-pasillos">
                  {[1,2,3,4,5].map(p => (
                    <button key={p} className={pasillo === p ? 'active' : ''} onClick={() => setPasillo(p)}>{p}</button>
                  ))}
                </div>
              </div>
              
              {/* MENSAJE DEL SISTEMA EXPERTO (Calculado sin useEffect) */}
              {expertMsg && (
                <div style={{ 
                  padding: 10, 
                  background: expertMsg.t === 'ok' ? '#dcfce7' : '#ffedd5', 
                  color: expertMsg.t === 'ok' ? '#166534' : '#9a3412', 
                  borderRadius: 8, 
                  marginBottom: 15, 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {expertMsg.t === 'ok' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
                  {expertMsg.txt}
                </div>
              )}

              <button className="btn-main btn-save" onClick={guardar}><Save size={20}/> Guardar Entrada</button>
            </div>
          )}

          {/* --- UI MODO BUSCAR --- */}
          {modo === 'buscar' && tool && searchResult && (
            <div className="search-result">
              {searchResult.encontrado ? (
                <div className="found-card">
                  <div className="found-title">
                    <CheckCircle size={24} /> ENCONTRADO
                  </div>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <span className="stat-label"><Box size={14}/> Stock Total</span>
                      <span className="stat-val">{searchResult.datos.cantidad}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label"><MapPin size={14}/> Ubicación</span>
                      <span className="stat-val">Pasillo {searchResult.datos.pasillo}</span>
                    </div>
                  </div>
                  <p className="last-seen">Último movimiento: {new Date(searchResult.datos.fecha).toLocaleDateString()}</p>
                </div>
              ) : (
                <div className="not-found">
                  <AlertTriangle size={40} style={{ marginBottom: 10 }} />
                  <h3>No disponible</h3>
                  <p>No hay existencias de <strong>{tool}</strong> en el inventario actual.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}