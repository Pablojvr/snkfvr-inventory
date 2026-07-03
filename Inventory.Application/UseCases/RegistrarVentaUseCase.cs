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
        private readonly IRepositorio<Gasto> _gastoRepositorio;
        private readonly IRepositorio<Usuario> _usuarioRepositorio;

        public RegistrarVentaUseCase(
            IRepositorio<Venta> ventaRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Gasto> gastoRepositorio,
            IRepositorio<Usuario> usuarioRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _gastoRepositorio = gastoRepositorio;
            _usuarioRepositorio = usuarioRepositorio;
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
                NombreComprador = ventaDto.NombreComprador,
                LugarDestino = ventaDto.LugarDestino,
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

            if (ventaDto.CostoEnvio > 0)
            {
                var gastoEnvio = new Gasto
                {
                    Tipo = "Envío",
                    Motivo = $"Envío asociado a la venta del producto {producto?.Descripcion ?? ventaDto.ProductoId.ToString()}",
                    Monto = ventaDto.CostoEnvio,
                    Fecha = DateTime.Now,
                    UsuarioId = ventaDto.UsuarioId,
                    ProductoId = ventaDto.ProductoId,
                    Activo = true
                };
                await _gastoRepositorio.AgregarAsync(gastoEnvio);
            }

            if (ventaDto.CostosAdicionales > 0)
            {
                var gastoOtros = new Gasto
                {
                    Tipo = "Comisión",
                    Motivo = $"Otros costos/Comisión asociados a la venta del producto {producto?.Descripcion ?? ventaDto.ProductoId.ToString()}",
                    Monto = ventaDto.CostosAdicionales,
                    Fecha = DateTime.Now,
                    UsuarioId = ventaDto.UsuarioId,
                    ProductoId = ventaDto.ProductoId,
                    Activo = true
                };
                await _gastoRepositorio.AgregarAsync(gastoOtros);
            }

            if (ventaDto.ComisionMonto.HasValue && ventaDto.ComisionMonto.Value > 0)
            {
                var comisionUsuarioId = ventaDto.ComisionUsuarioId ?? ventaDto.UsuarioId;
                var usuarioComision = await _usuarioRepositorio.ObtenerPorIdAsync(comisionUsuarioId);
                var nombreUsuarioComision = usuarioComision?.Nombre ?? comisionUsuarioId.ToString();
                var nombreProducto = producto?.Descripcion ?? ventaDto.ProductoId.ToString();
                
                var gastoComisionVenta = new Gasto
                {
                    Tipo = "Comisión",
                    Motivo = $"COM | {nombreProducto} ({nombreUsuarioComision})",
                    Monto = ventaDto.ComisionMonto.Value,
                    Fecha = DateTime.Now,
                    UsuarioId = comisionUsuarioId,
                    ProductoId = ventaDto.ProductoId,
                    Activo = true
                };
                var comAgregada = await _gastoRepositorio.AgregarAsync(gastoComisionVenta);

                var movComisionVenta = new Movimiento
                {
                    Tipo = "Comisión",
                    Fecha = DateTime.Now,
                    Descripcion = $"Comisión de venta: COM | {nombreProducto} asignada a {nombreUsuarioComision}",
                    MontoTotal = -ventaDto.ComisionMonto.Value,
                    ReferenciaId = comAgregada.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movComisionVenta);
            }

            return ventaAgregada;
        }
    }
}
