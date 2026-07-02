using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Inventory.Application.DTOs;
using Inventory.Application.UseCases;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IngresosController : ControllerBase
    {
        private readonly IRegistrarIngresoUseCase _registrarIngresoUseCase;
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;

        public IngresosController(IRegistrarIngresoUseCase registrarIngresoUseCase, IRepositorio<Ingreso> ingresoRepositorio)
        {
            _registrarIngresoUseCase = registrarIngresoUseCase;
            _ingresoRepositorio = ingresoRepositorio;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Ingreso>>> GetIngresos()
        {
            var ingresos = await _ingresoRepositorio.ObtenerTodosAsync();
            return Ok(ingresos.Where(i => i.Activo));
        }

        [HttpPost]
        public async Task<ActionResult<Ingreso>> RegistrarIngreso(IngresoDto ingresoDto)
        {
            var ingreso = await _registrarIngresoUseCase.EjecutarAsync(ingresoDto);
            return Ok(ingreso);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> EliminarIngreso(int id)
        {
            var ingreso = await _ingresoRepositorio.ObtenerPorIdAsync(id);
            if (ingreso == null) return NotFound();

            ingreso.Activo = false;
            await _ingresoRepositorio.ActualizarAsync(ingreso);
            return NoContent();
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarIngreso(int id, [FromBody] IngresoDto ingresoDto)
        {
            var useCase = HttpContext.RequestServices.GetService(typeof(IEditarIngresoUseCase)) as IEditarIngresoUseCase;
            if (useCase != null)
            {
                var resultado = await useCase.EjecutarAsync(id, ingresoDto);
                return Ok(resultado);
            }
            return StatusCode(500, "UseCase not found");
        }
    }
}
