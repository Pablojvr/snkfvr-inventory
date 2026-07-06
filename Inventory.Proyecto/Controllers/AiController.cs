using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;

        public AiController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("scan")]
        public async Task<IActionResult> ScanLabel([FromBody] ScanRequest request)
        {
            if (string.IsNullOrEmpty(request.ImageBase64))
            {
                return BadRequest(new { error = "No se proporcionó ninguna imagen." });
            }

            try
            {
                var client = _httpClientFactory.CreateClient();
                
                // La URL de Vercel (Next.js)
                var aiUrl = "https://label-scanner-app-pied.vercel.app/api/scan";

                var jsonPayload = JsonSerializer.Serialize(new { imageBase64 = request.ImageBase64 });
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await client.PostAsync(aiUrl, content);
                
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, responseString);
                }

                // Devolver la respuesta directamente con su Content-Type
                return Content(responseString, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Hubo un error al comunicar con el servicio de IA.", details = ex.Message });
            }
        }
    }

    public class ScanRequest
    {
        public string ImageBase64 { get; set; } = string.Empty;
    }
}
