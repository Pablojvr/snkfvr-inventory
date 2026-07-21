using Inventory.Application.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System;

namespace Inventory.Settings.Services
{
    public class LocalWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<LocalWhatsAppService> _logger;
        private readonly string _apiUrl;

        public LocalWhatsAppService(HttpClient httpClient, IConfiguration configuration, ILogger<LocalWhatsAppService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiUrl = configuration["WhatsApp:LocalApiUrl"] ?? "http://localhost:3001/send";
        }

        public async Task<bool> EnviarMensajeAsync(string telefono, string mensaje)
        {
            try
            {
                var payload = new
                {
                    phone = telefono,
                    message = mensaje
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(_apiUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Mensaje de WhatsApp enviado exitosamente vía API Local a {Telefono}", telefono);
                    return true;
                }

                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Error al enviar mensaje vía API Local de WhatsApp: {Error}", errorContent);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción al intentar enviar mensaje vía API Local de WhatsApp.");
                return false;
            }
        }
    }
}
