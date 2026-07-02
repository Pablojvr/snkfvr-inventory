using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;

namespace Inventory.Application.UseCases
{
    public interface IRegistrarVentaUseCase
    {
        Task<Venta> EjecutarAsync(VentaDto ventaDto);
    }

    public class RegistrarVentaUseCase : IRegistrarVentaUseCase
    {
        private readonly IRepositorio<Venta> _ventaRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;
        private readonly IRepositorio<Producto> _productoRepositorio;

        public RegistrarVentaUseCase(
            IRepositorio<Venta> ventaRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
        }

        public async Task<Venta> EjecutarAsync(VentaDto ventaDto)
        {
            var venta = new Venta
            {
                ProductoId = ventaDto.ProductoId,
                CostoEnvio = ventaDto.CostoEnvio,
                CostosAdicionales = ventaDto.CostosAdicionales,
                FechaVenta = ventaDto.FechaVenta,
                FechaRegistro = ventaDto.FechaRegistro != default ? ventaDto.FechaRegistro : DateTime.Now,
                PrecioVenta = ventaDto.PrecioVenta,
                UsuarioId = ventaDto.UsuarioId,
                Activo = true
            };

            var ventaAgregada = await _ventaRepositorio.AgregarAsync(venta);

            var producto = await _productoRepositorio.ObtenerPorIdAsync(ventaDto.ProductoId);
            if (producto != null)
            {
                producto.Estado = "Reservado";
                await _productoRepositorio.ActualizarAsync(producto);
            }

            var movimiento = new Movimiento
            {
                Tipo = "Venta",
                Fecha = ventaDto.FechaVenta ?? DateTime.Now,
                Descripcion = $"Venta del producto {ventaDto.ProductoId} realizada por el usuario con ID {ventaDto.UsuarioId}",
                MontoTotal = ventaDto.PrecioVenta - ventaDto.CostoEnvio - ventaDto.CostosAdicionales,
                ReferenciaId = ventaAgregada.Id,
                ProductoId = ventaDto.ProductoId
            };

            var movimientoEstado = new Movimiento
            {
                Tipo = "Cambio de Estado",
                Fecha = DateTime.Now,
                Descripcion = $"El producto {ventaDto.ProductoId} cambió a Reservado",
                MontoTotal = 0,
                ReferenciaId = ventaAgregada.Id,
                ProductoId = ventaDto.ProductoId
            };

            await _movimientoRepositorio.AgregarAsync(movimiento);
            await _movimientoRepositorio.AgregarAsync(movimientoEstado);

            return ventaAgregada;
        }
    }
}
