using System.Threading.Tasks;
using Inventory.Application.UseCases;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MovimientosController : ControllerBase
    {
        private readonly IObtenerMovimientosUseCase _obtenerMovimientosUseCase;
        private readonly IRepositorio<Inventory.Core.Entities.Movimiento> _movimientoRepositorio;

        public MovimientosController(IObtenerMovimientosUseCase obtenerMovimientosUseCase, IRepositorio<Inventory.Core.Entities.Movimiento> movimientoRepositorio)
        {
            _obtenerMovimientosUseCase = obtenerMovimientosUseCase;
            _movimientoRepositorio = movimientoRepositorio;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerMovimientos()
        {
            var resultado = await _obtenerMovimientosUseCase.EjecutarAsync();
            return Ok(resultado);
        }

        [HttpGet("producto/{productoId}")]
        public async Task<IActionResult> ObtenerMovimientosPorProducto(int productoId)
        {
            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var resultado = System.Linq.Enumerable.OrderByDescending(
                System.Linq.Enumerable.Where(movimientos, m => m.ProductoId == productoId), 
                m => m.Fecha);
            return Ok(resultado);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarMovimiento(int id)
        {
            await _movimientoRepositorio.EliminarAsync(id);
            return Ok(new { message = "Movimiento desactivado correctamente." });
        }
    }
}
