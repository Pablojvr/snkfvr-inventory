using Inventory.Application.Services;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificacionesController : ControllerBase
    {
        private readonly IWhatsAppService _whatsAppService;
        private readonly IRepositorio<Inventory.Core.Entities.Venta> _ventaRepo;
        private readonly IRepositorio<Inventory.Core.Entities.Producto> _productoRepo;
        private readonly IConfiguration _config;

        public NotificacionesController(
            IWhatsAppService whatsAppService,
            IRepositorio<Inventory.Core.Entities.Venta> ventaRepo,
            IRepositorio<Inventory.Core.Entities.Producto> productoRepo,
            IConfiguration config)
        {
            _whatsAppService = whatsAppService;
            _ventaRepo = ventaRepo;
            _productoRepo = productoRepo;
            _config = config;
        }

        /// <summary>
        /// Endpoint que envía el reporte matutino al dueño.
        /// Diseñado para ser invocado por un cron externo (cron-job.org) a las 7:00 AM CST.
        /// </summary>
        [HttpPost("reporte-matutino")]
        public async Task<IActionResult> ReporteMatutino([FromQuery] string? key)
        {
            var cronKey = _config["Notificaciones:CronKey"];
            if (!string.IsNullOrEmpty(cronKey) && key != cronKey)
                return Unauthorized("Clave de cron inválida.");

            var telefonoDueno = _config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
            var ventas = await _ventaRepo.ObtenerTodosAsync();
            var productos = await _productoRepo.ObtenerTodosAsync();

            var hoy = DateTime.Now.Date;

            // Entregas de hoy
            var entregasHoy = ventas
                .Where(v => v.Estado == "Reservado" && v.FechaEntrega.HasValue && v.FechaEntrega.Value.Date == hoy)
                .ToList();

            // Ventas por cobrar
            var porCobrar = ventas
                .Where(v => v.Estado == "Vendido" && (v.EstadoPago == "Pendiente" || string.IsNullOrEmpty(v.EstadoPago)))
                .ToList();

            // Ventas pendientes de entrega (Reservadas)
            var pendientes = ventas
                .Where(v => v.Estado == "Reservado")
                .ToList();

            var msg = $"📋 *REPORTE MATUTINO SNKFVR*\n📅 {hoy:dd/MMM/yyyy}\n\n";

            // Entregas del día
            msg += $"📦 *ENTREGAS HOY ({entregasHoy.Count}):*\n";
            if (entregasHoy.Any())
            {
                foreach (var v in entregasHoy)
                {
                    var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                    msg += $"  • {prod?.Descripcion ?? "Producto"} → {v.NombreComprador ?? "Sin nombre"} ({v.LugarDestino ?? "Sin destino"})\n";
                }
            }
            else
            {
                msg += "  Sin entregas programadas.\n";
            }

            // Por cobrar
            var totalPorCobrar = porCobrar.Sum(v => v.PrecioVenta);
            msg += $"\n💰 *POR COBRAR ({porCobrar.Count}) — Total: ${totalPorCobrar:N2}*\n";
            foreach (var v in porCobrar.Take(5))
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                msg += $"  • {prod?.Descripcion ?? "Producto"} — ${v.PrecioVenta:N2} ({v.NombreComprador ?? "?"})\n";
            }
            if (porCobrar.Count > 5) msg += $"  ...y {porCobrar.Count - 5} más.\n";

            // Pendientes
            msg += $"\n⏳ *PENDIENTES DE ENTREGA ({pendientes.Count})*\n";
            foreach (var v in pendientes.Take(5))
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                var fechaStr = v.FechaEntrega.HasValue ? v.FechaEntrega.Value.ToString("dd/MMM") : "Sin fecha";
                msg += $"  • {prod?.Descripcion ?? "Producto"} → {v.NombreComprador ?? "?"} ({fechaStr})\n";
            }
            if (pendientes.Count > 5) msg += $"  ...y {pendientes.Count - 5} más.\n";

            var enviado = await _whatsAppService.EnviarMensajeAsync(telefonoDueno, msg);

            return Ok(new { enviado, entregasHoy = entregasHoy.Count, porCobrar = porCobrar.Count, pendientes = pendientes.Count });
        }

        /// <summary>
        /// Endpoint de follow-up de cierre de día.
        /// Diseñado para ser invocado a las 5:00 PM CST.
        /// </summary>
        [HttpPost("cierre-dia")]
        public async Task<IActionResult> CierreDia([FromQuery] string? key)
        {
            var cronKey = _config["Notificaciones:CronKey"];
            if (!string.IsNullOrEmpty(cronKey) && key != cronKey)
                return Unauthorized("Clave de cron inválida.");

            var telefonoDueno = _config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
            var ventas = await _ventaRepo.ObtenerTodosAsync();
            var productos = await _productoRepo.ObtenerTodosAsync();

            var hoy = DateTime.Now.Date;

            var entregasHoy = ventas
                .Where(v => v.FechaEntrega.HasValue && v.FechaEntrega.Value.Date == hoy)
                .ToList();

            var entregadas = entregasHoy.Where(v => v.Estado == "Vendido").ToList();
            var noEntregadas = entregasHoy.Where(v => v.Estado == "Reservado").ToList();

            var msg = $"🌙 *CIERRE DEL DÍA SNKFVR*\n📅 {hoy:dd/MMM/yyyy}\n\n";
            msg += $"✅ *Entregadas hoy: {entregadas.Count}*\n";
            foreach (var v in entregadas)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                msg += $"  • {prod?.Descripcion ?? "Producto"} → {v.NombreComprador ?? "?"}\n";
            }

            msg += $"\n❌ *No entregadas (programadas hoy): {noEntregadas.Count}*\n";
            foreach (var v in noEntregadas)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                msg += $"  • {prod?.Descripcion ?? "Producto"} → {v.NombreComprador ?? "?"}\n";
            }

            if (!entregasHoy.Any())
            {
                msg += "  No había entregas programadas hoy.\n";
            }

            var enviado = await _whatsAppService.EnviarMensajeAsync(telefonoDueno, msg);

            return Ok(new { enviado, entregadas = entregadas.Count, noEntregadas = noEntregadas.Count });
        }

        /// <summary>
        /// Health check para verificar que el servicio de notificaciones funciona.
        /// </summary>
        [HttpPost("test")]
        public async Task<IActionResult> Test([FromQuery] string? key)
        {
            var cronKey = _config["Notificaciones:CronKey"];
            if (!string.IsNullOrEmpty(cronKey) && key != cronKey)
                return Unauthorized("Clave de cron inválida.");

            var telefonoDueno = _config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
            var enviado = await _whatsAppService.EnviarMensajeAsync(telefonoDueno, "✅ SNKFVR Notificaciones activas. Conexión exitosa.");
            return Ok(new { enviado });
        }
    }
}
