using System.Collections.Generic;
using System.Threading.Tasks;

namespace Inventory.Core.Interfaces
{
    public interface IRepositorio<T> where T : class
    {
        Task<T?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<T>> ObtenerTodosAsync();
        Task<T> AgregarAsync(T entidad);
        Task ActualizarAsync(T entidad);
        Task EliminarAsync(int id);
    }
}
