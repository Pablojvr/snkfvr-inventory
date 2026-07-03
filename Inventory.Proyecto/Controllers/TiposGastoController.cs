using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TiposGastoController : ControllerBase
    {
        private readonly IRepositorio<TipoGasto> _tipoGastoRepositorio;
        private readonly IRepositorio<Gasto> _gastoRepositorio;

        public TiposGastoController(IRepositorio<TipoGasto> tipoGastoRepositorio, IRepositorio<Gasto> gastoRepositorio)
        {
            _tipoGastoRepositorio = tipoGastoRepositorio;
            _gastoRepositorio = gastoRepositorio;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerTipos()
        {
            var tipos = await _tipoGastoRepositorio.ObtenerTodosAsync();
            return Ok(tipos);
        }

        [HttpPost]
        public async Task<IActionResult> CrearTipo([FromBody] TipoGasto tipo)
        {
            tipo.EsSistema = false;
            tipo.Activo = true;
            var resultado = await _tipoGastoRepositorio.AgregarAsync(tipo);
            return Ok(resultado);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarTipo(int id, [FromBody] TipoGasto tipoDto)
        {
            var tipo = await _tipoGastoRepositorio.ObtenerPorIdAsync(id);
            if (tipo == null) return NotFound(new { message = "Tipo no encontrado" });

            tipo.Nombre = tipoDto.Nombre;
            await _tipoGastoRepositorio.ActualizarAsync(tipo);
            return Ok(tipo);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarTipo(int id)
        {
            var tipo = await _tipoGastoRepositorio.ObtenerPorIdAsync(id);
            if (tipo == null) return NotFound(new { message = "Tipo no encontrado" });

            if (tipo.EsSistema)
                return BadRequest(new { message = "No se puede eliminar un tipo de sistema." });

            await _tipoGastoRepositorio.EliminarAsync(id);
            return Ok(new { message = "Tipo eliminado (desactivado) correctamente." });
        }
    }
}
