using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Inventory.Settings.Data;
using Inventory.Core.Entities;
using System.Linq;
using System.Threading.Tasks;
using System;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SystemController : ControllerBase
    {
        private readonly InventarioDbContext _context;

        public SystemController(InventarioDbContext context)
        {
            _context = context;
        }

        [HttpPost("CleanDatabase")]
        public async Task<IActionResult> CleanDatabase()
        {
            try
            {
                // Limpiar la base de datos de manera segura mediante EF / SQL Raw
                await _context.Database.ExecuteSqlRawAsync("TRUNCATE TABLE \"Ventas\", \"Gastos\", \"Productos\", \"Usuarios\", \"Movimientos\", \"Ingresos\" RESTART IDENTITY CASCADE;");
                
                // Sembrar los usuarios predeterminados
                if (!_context.Usuarios.Any())
                {
                    _context.Usuarios.AddRange(
                        new Usuario { Nombre = "Javier" },
                        new Usuario { Nombre = "Fabri" },
                        new Usuario { Nombre = "Alesito" }
                    );
                    await _context.SaveChangesAsync();
                }

                return Ok(new { message = "Base de datos limpiada correctamente. Usuarios por defecto restaurados." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al limpiar la base de datos.", error = ex.Message });
            }
        }
    }
}
