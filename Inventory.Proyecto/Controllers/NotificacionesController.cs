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
                    var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                    msg += $"  • *Producto*: {prod?.Descripcion ?? "Producto"}\n" +
                           $"    *Cliente*: {v.NombreComprador ?? "Sin nombre"}{tel}\n" +
                           $"    *Destino*: {v.LugarDestino ?? "Sin destino"}\n\n";
                }
            }
            else
            {
                msg += "  Sin entregas programadas.\n\n";
            }

            // Por cobrar
            var totalPorCobrar = porCobrar.Sum(v => v.PrecioVenta);
            msg += $"💰 *POR COBRAR ({porCobrar.Count}) — Total: ${totalPorCobrar:N2}*\n";
            foreach (var v in porCobrar)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                msg += $"  • *Producto*: {prod?.Descripcion ?? "Producto"}\n" +
                       $"    *Cliente*: {v.NombreComprador ?? "?"}{tel}\n" +
                       $"    *Monto a cobrar*: ${v.PrecioVenta:N2}\n\n";
            }

            // Pendientes
            msg += $"⏳ *PENDIENTES DE ENTREGA ({pendientes.Count})*\n";
            foreach (var v in pendientes)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                var fechaStr = FormatearFechaConDia(v.FechaEntrega);
                var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                msg += $"  • *Producto*: {prod?.Descripcion ?? "Producto"}\n" +
                       $"    *Cliente*: {v.NombreComprador ?? "?"}{tel}\n" +
                       $"    *Destino*: {v.LugarDestino ?? "Sin destino"}\n" +
                       $"    *Programado*: {fechaStr}\n\n";
            }

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

        /// <summary>
        /// Envía el reporte masivo de todo el día de forma manual.
        /// </summary>
        [HttpPost("recordatorio-masivo")]
        public async Task<IActionResult> RecordatorioMasivo()
        {
            // Reutiliza la misma lógica del matutino pero sin requerir clave de cron (podría requerirse JWT en el futuro).
            return await ReporteMatutino(null);
        }

        /// <summary>
        /// Devuelve el texto del reporte masivo para previsualización sin enviarlo.
        /// </summary>
        [HttpGet("preview-masivo")]
        public async Task<IActionResult> PreviewMasivo()
        {
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
                    var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                    msg += $"  • {prod?.Descripcion ?? "Producto"}\n    → {v.NombreComprador ?? "Sin nombre"}{tel} — {v.LugarDestino ?? "Sin destino"}\n\n";
                }
            }
            else
            {
                msg += "  Sin entregas programadas.\n\n";
            }

            // Por cobrar
            var totalPorCobrar = porCobrar.Sum(v => v.PrecioVenta);
            msg += $"💰 *POR COBRAR ({porCobrar.Count}) — Total: ${totalPorCobrar:N2}*\n";
            foreach (var v in porCobrar)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                msg += $"  • {prod?.Descripcion ?? "Producto"}\n    → ${v.PrecioVenta:N2} — {v.NombreComprador ?? "?"}{tel}\n\n";
            }

            // Pendientes
            msg += $"⏳ *PENDIENTES DE ENTREGA ({pendientes.Count})*\n";
            foreach (var v in pendientes)
            {
                var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                var fechaStr = v.FechaEntrega.HasValue ? v.FechaEntrega.Value.ToString("dd/MMM") : "Sin fecha";
                var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                msg += $"  • {prod?.Descripcion ?? "Producto"}\n    → {v.NombreComprador ?? "?"}{tel} [{fechaStr}]\n\n";
            }

            return Ok(new { msg });
        }

        /// <summary>
        /// Envía un recordatorio manual de una entrega/cobro específico.
        /// Si hay teléfono de comprador, se le envía a él. De lo contrario, al dueño.
        /// </summary>
        [HttpPost("recordatorio-individual/{id}")]
        public async Task<IActionResult> RecordatorioIndividual(int id)
        {
            var venta = await _ventaRepo.ObtenerPorIdAsync(id);
            if (venta == null) return NotFound("Venta no encontrada.");

            var producto = await _productoRepo.ObtenerPorIdAsync(venta.ProductoId);
            string descripcion = producto?.Descripcion ?? "Producto";

            string telefonoDestino = _config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
            bool esParaCliente = false;

            if (!string.IsNullOrEmpty(venta.TelefonoComprador))
            {
                // En periodo de test, el destino SIEMPRE es el dueño,
                // pero usamos la plantilla del cliente si existe teléfono.
                esParaCliente = true;
            }

            string msg = "";

            if (venta.Estado == "Reservado")
            {
                var fechaEntregaFmt = FormatearFechaConDia(venta.FechaEntrega);
                var fechaRegistroFmt = FormatearFechaConDia(venta.FechaRegistro);
                
                if (esParaCliente)
                {
                    var cultureEs = new System.Globalization.CultureInfo("es-ES");
                    var diaSemana = venta.FechaEntrega.HasValue ? cultureEs.TextInfo.ToTitleCase(venta.FechaEntrega.Value.ToString("dddd", cultureEs)) : "hoy";
                    
                    msg = $"Hola {venta.NombreComprador ?? "cliente"}, te saludamos de Sneaker Fever Sv. 👟\n\n" +
                          $"Recordar el dia de hoy {diaSemana} debes recibir tu par de zapato *{descripcion}* en el lugar *{venta.LugarDestino ?? "lugar a convenir"}*.\n\n" +
                          $"• Fecha de entrega: {fechaEntregaFmt}\n\n" +
                          $"Gracias por tu preferencia, favor confirmar al recoger por este medio.";
                }
                else
                {
                    msg = $"🔔 *RECORDATORIO DE ENTREGA*\nProducto: {descripcion}\nCliente: {venta.NombreComprador ?? "Sin nombre"}\nLugar: {venta.LugarDestino ?? "N/A"}\nRegistro: {fechaRegistroFmt}\nEntrega: {fechaEntregaFmt}";
                }
            }
            else if (venta.Estado == "Vendido" && (venta.EstadoPago == "Pendiente" || string.IsNullOrEmpty(venta.EstadoPago)))
            {
                // El cobro siempre es para el dueño con los detalles
                esParaCliente = false;
                telefonoDestino = _config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
                
                var fechaEntregaFmt = FormatearFechaConDia(venta.FechaEntrega);
                var fechaRegistroFmt = FormatearFechaConDia(venta.FechaRegistro);
                
                msg = $"🧾 *DETALLE DE COBRO*\n" +
                      $"• Producto: {descripcion}\n" +
                      $"• Cliente: {venta.NombreComprador ?? "Sin nombre"}\n" +
                      $"• Teléfono: {venta.TelefonoComprador ?? "No registrado"}\n" +
                      $"• Lugar/Agencia: {venta.LugarDestino ?? "No registrado"}\n" +
                      $"• Fecha registro: {fechaRegistroFmt}\n" +
                      $"• Fecha entrega: {fechaEntregaFmt}\n" +
                      $"• Total a cobrar: *${venta.PrecioVenta:N2}*";
            }
            else
            {
                return BadRequest("La venta no está en estado pendiente de entrega o cobro.");
            }

            var enviado = await _whatsAppService.EnviarMensajeAsync(telefonoDestino, msg);
            return Ok(new { enviado, destino = esParaCliente ? "Cliente" : "Dueño", telefono = telefonoDestino });
        }

        private string FormatearFechaConDia(DateTime? fecha)
        {
            if (!fecha.HasValue) return "Sin fecha";
            var cultureEs = new System.Globalization.CultureInfo("es-ES");
            return cultureEs.TextInfo.ToTitleCase(fecha.Value.ToString("dddd dd/MMM/yyyy", cultureEs));
        }
    }
}
