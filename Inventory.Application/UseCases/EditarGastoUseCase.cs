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
        private readonly IRepositorio<TipoGasto> _tipoGastoRepositorio;

        public EditarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<TipoGasto> tipoGastoRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _tipoGastoRepositorio = tipoGastoRepositorio;
        }

        public async Task<Gasto> EjecutarAsync(int id, GastoDto gastoDto)
        {
            var gasto = await _gastoRepositorio.ObtenerPorIdAsync(id);
            if (gasto == null) throw new Exception("Gasto no encontrado");

            int? nuevoProductoId = gastoDto.ProductoId ?? gasto.ProductoId;

            // Resolve tipo name from FK
            var tipoGasto = await _tipoGastoRepositorio.ObtenerPorIdAsync(gastoDto.TipoGastoId);
            var nuevoTipoNombre = tipoGasto?.Nombre ?? "Producto";

            if (nuevoProductoId.HasValue && nuevoTipoNombre != "Comisión" && nuevoTipoNombre != "Envío" && nuevoTipoNombre != "Producto")
            {
                throw new Exception("Un gasto asociado a un producto solo puede ser de tipo Comisión, Envío o Producto.");
            }

            if (nuevoTipoNombre == "Comisión" && !gastoDto.Motivo.StartsWith("COM |"))
            {
                gastoDto.Motivo = string.IsNullOrWhiteSpace(gastoDto.Motivo) ? "COM | " : $"COM | {gastoDto.Motivo}";
            }
            else if (nuevoTipoNombre == "Envío" && !gastoDto.Motivo.StartsWith("ENV |"))
            {
                gastoDto.Motivo = string.IsNullOrWhiteSpace(gastoDto.Motivo) ? "ENV | " : $"ENV | {gastoDto.Motivo}";
            }

            // Si se editó el motivo de un Producto que generó producto, actualizamos el producto
            var tipoAnterior = await _tipoGastoRepositorio.ObtenerPorIdAsync(gasto.TipoGastoId);
            var tipoAnteriorNombre = tipoAnterior?.Nombre ?? "";

            if (tipoAnteriorNombre == "Producto" && gasto.ProductoId.HasValue && gasto.Motivo != gastoDto.Motivo)
            {
                var producto = await _productoRepositorio.ObtenerPorIdAsync(gasto.ProductoId.Value);
                if (producto != null)
                {
                    producto.Descripcion = gastoDto.Motivo;
                    await _productoRepositorio.ActualizarAsync(producto);
                }
            }

            gasto.Motivo = gastoDto.Motivo;
            gasto.Monto = gastoDto.Monto;
            gasto.UsuarioId = gastoDto.UsuarioId;
            gasto.Fecha = gastoDto.Fecha;
            gasto.TipoGastoId = gastoDto.TipoGastoId;
            gasto.ProductoId = nuevoProductoId;

            await _gastoRepositorio.ActualizarAsync(gasto);

            // Buscar movimiento asociado y actualizarlo
            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var mov = movimientos.FirstOrDefault(m => m.ReferenciaId == id && (m.Tipo == "Compra" || m.Tipo == "Comisión" || m.Tipo == "Salida de dinero" || m.Descripcion.StartsWith("Gasto/Compra:") || m.Descripcion.StartsWith("Comisión:")));

            if (mov != null)
            {
                var descPrefix = nuevoTipoNombre == "Comisión" ? "Comisión" : "Gasto/Compra";
                mov.Tipo = nuevoTipoNombre == "Comisión" ? "Comisión" : (nuevoProductoId.HasValue ? "Compra" : "Salida de dinero");
                mov.MontoTotal = -gastoDto.Monto;
                mov.Descripcion = $"{descPrefix}: {gastoDto.Motivo} por el usuario con ID {gastoDto.UsuarioId}";
                mov.ProductoId = nuevoProductoId;
                await _movimientoRepositorio.ActualizarAsync(mov);
            }

            return gasto;
        }
    }
}
