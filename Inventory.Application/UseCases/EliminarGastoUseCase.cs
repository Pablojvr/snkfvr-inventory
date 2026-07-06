using System.Linq;
using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using Inventory.Core.Constants;

namespace Inventory.Application.UseCases
{
    public interface IEliminarGastoUseCase
    {
        Task EjecutarAsync(int id);
    }

    public class EliminarGastoUseCase : IEliminarGastoUseCase
    {
        private readonly IRepositorio<Gasto> _gastoRepositorio;
        private readonly IRepositorio<Producto> _productoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;
        private readonly IRepositorio<TipoGasto> _tipoGastoRepositorio;

        public EliminarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<TipoGasto> tipoGastoRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _productoRepositorio = productoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _tipoGastoRepositorio = tipoGastoRepositorio;
        }

        public async Task EjecutarAsync(int id)
        {
            var gasto = await _gastoRepositorio.ObtenerPorIdAsync(id);
            if (gasto != null)
            {
                // Soft delete del gasto
                await _gastoRepositorio.EliminarAsync(id);

                // Revertir efecto en caja: desactivar movimientos asociados a este gasto
                var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
                var movAsociado = movimientos.FirstOrDefault(m => m.ReferenciaId == gasto.Id && m.MontoTotal < 0);
                if (movAsociado != null)
                {
                    await _movimientoRepositorio.EliminarAsync(movAsociado.Id);
                }

                // Desactivar el producto si el gasto fue de tipo Producto y creó el producto
                var tipoGasto = await _tipoGastoRepositorio.ObtenerPorIdAsync(gasto.TipoGastoId);
                if (tipoGasto?.Nombre == TipoGastoConstants.Producto && gasto.ProductoId.HasValue)
                {
                    await _productoRepositorio.EliminarAsync(gasto.ProductoId.Value);
                }
                
                // Si fue Comisión o Envío, el "Costo Calculado" es dinámico en el Frontend.
                // Así que el Frontend simplemente sumará los Gastos activos.
            }
        }
    }
}
