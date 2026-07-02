using System.Collections.Generic;
using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;

namespace Inventory.Application.UseCases
{
    public interface IObtenerMovimientosUseCase
    {
        Task<IEnumerable<Movimiento>> EjecutarAsync();
    }

    public class ObtenerMovimientosUseCase : IObtenerMovimientosUseCase
    {
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;

        public ObtenerMovimientosUseCase(IRepositorio<Movimiento> movimientoRepositorio)
        {
            _movimientoRepositorio = movimientoRepositorio;
        }

        public async Task<IEnumerable<Movimiento>> EjecutarAsync()
        {
            return await _movimientoRepositorio.ObtenerTodosAsync();
        }
    }
}
