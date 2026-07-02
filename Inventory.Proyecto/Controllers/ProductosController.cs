using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using Inventory.Application.UseCases;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductosController : ControllerBase
    {
        private readonly IRepositorio<Producto> _productoRepositorio;
        private readonly IRegistrarProductoUseCase _registrarProductoUseCase;

        public ProductosController(IRepositorio<Producto> productoRepositorio, IRegistrarProductoUseCase registrarProductoUseCase)
        {
            _productoRepositorio = productoRepositorio;
            _registrarProductoUseCase = registrarProductoUseCase;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerProductos()
        {
            var productos = await _productoRepositorio.ObtenerTodosAsync();
            return Ok(productos);
        }

        [HttpPost]
        public async Task<IActionResult> CrearProducto([FromBody] Producto producto)
        {
            var productoAgregado = await _registrarProductoUseCase.EjecutarAsync(producto);
            return Ok(productoAgregado);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarProducto(int id)
        {
            await _productoRepositorio.EliminarAsync(id);
            return Ok(new { message = "Producto desactivado correctamente." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarProducto(int id, [FromBody] Producto producto)
        {
            var useCase = HttpContext.RequestServices.GetService(typeof(IEditarProductoUseCase)) as IEditarProductoUseCase;
            if (useCase != null)
            {
                var resultado = await useCase.EjecutarAsync(id, producto);
                return Ok(resultado);
            }
            return StatusCode(500, "UseCase not found");
        }
    }
}
