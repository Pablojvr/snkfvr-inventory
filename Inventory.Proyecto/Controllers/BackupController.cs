using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Inventory.Settings.Data;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BackupController : ControllerBase
    {
        private readonly InventarioDbContext _context;

        public BackupController(InventarioDbContext context)
        {
            _context = context;
        }

        [HttpGet("export")]
        public async Task<IActionResult> ExportAll()
        {
            var data = new
            {
                Usuarios = await _context.Usuarios.ToListAsync(),
                TiposGasto = await _context.TiposGasto.ToListAsync(),
                Productos = await _context.Productos.ToListAsync(),
                Gastos = await _context.Gastos.ToListAsync(),
                Ventas = await _context.Ventas.ToListAsync(),
                Movimientos = await _context.Movimientos.ToListAsync(),
                Ingresos = await _context.Ingresos.ToListAsync()
            };

            return Ok(data);
        }
    }
}
