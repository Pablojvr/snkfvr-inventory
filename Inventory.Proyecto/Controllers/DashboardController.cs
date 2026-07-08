using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IRepositorio<Venta> _ventaRepositorio;
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;
        private readonly IRepositorio<Gasto> _gastoRepositorio;

        public DashboardController(
            IRepositorio<Venta> ventaRepositorio,
            IRepositorio<Ingreso> ingresoRepositorio,
            IRepositorio<Gasto> gastoRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _ingresoRepositorio = ingresoRepositorio;
            _gastoRepositorio = gastoRepositorio;
        }

        [HttpGet("balance")]
        public async Task<ActionResult<object>> GetBalance()
        {
            var ventas = await _ventaRepositorio.ObtenerTodosAsync();
            var ingresos = await _ingresoRepositorio.ObtenerTodosAsync();
            var gastos = await _gastoRepositorio.ObtenerTodosAsync();

            var totalVentas = ventas.Where(v => v.Activo && v.EstadoPago == "Cobrado").Sum(v => v.PrecioVenta);
            var totalIngresos = ingresos.Where(i => i.Activo).Sum(i => i.Monto);
            var totalGastos = gastos.Where(g => g.Activo).Sum(g => g.Monto);

            var balanceTotal = (totalVentas + totalIngresos) - totalGastos;

            return Ok(new {
                Balance = balanceTotal,
                TotalVentas = totalVentas,
                TotalIngresos = totalIngresos,
                TotalGastos = totalGastos
            });
        }
    }
}
