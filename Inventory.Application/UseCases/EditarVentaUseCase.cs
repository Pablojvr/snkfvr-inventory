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
        private readonly IRepositorio<Gasto> _gastoRepositorio;
        private readonly IRepositorio<Usuario> _usuarioRepositorio;
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;

        public EditarVentaUseCase(
            IRepositorio<Venta> ventaRepositorio,
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Gasto> gastoRepositorio,
            IRepositorio<Usuario> usuarioRepositorio,
            IRepositorio<Ingreso> ingresoRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _gastoRepositorio = gastoRepositorio;
            _usuarioRepositorio = usuarioRepositorio;
            _ingresoRepositorio = ingresoRepositorio;
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
            venta.NombreComprador = ventaDto.NombreComprador;
            venta.LugarDestino = ventaDto.LugarDestino;
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

                    // Create Commission if provided
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

                    // Calcular Ganancia y registrar Ingreso
                    var todosGastos = await _gastoRepositorio.ObtenerTodosAsync();
                    var costoCalculado = todosGastos.Where(g => g.ProductoId == ventaDto.ProductoId && g.Activo).Sum(g => g.Monto);
                    var ganancia = ventaDto.PrecioVenta - costoCalculado;

                    var ingresoGanancia = new Ingreso
                    {
                        Motivo = $"Ganancia Venta | {producto?.Descripcion ?? ventaDto.ProductoId.ToString()}",
                        Monto = ganancia,
                        Fecha = DateTime.Now,
                        UsuarioId = ventaDto.UsuarioId,
                        Activo = true
                    };
                    await _ingresoRepositorio.AgregarAsync(ingresoGanancia);
                }
            }

            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var mov = movimientos.FirstOrDefault(m => m.ReferenciaId == id && m.Tipo == "Venta");

            if (mov != null)
            {
                mov.MontoTotal = ventaDto.PrecioVenta; // La venta completa
                mov.Descripcion = $"Venta del producto {ventaDto.ProductoId} realizada por el usuario con ID {ventaDto.UsuarioId}";
                mov.ProductoId = ventaDto.ProductoId;
                if (venta.FechaVenta.HasValue) mov.Fecha = venta.FechaVenta.Value;
                await _movimientoRepositorio.ActualizarAsync(mov);
            }

            return venta;
        }
    }
}
