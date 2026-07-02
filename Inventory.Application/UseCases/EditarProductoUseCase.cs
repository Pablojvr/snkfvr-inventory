using System;
using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Application.UseCases
{
    public interface IEditarProductoUseCase
    {
        Task<Producto> EjecutarAsync(int id, Producto productoDto);
    }

    public class EditarProductoUseCase : IEditarProductoUseCase
    {
        private readonly IRepositorio<Producto> _productoRepositorio;
        private readonly IRepositorio<Gasto> _gastoRepositorio;

        public EditarProductoUseCase(
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Gasto> gastoRepositorio)
        {
            _productoRepositorio = productoRepositorio;
            _gastoRepositorio = gastoRepositorio;
        }

        public async Task<Producto> EjecutarAsync(int id, Producto productoDto)
        {
            var producto = await _productoRepositorio.ObtenerPorIdAsync(id);
            if (producto == null) throw new Exception("Producto no encontrado");

            bool descChanged = producto.Descripcion != productoDto.Descripcion;

            producto.Descripcion = productoDto.Descripcion;
            producto.Costo = productoDto.Costo;
            producto.FechaCompra = productoDto.FechaCompra;

            await _productoRepositorio.ActualizarAsync(producto);

            if (descChanged)
            {
                var gastos = await _gastoRepositorio.ObtenerTodosAsync();
                var gastoAsociado = gastos.FirstOrDefault(g => g.ProductoId == id);
                if (gastoAsociado != null)
                {
                    gastoAsociado.Motivo = producto.Descripcion;
                    await _gastoRepositorio.ActualizarAsync(gastoAsociado);
                }
            }

            return producto;
        }
    }
}
