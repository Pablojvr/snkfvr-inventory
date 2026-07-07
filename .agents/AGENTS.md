## Reglas de Compilación
- SIEMPRE que edites archivos de un proyecto (como Angular, Next.js, etc.), es OBLIGATORIO ejecutar el comando de compilación (e.g. `npm run build`) para verificar que no se introdujeron errores de tipeo o de sintaxis antes de dar la tarea por terminada.

## Lineamientos de UI (Diseño Homogéneo)
- **Cabeceras de Pantalla (Sticky Headers)**: Los listados principales deben usar un diseño de cabecera inteligente:
  1. El título principal `<h2>` no se congela (se oculta al hacer scroll mediante `isScrolled`).
  2. El bloque que contiene el buscador y los filtros usa `position: sticky; top: -1.25rem`.
  3. Dentro de la cabecera sticky, existe un título secundario (mini-header) que aparece dinámicamente con una transición (`max-height: 40px`, `opacity: 1`) solo cuando el usuario hace scroll hacia abajo, mostrando el nombre de la sección y la cantidad de registros.
- **Filtros**: Las "píldoras" (chips) o botones de filtro deben incluir siempre el conteo de elementos entre paréntesis, por ejemplo: `Todos (5)`, `Disponibles (2)`. Se usa la paleta de colores de la app (Naranja/Coral primario) para resaltar la opción activa.
- **Reseteo de Paginación**: Al cambiar cualquier filtro (texto, estado, categoría), siempre se debe forzar el regreso a la primera página estableciendo `this.first = 0`.
- **Botones Flotantes (FAB)**: Para las acciones principales de creación (como "Nueva Venta" o "Registrar Gasto"), se prioriza el uso de botones grandes dentro de la cabecera, o FAB redondos en la esquina inferior derecha.
- **Paginador**: El estilo del paginador de PrimeNG en estado activo usa el color corporativo `--primary-color`.
- **Calidad de Marca**: Es OBLIGATORIO hacer revisión de las reglas de marca de calidad al diseño y garantizar que cualquier elemento de UI nuevo o modificado sea coherente visualmente, use la paleta de colores correcta y no tenga defectos visuales (ej. textos invisibles, fondos discordantes o componentes que no sigan el esquema de diseños).
