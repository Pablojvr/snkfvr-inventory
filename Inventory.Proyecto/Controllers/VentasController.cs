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
