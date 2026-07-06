# Sistema de Diseño: Estándar Vanguardia 2026

## 1. Filosofía Estética ('Liquid Depth')
El diseño se basa en la fluidez, la profundidad espacial sutil y una retroalimentación visual inmediata (UX predictivo). No existen interfaces planas aburridas ni hiperrealismo recargado. El enfoque es limpio, inmersivo y altamente responsivo.

## 2. Design Tokens (Fuente Única de Verdad Visual)
**Queda estrictamente prohibido usar valores quemados (hardcoded) en CSS/estilos.** Todo valor provendrá de variables globales:

- **Paleta de Colores (Marca):**
  - `--color-bg-base`: Fondos limpios y blancos puros (`#ffffff` y variaciones suaves `#f8fafc`).
  - `--color-surface`: Superficies blancas para tarjetas con bordes muy tenues (`#f1f5f9`).
  - `--color-accent-primary`: Coral-Rojo vibrante (`#FF4757`) - Usado para CTA principales, íconos activos y navegación.
  - `--color-accent-secondary`: Tonos salmón o gradientes suaves (ej. `linear-gradient(135deg, #FF4757, #ff7a85)`) para destacar tarjetas o bloques importantes.
  - `--color-text-primary`: Gris pizarra muy oscuro o negro para máxima legibilidad (`#1e293b`).
  - `--color-text-muted`: Gris medio para jerarquía visual secundaria (`#64748b`).

- **Tipografía (Fluida y Moderna):**
  - `--font-family-sans`: Familia tipográfica `Inter` (importada de Google Fonts) como estándar absoluto del proyecto para transmitir limpieza y modernidad.
  - Títulos extra pesados (`font-weight: 800`) para cabeceras prominentes y tarjetas de datos.

- **Morfología y Profundidad:**
  - `--radius-master`: Esquinas altamente redondeadas de `20px` (`border-radius: 20px`) aplicadas en TODA la UI: tarjetas, botones, modales, e inputs de texto. Esto provee una sensación táctil amigable.
  - `--shadow-floating`: Sombras suaves (ej. `box-shadow: 0 10px 30px rgba(255, 71, 87, 0.3)`) para elevar botones de acción y tarjetas destacadas.
  - `--glass-blur`: Efecto `backdrop-filter: blur(5px)` para elementos semi-transparentes superpuestos (como etiquetas dentro de tarjetas destacadas).

## 3. Micro-interacciones
Toda acción del usuario (hover, click, focus) debe tener una transición suave definida por `--transition-standard` (ej. `0.25s ease-in-out`). El diseño debe sentirse "vivo".
