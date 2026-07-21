using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Middleware
{
    public class ApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private const string APIKEYNAME = "X-Api-Key";

        public ApiKeyMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Omitir peticiones OPTIONS (CORS preflight)
            if (context.Request.Method.Equals("OPTIONS", System.StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            // Validar existencia del header
            if (!context.Request.Headers.TryGetValue(APIKEYNAME, out var extractedApiKey))
            {
                context.Response.StatusCode = 401; // Unauthorized
                await context.Response.WriteAsync("API Key was not provided. (Falta clave de acceso)");
                return;
            }

            var appSettings = context.RequestServices.GetRequiredService<IConfiguration>();
            var apiKey = appSettings.GetValue<string>("ApiKey");

            if (string.IsNullOrEmpty(apiKey))
            {
                // Si por algún motivo no hay ApiKey en el servidor, dejamos pasar o bloqueamos.
                // Es mejor bloquear para evitar vulnerabilidades por mala configuración.
                context.Response.StatusCode = 500;
                await context.Response.WriteAsync("Server is missing API Key configuration.");
                return;
            }

            if (!apiKey.Equals(extractedApiKey))
            {
                context.Response.StatusCode = 401; // Unauthorized
                await context.Response.WriteAsync("Unauthorized client. (Clave de acceso incorrecta)");
                return;
            }

            await _next(context);
        }
    }
}
