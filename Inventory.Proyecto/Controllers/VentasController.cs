using Inventory.Application.DTOs;
using Inventory.Application.UseCases;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VentasController : ControllerBase
    {
        private readonly IRegistrarVentaUseCase _registrarVentaUseCase;
        private readonly IRepositorio<Inventory.Core.Entities.Venta> _ventaRepositorio;

        public VentasController(IRegistrarVentaUseCase registrarVentaUseCase, IRepositorio<Inventory.Core.Entities.Venta> ventaRepositorio)
        {
            _registrarVentaUseCase = registrarVentaUseCase;
            _ventaRepositorio = ventaRepositorio;
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarVenta([FromBody] VentaDto ventaDto)
        {
            var resultado = await _registrarVentaUseCase.EjecutarAsync(ventaDto);
            return Ok(resultado);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerVentas()
        {
            var ventas = await _ventaRepositorio.ObtenerTodosAsync();
            return Ok(ventas);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarVenta(int id, [FromQuery] decimal? montoDevolucion = 0)
        {
            var venta = await _ventaRepositorio.ObtenerPorIdAsync(id);
            if (venta != null)
            {
                var prodRepo = HttpContext.RequestServices.GetService(typeof(IRepositorio<Inventory.Core.Entities.Producto>)) as IRepositorio<Inventory.Core.Entities.Producto>;
                var movRepo = HttpContext.RequestServices.GetService(typeof(IRepositorio<Inventory.Core.Entities.Movimiento>)) as IRepositorio<Inventory.Core.Entities.Movimiento>;

                if (prodRepo != null && movRepo != null)
                {
                    var producto = await prodRepo.ObtenerPorIdAsync(venta.ProductoId);
                    if (producto != null)
                    {
                        producto.Estado = "Disponible";
                        await prodRepo.ActualizarAsync(producto);

                        var movimientoEstado = new Inventory.Core.Entities.Movimiento
                        {
                            Tipo = "Cambio de Estado",
                            Fecha = DateTime.Now,
                            Descripcion = $"El producto {venta.ProductoId} cambió a Disponible tras anular venta",
                            MontoTotal = 0,
                            ReferenciaId = venta.Id,
                            ProductoId = venta.ProductoId
                        };
                        await movRepo.AgregarAsync(movimientoEstado);
                    }

                    // Anular movimientos originales de la venta SÓLO si no involucran dinero real histórico.
                    // Si involucran dinero, los dejamos activos para no borrar el historial de caja.
                    var movimientosAsociados = (await movRepo.ObtenerTodosAsync())
                        .Where(m => m.ReferenciaId == venta.Id && m.ProductoId == venta.ProductoId)
                        .ToList();
                    
                    foreach(var mov in movimientosAsociados)
                    {
                        if (mov.Tipo == "Cambio de Estado" || mov.Tipo == "Reserva" || mov.MontoTotal == 0)
                        {
                            mov.Activo = false;
                            await movRepo.ActualizarAsync(mov);
                        }
                    }

                    // Crear movimiento de devolución si aplica
                    if (montoDevolucion.HasValue && montoDevolucion.Value > 0)
                    {
                        var devolucion = new Inventory.Core.Entities.Movimiento
                        {
                            Tipo = "Salida de Dinero",
                            Fecha = DateTime.Now,
                            Descripcion = $"Devolución parcial/total por anulación de reserva/venta de producto {venta.ProductoId}",
                            MontoTotal = -montoDevolucion.Value, // Negativo para salir
                            ReferenciaId = venta.Id,
                            ProductoId = venta.ProductoId
                        };
                        await movRepo.AgregarAsync(devolucion);
                    }
                }

                var gastoRepo = HttpContext.RequestServices.GetService(typeof(IRepositorio<Inventory.Core.Entities.Gasto>)) as IRepositorio<Inventory.Core.Entities.Gasto>;
                if (gastoRepo != null)
                {
                    var gastos = await gastoRepo.ObtenerTodosAsync();
                    var gastosAsociados = gastos.Where(g => g.ProductoId == venta.ProductoId && g.Activo).ToList();
                    foreach (var g in gastosAsociados)
                    {
                        g.ProductoId = null;
                        g.Motivo = "Pérdida por venta anulada - " + g.Motivo;
                        await gastoRepo.ActualizarAsync(g);
                    }
                }

                var ingresoRepo = HttpContext.RequestServices.GetService(typeof(IRepositorio<Inventory.Core.Entities.Ingreso>)) as IRepositorio<Inventory.Core.Entities.Ingreso>;
                if (ingresoRepo != null && prodRepo != null)
                {
                    var ingresos = await ingresoRepo.ObtenerTodosAsync();
                    var producto = await prodRepo.ObtenerPorIdAsync(venta.ProductoId);
                    var descripcionProd = producto?.Descripcion ?? venta.ProductoId.ToString();
                    var gananciaAsociada = ingresos.FirstOrDefault(i => i.Motivo.StartsWith("Ganancia Venta | " + descripcionProd) && i.UsuarioId == venta.UsuarioId && i.Activo);
                    if (gananciaAsociada != null)
                    {
                        gananciaAsociada.Activo = false;
                        await ingresoRepo.ActualizarAsync(gananciaAsociada);
                    }
                }
            }

            await _ventaRepositorio.EliminarAsync(id);
            return Ok(new { message = "Venta desactivada correctamente." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarVenta(int id, [FromBody] VentaDto ventaDto)
        {
            var useCase = HttpContext.RequestServices.GetService(typeof(IEditarVentaUseCase)) as IEditarVentaUseCase;
            if (useCase != null)
            {
                var resultado = await useCase.EjecutarAsync(id, ventaDto);
                return Ok(resultado);
            }
            return StatusCode(500, "UseCase not found");
        }
    }
}
