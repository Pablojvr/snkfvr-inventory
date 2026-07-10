using System.Threading.Tasks;

namespace Inventory.Application.Services
{
    public interface IWhatsAppService
    {
        Task<bool> EnviarMensajeAsync(string telefono, string mensaje);
    }
}
