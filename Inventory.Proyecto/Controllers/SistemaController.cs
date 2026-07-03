using Inventory.Settings.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SistemaController : ControllerBase
    {
        private readonly InventarioDbContext _context;

        public SistemaController(InventarioDbContext context)
        {
            _context = context;
        }

        [HttpPost("Truncar")]
        public async Task<IActionResult> TruncarBaseDeDatos()
        {
            // CUIDADO: Este método borra TODOS los datos.
            
            // Delete all data in correct order to avoid foreign key constraints
            _context.Movimientos.RemoveRange(await _context.Movimientos.IgnoreQueryFilters().ToListAsync());
            _context.Gastos.RemoveRange(await _context.Gastos.IgnoreQueryFilters().ToListAsync());
            _context.Ventas.RemoveRange(await _context.Ventas.IgnoreQueryFilters().ToListAsync());
            _context.Productos.RemoveRange(await _context.Productos.IgnoreQueryFilters().ToListAsync());
            _context.Ingresos.RemoveRange(await _context.Ingresos.IgnoreQueryFilters().ToListAsync());
            // No eliminamos usuarios porque son necesarios para registrar acciones
            // Solo eliminamos TiposGasto personalizados (no de sistema)
            var tiposPersonalizados = await _context.TiposGasto.IgnoreQueryFilters().Where(t => !t.EsSistema).ToListAsync();
            _context.TiposGasto.RemoveRange(tiposPersonalizados);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Base de datos truncada correctamente." });
        }
    }
}
