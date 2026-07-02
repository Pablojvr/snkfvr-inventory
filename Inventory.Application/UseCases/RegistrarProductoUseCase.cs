using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;

namespace Inventory.Application.UseCases
{
    public interface IRegistrarProductoUseCase
    {
        Task<Producto> EjecutarAsync(Producto producto);
    }

    public class RegistrarProductoUseCase : IRegistrarProductoUseCase
    {
        private readonly IRepositorio<Producto> _productoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;

        public RegistrarProductoUseCase(IRepositorio<Producto> productoRepositorio, IRepositorio<Movimiento> movimientoRepositorio)
        {
            _productoRepositorio = productoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
        }

        public async Task<Producto> EjecutarAsync(Producto producto)
        {
            var productoAgregado = await _productoRepositorio.AgregarAsync(producto);

            var movimiento = new Movimiento
            {
                Tipo = "Compra",
                Fecha = producto.FechaCompra,
                Descripcion = $"Compra de Producto: {producto.Descripcion}",
                MontoTotal = -producto.Costo,
                ReferenciaId = productoAgregado.Id,
                ProductoId = productoAgregado.Id
            };

            await _movimientoRepositorio.AgregarAsync(movimiento);

            return productoAgregado;
        }
    }
}
