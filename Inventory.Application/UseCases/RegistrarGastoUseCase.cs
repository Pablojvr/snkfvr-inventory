using System;
using System.Linq;
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
        private readonly IRepositorio<TipoGasto> _tipoGastoRepositorio;

        public RegistrarGastoUseCase(
            IRepositorio<Gasto> gastoRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Usuario> usuarioRepositorio,
            IRepositorio<TipoGasto> tipoGastoRepositorio)
        {
            _gastoRepositorio = gastoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _usuarioRepositorio = usuarioRepositorio;
            _tipoGastoRepositorio = tipoGastoRepositorio;
        }

        public async Task<Gasto> EjecutarAsync(GastoDto gastoDto)
        {
            int? productoId = gastoDto.ProductoId;
            
            // Resolve tipo name from FK
            var tipoGasto = await _tipoGastoRepositorio.ObtenerPorIdAsync(gastoDto.TipoGastoId);
            var tipoNombre = tipoGasto?.Nombre ?? "Producto";

            if (productoId.HasValue && tipoNombre != "Comisión" && tipoNombre != "Envío" && tipoNombre != "Producto")
            {
                throw new Exception("Un gasto asociado a un producto solo puede ser de tipo Comisión, Envío o Producto.");
            }

            // Creacion automatica de producto si es Producto (antes Calzado)
            if (tipoNombre == "Producto" && !productoId.HasValue)
            {
                var producto = new Producto
                {
                    Descripcion = gastoDto.Motivo,
                    FechaCompra = gastoDto.Fecha,
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
                TipoGastoId = gastoDto.TipoGastoId,
                ProductoId = productoId,
                Activo = true
            };

            var gastoAgregado = await _gastoRepositorio.AgregarAsync(gasto);

            var tipoMovimiento = tipoNombre == "Comisión" ? "Comisión" : (productoId.HasValue ? "Compra" : "Salida de dinero");
            var descPrefix = tipoNombre == "Comisión" ? "Comisión" : "Gasto/Compra";

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
                var comisionUsuarioId = gastoDto.ComisionUsuarioId ?? gastoDto.UsuarioId;
                
                var usuarioComision = await _usuarioRepositorio.ObtenerPorIdAsync(comisionUsuarioId);
                var nombreUsuarioComision = usuarioComision?.Nombre ?? comisionUsuarioId.ToString();
                
                // Resolve the "Comisión" type ID
                var tipos = await _tipoGastoRepositorio.ObtenerTodosAsync();
                var tipoComision = tipos.FirstOrDefault(t => t.Nombre == "Comisión");
                var comisionTipoId = tipoComision?.Id ?? 3;

                var nombreProducto = gastoDto.Motivo;
                var gastoComision = new Gasto
                {
                    Motivo = $"COM | {nombreProducto} ({nombreUsuarioComision})",
                    Fecha = gastoDto.Fecha,
                    FechaIngreso = gastoDto.FechaIngreso != default ? gastoDto.FechaIngreso : DateTime.Now,
                    UsuarioId = comisionUsuarioId,
                    Monto = gastoDto.ComisionMonto.Value,
                    TipoGastoId = comisionTipoId,
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
