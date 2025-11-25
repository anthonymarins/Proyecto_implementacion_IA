import os
import json
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

# Importar las piezas para construir el cerebro
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE RUTAS ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Asegúrate de que tu archivo de pesos se llame así en la carpeta
WEIGHTS_PATH = os.path.join(BASE_DIR, 'pesos_herramientas.weights.h5') 
JSON_PATH = os.path.join(BASE_DIR, 'clases_herramientas_traductor.json')

# Variables globales
model = None
nombres_clases = {}

# --- FUNCIÓN PARA RECONSTRUIR EL MODELO (Igual que en Colab) ---
def construir_modelo_sequential(num_clases):
    print("🏗️ Reconstruyendo arquitectura Sequential...")
    
    # 1. Base MobileNetV2 (Cerebro pre-entrenado)
    base_model = MobileNetV2(weights=None, include_top=False, input_shape=(128, 128, 3))
    
    # 2. Estructura exacta usada en el entrenamiento
    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(num_clases, activation='softmax')
    ])
    
    # 3. CONSTRUIR (Vital para inicializar las capas antes de cargar pesos)
    model.build((None, 128, 128, 3))
    
    return model

print("⏳ Inicializando servicio de IA...")

try:
    # 1. Cargar el Diccionario de Clases
    with open(JSON_PATH, 'r') as f:
        indices = json.load(f)
        nombres_clases = {v: k for k, v in indices.items()}
    
    num_clases = len(nombres_clases)
    print(f"✅ Diccionario cargado ({num_clases} clases detectadas).")

    # 2. Construir el esqueleto vacío del modelo
    model = construir_modelo_sequential(num_clases)

    # 3. Inyectar la memoria (Los pesos)
    print(f"📥 Cargando pesos desde: {WEIGHTS_PATH}")
    model.load_weights(WEIGHTS_PATH)
    print("✅ ¡Cerebro activado correctamente!")

except Exception as e:
    print(f"\n❌ ERROR CRÍTICO AL INICIAR: {e}")
    print("Verifica que 'pesos_herramientas.weights.h5' y 'clases_herramientas.json' existan.")

# Diccionario de Traducción (Inglés -> Español)
TRADUCCION = {
    'Hammer': 'Martillo', 'Wrench': 'Llave Inglesa', 'Pliers': 'Alicates',
    'Screwdriver': 'Destornillador', 'Hand Saw': 'Sierra de Mano', 
    'Electric Drill': 'Taladro', 'Utility Knife': 'Cuchilla',
    'Chisel': 'Cincel', 'Mallet': 'Mazo', 'Clamp': 'Prensa'
}

@app.route('/reconocer', methods=['POST'])
def reconocer():
    # Validaciones básicas
    if not model: return jsonify({'error': 'Modelo no cargado'}), 500
    if 'imagen' not in request.files: return jsonify({'error': 'Falta imagen'}), 400

    try:
        file = request.files['imagen']
        
        # Preprocesamiento de la imagen
        img = Image.open(file.stream).convert('RGB').resize((128, 128))
        x = np.array(img) / 255.0 # Normalizar a 0-1
        x = np.expand_dims(x, axis=0) # Crear lote de 1 imagen

        # Predicción
        pred = model.predict(x)
        indice = np.argmax(pred[0])
        confianza = float(np.max(pred[0]))
        
        # Obtener nombre en inglés
        nombre_ingles = nombres_clases.get(indice, "Desconocido")
        
        # Traducir al español
        nombre_espanol = nombre_ingles
        for k, v in TRADUCCION.items():
            if k in nombre_ingles:
                nombre_espanol = v
                break
        
        # Limpieza si no hubo traducción
        if nombre_espanol == nombre_ingles:
            nombre_espanol = nombre_ingles.replace("AI Dataset", "").replace("Collection", "").strip()

        return jsonify({'herramienta': nombre_espanol, 'confianza': confianza})

    except Exception as e:
        print(f"Error en predicción: {e}")
        return jsonify({'error': str(e)}), 500

# --- RUTA DE SALUD (IMPORTANTE PARA RENDER) ---
@app.route('/', methods=['GET'])
def home():
    return "<h1>✅ Servicio de IA Activo</h1>", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)