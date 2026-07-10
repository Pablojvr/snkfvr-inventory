using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Inventory.Application.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Inventory.Settings.Services
{
    /// <summary>
    /// Implementación de WhatsApp usando la API Oficial de Meta (Cloud API).
    /// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    /// </summary>
    public class MetaWhatsAppService : IWhatsAppService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _phoneNumberId;
        private readonly string? _accessToken;
        private readonly ILogger<MetaWhatsAppService> _logger;

        public MetaWhatsAppService(HttpClient httpClient, IConfiguration config, ILogger<MetaWhatsAppService> logger)
        {
            _httpClient = httpClient;
            _phoneNumberId = config["WhatsApp:PhoneNumberId"];
            _accessToken = config["WhatsApp:AccessToken"];
            _logger = logger;
        }

        public async Task<bool> EnviarMensajeAsync(string telefono, string mensaje)
        {
            if (string.IsNullOrEmpty(_phoneNumberId) || string.IsNullOrEmpty(_accessToken))
            {
                _logger.LogWarning("WhatsApp:PhoneNumberId o WhatsApp:AccessToken no configurados en MetaWhatsAppService. Mensaje no enviado.");
                return false;
            }

            try
            {
                // Limpiar el teléfono para la API de Meta (debe incluir el código de país sin '+' ni espacios)
                var telefonoLimpio = telefono.Replace("+", "").Replace(" ", "").Replace("-", "");

                var url = $"https://graph.facebook.com/v18.0/{_phoneNumberId}/messages";

                var payload = new
                {
                    messaging_product = "whatsapp",
                    recipient_type = "individual",
                    to = telefonoLimpio,
                    type = "text",
                    text = new { body = mensaje }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // Configurar el Header de Autorización con el Token de Meta
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_accessToken}");

                var response = await _httpClient.PostAsync(url, content);
                var body = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("WhatsApp enviado a {Telefono} usando Meta API", telefono);
                    return true;
                }
                else
                {
                    _logger.LogError("Error al enviar WhatsApp a {Telefono} usando Meta API: {Status} - {Body}", telefono, response.StatusCode, body);
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Excepción al enviar WhatsApp a {Telefono} usando Meta API", telefono);
                return false;
            }
        }
    }
}
