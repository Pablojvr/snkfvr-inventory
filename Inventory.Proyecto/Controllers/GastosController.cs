using Inventory.Application.DTOs;
using Inventory.Application.UseCases;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GastosController : ControllerBase
    {
        private readonly IRegistrarGastoUseCase _registrarGastoUseCase;
        private readonly IRepositorio<Inventory.Core.Entities.Gasto> _gastoRepositorio;

        public GastosController(IRegistrarGastoUseCase registrarGastoUseCase, IRepositorio<Inventory.Core.Entities.Gasto> gastoRepositorio)
        {
            _registrarGastoUseCase = registrarGastoUseCase;
            _gastoRepositorio = gastoRepositorio;
        }

        [HttpPost]
        public async Task<IActionResult> RegistrarGasto([FromBody] GastoDto gastoDto)
        {
            var resultado = await _registrarGastoUseCase.EjecutarAsync(gastoDto);
            return Ok(resultado);
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerGastos()
        {
            var gastos = await _gastoRepositorio.ObtenerTodosAsync();
            return Ok(gastos);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarGasto(int id)
        {
            await _gastoRepositorio.EliminarAsync(id);
            return Ok(new { message = "Gasto desactivado correctamente." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarGasto(int id, [FromBody] GastoDto gastoDto)
        {
            var useCase = HttpContext.RequestServices.GetService(typeof(IEditarGastoUseCase)) as IEditarGastoUseCase;
            if (useCase != null)
            {
                var resultado = await useCase.EjecutarAsync(id, gastoDto);
                return Ok(resultado);
            }
            return StatusCode(500, "UseCase not found");
        }
    }
}
