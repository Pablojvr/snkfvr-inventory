using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;

namespace Inventory.Application.UseCases
{
    public interface IRegistrarGastoUseCase
    {
        Task<Gasto> EjecutarAsync(GastoDto gastoDto);
    }

    public class RegistrarGastoUseCase : IRegistrarGastoUseCase
    {
        private readonly IRepositorio<Gasto> _gastoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;
        private readonly IRepositorio<Producto> _productoRepositorio;
        private readonly IRepositorio<Usuario> _usuarioRepositorio;

        public RegistrarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Usuario> usuarioRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _usuarioRepositorio = usuarioRepositorio;
        }

        public async Task<Gasto> EjecutarAsync(GastoDto gastoDto)
        {
            int? productoId = gastoDto.ProductoId;
            var tipo = string.IsNullOrEmpty(gastoDto.Tipo) ? "Calzado" : gastoDto.Tipo;

            if (productoId.HasValue && tipo != "Comisión" && tipo != "Envío" && tipo != "Calzado")
            {
                throw new Exception("Un gasto asociado a un producto solo puede ser de tipo Comisión o Envío.");
            }

            // Creacion automatica de producto si es Calzado
            if (tipo == "Calzado" && !productoId.HasValue)
            {
                var producto = new Producto
                {
                    Descripcion = gastoDto.Motivo,
                    FechaCompra = gastoDto.Fecha,
                    Costo = gastoDto.Monto,
                    Estado = "Disponible",
                    Activo = true
                };
                var nuevoProducto = await _productoRepositorio.AgregarAsync(producto);
                productoId = nuevoProducto.Id;
            }

            var gasto = new Gasto
            {
                Motivo = gastoDto.Motivo,
                Fecha = gastoDto.Fecha,
                FechaIngreso = gastoDto.FechaIngreso != default ? gastoDto.FechaIngreso : DateTime.Now,
                UsuarioId = gastoDto.UsuarioId,
                Monto = gastoDto.Monto,
                Tipo = tipo,
                ProductoId = productoId,
                Activo = true
            };

            var gastoAgregado = await _gastoRepositorio.AgregarAsync(gasto);

            if (productoId.HasValue && (tipo == "Comisión" || tipo == "Envío"))
            {
                // NOTA: Según requerimiento, el costo no se suma a la base de datos de Producto.Costo
                // El costo calculado será dinámico en el Frontend.
                var producto = await _productoRepositorio.ObtenerPorIdAsync(productoId.Value);
                if (producto != null)
                {
                    // Ya no actualizamos producto.Costo += gastoDto.Monto;
                }
            }

            var tipoMovimiento = tipo == "Comisión" ? "Comisión" : (productoId.HasValue ? "Compra" : "Salida de dinero");
            var descPrefix = tipo == "Comisión" ? "Comisión" : "Gasto/Compra";

            var movimiento = new Movimiento
            {
                Tipo = tipoMovimiento,
                Fecha = gastoDto.Fecha,
                Descripcion = $"{descPrefix}: {gastoDto.Motivo} por el usuario con ID {gastoDto.UsuarioId}",
                MontoTotal = -gastoDto.Monto, // Negativo porque es un gasto
                ReferenciaId = gastoAgregado.Id,
                ProductoId = productoId
            };

            await _movimientoRepositorio.AgregarAsync(movimiento);

            if (gastoDto.ComisionMonto.HasValue && gastoDto.ComisionMonto.Value > 0)
            {
                // We need the user assigned, defaults to current user if null (though frontend should send it)
                var comisionUsuarioId = gastoDto.ComisionUsuarioId ?? gastoDto.UsuarioId;
                
                var usuarioComision = await _usuarioRepositorio.ObtenerPorIdAsync(comisionUsuarioId);
                var nombreUsuarioComision = usuarioComision?.Nombre ?? comisionUsuarioId.ToString();
                
                var nombreProducto = gastoDto.Motivo; // For Calzado, the Gasto motivo IS the product description
                var gastoComision = new Gasto
                {
                    Motivo = $"COM | {nombreProducto} ({nombreUsuarioComision})",
                    Fecha = gastoDto.Fecha,
                    FechaIngreso = gastoDto.FechaIngreso != default ? gastoDto.FechaIngreso : DateTime.Now,
                    UsuarioId = comisionUsuarioId,
                    Monto = gastoDto.ComisionMonto.Value,
                    Tipo = "Comisión",
                    ProductoId = productoId,
                    Activo = true
                };
                var comisionAgregada = await _gastoRepositorio.AgregarAsync(gastoComision);

                var movimientoComision = new Movimiento
                {
                    Tipo = "Comisión",
                    Fecha = gastoDto.Fecha,
                    Descripcion = $"Comisión: COM | {nombreProducto} asignada al usuario con ID {comisionUsuarioId}",
                    MontoTotal = -gastoDto.ComisionMonto.Value,
                    ReferenciaId = comisionAgregada.Id,
                    ProductoId = productoId
                };
                await _movimientoRepositorio.AgregarAsync(movimientoComision);
            }

            return gastoAgregado;
        }
    }
}
