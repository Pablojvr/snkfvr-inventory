# Contexto y Funcionalidad del Sistema (Inventory Manager)

## 1. Propósito de la Aplicación
El sistema "Inventory Manager" (SNKFVR) es una solución integral y de alto rendimiento diseñada para la gestión, control y trazabilidad de inventarios. Se compone de un ecosistema multiplataforma que conecta operaciones logísticas de campo (escáner) con una gestión administrativa robusta (web) respaldada por una API centralizada. 

## 2. Ecosistema de Módulos (Arquitectura General)
- **Backend / API (C# .NET):** Capa central lógica dividida en `Inventory.Core`, `Inventory.Application`, `Inventory.Settings` y `Inventory.Proyecto`. Base de datos administrada vía `init-db.sql`.
- **Frontend Web (`/inventory-web`):** Panel de control administrativo y visualización de datos (Dashboard) bajo el estándar visual Vanguardia 2026.
- **Mobile / Scanner (`/label-scanner-app`):** Interfaz táctil de alta velocidad para operarios. Optimizada para lectura de etiquetas y actualización en tiempo real.

## 3. Flujos Principales del Usuario
1. **Flujo de Recepción/Ingreso (Scanner):** El usuario escanea una etiqueta física -> El sistema predice y autocompleta los datos -> Confirmación rápida con _feedback_ háptico y visual -> Sincronización inmediata.
2. **Flujo Administrativo (Web):** El supervisor accede al _Dashboard_ -> Visualiza métricas de stock y alertas de reposición -> Gestiona permisos y configuraciones globales.
3. **Flujo de Trazabilidad (Core):** Registro inmutable de cada movimiento de inventario, garantizando que el estado global sea consistente a través de todas las plataformas.

## 4. Mapa de Navegación General (Web)
- `/` (Dashboard / Overview)
- `/inventory` (Listado y Búsqueda Maestra)
- `/movements` (Historial de Entradas y Salidas)
- `/settings` (Configuración del Sistema)
