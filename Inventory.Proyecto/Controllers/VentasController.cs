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
        public async Task<IActionResult> EliminarVenta(int id)
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
