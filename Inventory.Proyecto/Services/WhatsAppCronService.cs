using Inventory.Application.Services;
using Inventory.Core.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Services
{
    public class WhatsAppCronService : BackgroundService
    {
        private readonly ILogger<WhatsAppCronService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public WhatsAppCronService(ILogger<WhatsAppCronService> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("WhatsAppCronService iniciado.");

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow.AddHours(-6); // UTC-6 para El Salvador
                
                // Programar reporte matutino a las 7:00 AM
                var morningTime = new DateTime(now.Year, now.Month, now.Day, 7, 0, 0);
                if (now > morningTime) morningTime = morningTime.AddDays(1);
                
                var delay = morningTime - now;
                _logger.LogInformation("Próximo reporte matutino en {DelayHours} horas y {DelayMinutes} minutos.", delay.Hours, delay.Minutes);
                
                await Task.Delay(delay, stoppingToken);
                
                if (!stoppingToken.IsCancellationRequested)
                {
                    await EnviarReporteMatutinoAsync();
                }
            }
        }

        private async Task EnviarReporteMatutinoAsync()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var whatsAppService = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();
                var ventaRepo = scope.ServiceProvider.GetRequiredService<IRepositorio<Inventory.Core.Entities.Venta>>();
                var productoRepo = scope.ServiceProvider.GetRequiredService<IRepositorio<Inventory.Core.Entities.Producto>>();
                var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

                var telefonoDueno = config["Notificaciones:TelefonoDueno"] ?? "+50376539597";
                var ventas = await ventaRepo.ObtenerTodosAsync();
                var productos = await productoRepo.ObtenerTodosAsync();

                var hoy = DateTime.UtcNow.AddHours(-6).Date;

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

                var msg = $"🌞 *REPORTE MATUTINO SNKFVR*\n📅 {hoy:dd/MMM/yyyy}\n\n";

                // Entregas del día
                msg += $"📦 *ENTREGAS HOY ({entregasHoy.Count}):*\n";
                if (entregasHoy.Any())
                {
                    foreach (var v in entregasHoy)
                    {
                        var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                        var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                        msg += $"  ✅ {prod?.Descripcion ?? "Producto"}\n    ➡️ {v.NombreComprador ?? "Sin nombre"}{tel} ({v.LugarDestino ?? "Sin destino"})\n\n";
                    }
                }
                else
                {
                    msg += "  Sin entregas programadas.\n\n";
                }

                // Por cobrar
                var totalPorCobrar = porCobrar.Sum(v => v.PrecioVenta);
                msg += $"💰 *POR COBRAR ({porCobrar.Count}) 👉 Total: ${totalPorCobrar:N2}*\n";
                foreach (var v in porCobrar)
                {
                    var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                    var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                    msg += $"  💵 {prod?.Descripcion ?? "Producto"}\n    ➡️ ${v.PrecioVenta:N2} - {v.NombreComprador ?? "?"}{tel}\n\n";
                }

                // Pendientes
                msg += $"⏳ *PENDIENTES DE ENTREGA ({pendientes.Count})*\n";
                foreach (var v in pendientes)
                {
                    var prod = productos.FirstOrDefault(p => p.Id == v.ProductoId);
                    var fechaStr = v.FechaEntrega.HasValue ? v.FechaEntrega.Value.ToString("dd/MMM") : "Sin fecha";
                    var tel = !string.IsNullOrEmpty(v.TelefonoComprador) ? $" ({v.TelefonoComprador})" : "";
                    msg += $"  🕒 {prod?.Descripcion ?? "Producto"}\n    ➡️ {v.NombreComprador ?? "?"}{tel} [{fechaStr}]\n\n";
                }

                await whatsAppService.EnviarMensajeAsync(telefonoDueno, msg);
                _logger.LogInformation("Reporte matutino enviado exitosamente al {Telefono}.", telefonoDueno);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al enviar el reporte matutino por WhatsApp.");
            }
        }
    }
}
