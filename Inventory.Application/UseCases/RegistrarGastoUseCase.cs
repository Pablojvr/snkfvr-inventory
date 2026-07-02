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

        public RegistrarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
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
                var producto = await _productoRepositorio.ObtenerPorIdAsync(productoId.Value);
                if (producto != null)
                {
                    producto.Costo += gastoDto.Monto;
                    await _productoRepositorio.ActualizarAsync(producto);

                    var movimientoPrecio = new Movimiento
                    {
                        Tipo = "Edición de Precio",
                        Fecha = gastoDto.Fecha,
                        Descripcion = $"Aumento de costo del producto {producto.Id} por concepto de {tipo} ({gastoDto.Motivo})",
                        MontoTotal = gastoDto.Monto,
                        ReferenciaId = producto.Id,
                        ProductoId = producto.Id
                    };
                    await _movimientoRepositorio.AgregarAsync(movimientoPrecio);
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

            return gastoAgregado;
        }
    }
}
