using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Application.UseCases
{
    public interface IEditarGastoUseCase
    {
        Task<Gasto> EjecutarAsync(int id, GastoDto gastoDto);
    }

    public class EditarGastoUseCase : IEditarGastoUseCase
    {
        private readonly IRepositorio<Gasto> _gastoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;
        private readonly IRepositorio<Producto> _productoRepositorio;

        public EditarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
        }

        public async Task<Gasto> EjecutarAsync(int id, GastoDto gastoDto)
        {
            var gasto = await _gastoRepositorio.ObtenerPorIdAsync(id);
            if (gasto == null) throw new Exception("Gasto no encontrado");

            int? nuevoProductoId = gastoDto.ProductoId ?? gasto.ProductoId;
            var nuevoTipo = string.IsNullOrEmpty(gastoDto.Tipo) ? "Calzado" : gastoDto.Tipo;

            if (nuevoProductoId.HasValue && nuevoTipo != "Comisión" && nuevoTipo != "Envío" && nuevoTipo != "Calzado")
            {
                throw new Exception("Un gasto asociado a un producto solo puede ser de tipo Comisión o Envío.");
            }

            // Si se edito el motivo de un calzado que generó producto, actualizamos el producto
            if (gasto.Tipo == "Calzado" && gasto.ProductoId.HasValue && gasto.Motivo != gastoDto.Motivo)
            {
                var producto = await _productoRepositorio.ObtenerPorIdAsync(gasto.ProductoId.Value);
                if (producto != null)
                {
                    producto.Descripcion = gastoDto.Motivo;
                    await _productoRepositorio.ActualizarAsync(producto);
                }
            }

            // Manejar diferencia de costo si es comisión o envío
            if (nuevoProductoId.HasValue && (nuevoTipo == "Comisión" || nuevoTipo == "Envío"))
            {
                var diferenciaMonto = gastoDto.Monto - gasto.Monto;
                if (diferenciaMonto != 0)
                {
                    var producto = await _productoRepositorio.ObtenerPorIdAsync(nuevoProductoId.Value);
                    if (producto != null)
                    {
                        producto.Costo += diferenciaMonto;
                        await _productoRepositorio.ActualizarAsync(producto);

                        var movimientoPrecio = new Movimiento
                        {
                            Tipo = "Edición de Precio",
                            Fecha = DateTime.Now,
                            Descripcion = $"Ajuste de costo del producto {producto.Id} tras editar gasto {id} de {nuevoTipo} ({gastoDto.Motivo})",
                            MontoTotal = diferenciaMonto,
                            ReferenciaId = producto.Id,
                            ProductoId = producto.Id
                        };
                        await _movimientoRepositorio.AgregarAsync(movimientoPrecio);
                    }
                }
            }

            gasto.Motivo = gastoDto.Motivo;
            gasto.Monto = gastoDto.Monto;
            gasto.UsuarioId = gastoDto.UsuarioId;
            gasto.Fecha = gastoDto.Fecha;
            gasto.Tipo = nuevoTipo;
            gasto.ProductoId = nuevoProductoId;

            await _gastoRepositorio.ActualizarAsync(gasto);

            // Buscar movimiento asociado y actualizarlo
            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var mov = movimientos.FirstOrDefault(m => m.ReferenciaId == id && (m.Tipo == "Compra" || m.Tipo == "Comisión" || m.Tipo == "Salida de dinero" || m.Descripcion.StartsWith("Gasto/Compra:") || m.Descripcion.StartsWith("Comisión:")));

            if (mov != null)
            {
                var descPrefix = nuevoTipo == "Comisión" ? "Comisión" : "Gasto/Compra";
                mov.Tipo = nuevoTipo == "Comisión" ? "Comisión" : (nuevoProductoId.HasValue ? "Compra" : "Salida de dinero");
                mov.MontoTotal = -gastoDto.Monto;
                mov.Descripcion = $"{descPrefix}: {gastoDto.Motivo} por el usuario con ID {gastoDto.UsuarioId}";
                mov.ProductoId = nuevoProductoId;
                await _movimientoRepositorio.ActualizarAsync(mov);
            }

            return gasto;
        }
    }
}
