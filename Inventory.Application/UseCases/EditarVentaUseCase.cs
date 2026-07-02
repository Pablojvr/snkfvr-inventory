using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Application.UseCases
{
    public interface IEditarVentaUseCase
    {
        Task<Venta> EjecutarAsync(int id, VentaDto ventaDto);
    }

    public class EditarVentaUseCase : IEditarVentaUseCase
    {
        private readonly IRepositorio<Venta> _ventaRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;
        private readonly IRepositorio<Producto> _productoRepositorio;

        public EditarVentaUseCase(
            IRepositorio<Venta> ventaRepositorio,
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
        }

        public async Task<Venta> EjecutarAsync(int id, VentaDto ventaDto)
        {
            var venta = await _ventaRepositorio.ObtenerPorIdAsync(id);
            if (venta == null) throw new Exception("Venta no encontrada");

            venta.ProductoId = ventaDto.ProductoId;
            venta.CostoEnvio = ventaDto.CostoEnvio;
            venta.CostosAdicionales = ventaDto.CostosAdicionales;
            venta.FechaVenta = ventaDto.FechaVenta;
            venta.PrecioVenta = ventaDto.PrecioVenta;
            venta.UsuarioId = ventaDto.UsuarioId;
            venta.Estado = ventaDto.Estado;

            await _ventaRepositorio.ActualizarAsync(venta);

            if (venta.Estado == "Vendido")
            {
                var producto = await _productoRepositorio.ObtenerPorIdAsync(venta.ProductoId);
                if (producto != null && producto.Estado != "Vendido")
                {
                    producto.Estado = "Vendido";
                    await _productoRepositorio.ActualizarAsync(producto);

                    var movimientoEstado = new Movimiento
                    {
                        Tipo = "Cambio de Estado",
                        Fecha = DateTime.Now,
                        Descripcion = $"El producto {venta.ProductoId} cambió a Vendido",
                        MontoTotal = 0,
                        ReferenciaId = venta.Id,
                        ProductoId = venta.ProductoId
                    };
                    await _movimientoRepositorio.AgregarAsync(movimientoEstado);
                }
            }

            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var mov = movimientos.FirstOrDefault(m => m.ReferenciaId == id && m.Tipo == "Venta");

            if (mov != null)
            {
                mov.MontoTotal = ventaDto.PrecioVenta - ventaDto.CostoEnvio - ventaDto.CostosAdicionales;
                mov.Descripcion = $"Venta del producto {ventaDto.ProductoId} realizada por el usuario con ID {ventaDto.UsuarioId}";
                mov.ProductoId = ventaDto.ProductoId;
                if (venta.FechaVenta.HasValue) mov.Fecha = venta.FechaVenta.Value;
                await _movimientoRepositorio.ActualizarAsync(mov);
            }

            return venta;
        }
    }
}
