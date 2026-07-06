# Estándares de Código y Estructura

## 1. Regla de Oro: Principio DRY (Don't Repeat Yourself)
La duplicación de código es inaceptable. Antes de crear cualquier vista o bloque lógico, el desarrollador (o el Lead Architect) debe auditar el ecosistema para:
- Extraer lógica repetida en _Hooks_ personalizados o servicios.
- Abstraer estructuras visuales repetidas en **Componentes Primitivos**.

## 2. Arquitectura de Componentes (Atomic Design modificado)
- **Primitivos (Atoms):** Botones, Inputs, Badges, Tooltips. Se alimentan estrictamente de los Design Tokens.
- **Modulares (Molecules/Organisms):** Formularios, Tablas de datos, Tarjetas de inventario. Son composiciones de primitivos. Carecen de lógica de negocio profunda; reciben datos por *props*.
- **Vistas (Pages):** Orquestadores. Manejan el estado, la conexión con la API y pasan datos a los modulares.

## 3. Reglas de Refactorización y Commits
- Cada modificación debe pasar por el escrutinio de los roles simulados: *Lead Architect* (estructura), *UI/UX Master* (experiencia) y *QA Auditor* (rendimiento y accesibilidad).
- Se priorizará el rendimiento extremo (HMR activo, fps estables sin re-renderizados innecesarios).
- Las interfaces deben ser 100% accesibles (cumplimiento WCAG, contraste adecuado, navegación por teclado y soporte para lectores de pantalla).

## 4. Control de Calidad Post-Compilación
Ningún código se da por terminado sin una compilación exitosa y el inicio del servidor de desarrollo para una validación visual e interactiva del entorno.
