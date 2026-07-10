using System;
using System.Net.Http;
using System.Threading.Tasks;
using Inventory.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Inventory.Settings.Services
{
    /// <summary>
    /// Implementación de WhatsApp usando CallMeBot API.
    /// Para activar: envía "I allow callmebot to send me messages" al +34 644 31 89 93 en WhatsApp.
    /// Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
    /// </summary>
    public class CallMeBotWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly ILogger<CallMeBotWhatsAppService> _logger;

        public CallMeBotWhatsAppService(HttpClient httpClient, IConfiguration config, ILogger<CallMeBotWhatsAppService> logger)
        {
            _httpClient = httpClient;
            _apiKey = config["WhatsApp:CallMeBotApiKey"];
            _logger = logger;
        }

        public async Task<bool> EnviarMensajeAsync(string telefono, string mensaje)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogWarning("CallMeBot API Key no configurada. Mensaje no enviado.");
                return false;
            }

            try
            {
                var telefonoLimpio = telefono.Replace("+", "").Replace(" ", "").Replace("-", "");
                var mensajeCodificado = Uri.EscapeDataString(mensaje);
                var url = $"https://api.callmebot.com/whatsapp.php?phone={telefonoLimpio}&text={mensajeCodificado}&apikey={_apiKey}";

                var response = await _httpClient.GetAsync(url);
                
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("WhatsApp enviado a {Telefono}", telefono);
                    return true;
                }
                else
                {
                    var body = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Error al enviar WhatsApp a {Telefono}: {Status} - {Body}", telefono, response.StatusCode, body);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción al enviar WhatsApp a {Telefono}", telefono);
                return false;
            }
        }
    }
}
