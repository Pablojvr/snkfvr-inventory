using System;
using System.Linq;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using Inventory.Core.Constants;

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
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;
        private readonly IRepositorio<TipoGasto> _tipoGastoRepositorio;

        public RegistrarVentaUseCase(
            IRepositorio<Venta> ventaRepositorio, 
            IRepositorio<Movimiento> movimientoRepositorio,
            IRepositorio<Producto> productoRepositorio,
            IRepositorio<Gasto> gastoRepositorio,
            IRepositorio<Usuario> usuarioRepositorio,
            IRepositorio<Ingreso> ingresoRepositorio,
            IRepositorio<TipoGasto> tipoGastoRepositorio)
        {
            _ventaRepositorio = ventaRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
            _productoRepositorio = productoRepositorio;
            _gastoRepositorio = gastoRepositorio;
            _usuarioRepositorio = usuarioRepositorio;
            _ingresoRepositorio = ingresoRepositorio;
            _tipoGastoRepositorio = tipoGastoRepositorio;
        }

        public async Task<Venta> EjecutarAsync(VentaDto ventaDto)
        {
            var estadoDeseado = !string.IsNullOrEmpty(ventaDto.Estado) ? ventaDto.Estado : "Reservado";

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
                FechaEntrega = ventaDto.FechaEntrega,
                Estado = estadoDeseado,
                EstadoPago = !string.IsNullOrEmpty(ventaDto.EstadoPago) ? ventaDto.EstadoPago : "Pendiente",
                Activo = true
            };

            var ventaAgregada = await _ventaRepositorio.AgregarAsync(venta);

            var producto = await _productoRepositorio.ObtenerPorIdAsync(ventaDto.ProductoId);

            if (producto != null)
            {
                producto.Estado = estadoDeseado;
                await _productoRepositorio.ActualizarAsync(producto);
            }

            if (estadoDeseado == "Vendido")
            {
                var movimiento = new Movimiento
                {
                    Tipo = TipoMovimientoConstants.Venta,
                    Fecha = ventaDto.FechaVenta ?? DateTime.Now,
                    Descripcion = $"Venta del producto {ventaDto.ProductoId} realizada por el usuario con ID {ventaDto.UsuarioId}",
                    MontoTotal = ventaDto.PrecioVenta, // La venta completa
                    ReferenciaId = ventaAgregada.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movimiento);
            }
            else if (estadoDeseado == "Reservado" && ventaDto.AdelantoMonto.HasValue && ventaDto.AdelantoMonto.Value > 0)
            {
                // Registrar solo el adelanto en reservas
                var movimientoAdelanto = new Movimiento
                {
                    Tipo = TipoMovimientoConstants.Ingreso, // Lo clasificamos como Ingreso / Adelanto
                    Fecha = ventaDto.FechaVenta ?? DateTime.Now,
                    Descripcion = $"{TipoMovimientoConstants.AdelantoPorReserva} del producto {ventaDto.ProductoId}",
                    MontoTotal = ventaDto.AdelantoMonto.Value,
                    ReferenciaId = ventaAgregada.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movimientoAdelanto);
            }

            var movimientoEstado = new Movimiento
            {
                Tipo = estadoDeseado == "Reservado" ? TipoMovimientoConstants.Reserva : TipoMovimientoConstants.CambioDeEstado,
                Fecha = DateTime.Now,
                Descripcion = estadoDeseado == "Reservado" ? $"El producto {ventaDto.ProductoId} fue reservado por {ventaDto.NombreComprador}" : $"El producto {ventaDto.ProductoId} cambió a {estadoDeseado}",
                MontoTotal = estadoDeseado == "Reservado" ? ventaDto.PrecioVenta : 0,
                ReferenciaId = ventaAgregada.Id,
                ProductoId = ventaDto.ProductoId
            };

            await _movimientoRepositorio.AgregarAsync(movimientoEstado);

            // Resolve TipoGasto IDs for Envío and Comisión
            var tipos = await _tipoGastoRepositorio.ObtenerTodosAsync();
            var tipoEnvioId = tipos.FirstOrDefault(t => t.Nombre == TipoGastoConstants.Envio)?.Id ?? 2;
            var tipoComisionId = tipos.FirstOrDefault(t => t.Nombre == TipoGastoConstants.Comision)?.Id ?? 3;

            if (ventaDto.CostoEnvio > 0)
            {
                var gastoEnvio = new Gasto
                {
                    TipoGastoId = tipoEnvioId,
                    Motivo = $"Envío asociado a la venta del producto {producto?.Descripcion ?? ventaDto.ProductoId.ToString()}",
                    Monto = ventaDto.CostoEnvio,
                    Fecha = DateTime.Now,
                    UsuarioId = ventaDto.UsuarioId,
                    ProductoId = ventaDto.ProductoId,
                    Activo = true
                };
                var gastoEnvioAgregado = await _gastoRepositorio.AgregarAsync(gastoEnvio);
                
                var movEnvio = new Movimiento
                {
                    Tipo = TipoMovimientoConstants.SalidaDeDinero,
                    Fecha = DateTime.Now,
                    Descripcion = $"ENV | {producto?.Descripcion ?? ventaDto.ProductoId.ToString()} por el usuario con ID {ventaDto.UsuarioId}",
                    MontoTotal = -ventaDto.CostoEnvio,
                    ReferenciaId = gastoEnvioAgregado.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movEnvio);
            }

            if (ventaDto.CostosAdicionales > 0)
            {
                var gastoOtros = new Gasto
                {
                    TipoGastoId = tipoComisionId,
                    Motivo = $"Otros costos/Comisión asociados a la venta del producto {producto?.Descripcion ?? ventaDto.ProductoId.ToString()}",
                    Monto = ventaDto.CostosAdicionales,
                    Fecha = DateTime.Now,
                    UsuarioId = ventaDto.UsuarioId,
                    ProductoId = ventaDto.ProductoId,
                    Activo = true
                };
                var gastoOtrosAgregado = await _gastoRepositorio.AgregarAsync(gastoOtros);

                var movOtros = new Movimiento
                {
                    Tipo = TipoMovimientoConstants.SalidaDeDinero,
                    Fecha = DateTime.Now,
                    Descripcion = $"Otros gastos de venta de {producto?.Descripcion ?? ventaDto.ProductoId.ToString()} por el usuario con ID {ventaDto.UsuarioId}",
                    MontoTotal = -ventaDto.CostosAdicionales,
                    ReferenciaId = gastoOtrosAgregado.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movOtros);
            }

            if (ventaDto.ComisionMonto.HasValue && ventaDto.ComisionMonto.Value > 0)
            {
                var comisionUsuarioId = ventaDto.ComisionUsuarioId ?? ventaDto.UsuarioId;
                var usuarioComision = await _usuarioRepositorio.ObtenerPorIdAsync(comisionUsuarioId);
                var nombreUsuarioComision = usuarioComision?.Nombre ?? comisionUsuarioId.ToString();
                var nombreProducto = producto?.Descripcion ?? ventaDto.ProductoId.ToString();
                
                var gastoComisionVenta = new Gasto
                {
                    TipoGastoId = tipoComisionId,
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
                    Tipo = TipoMovimientoConstants.Comision,
                    Fecha = DateTime.Now,
                    Descripcion = $"COM | {nombreProducto} asignada a {nombreUsuarioComision}",
                    MontoTotal = -ventaDto.ComisionMonto.Value,
                    ReferenciaId = comAgregada.Id,
                    ProductoId = ventaDto.ProductoId
                };
                await _movimientoRepositorio.AgregarAsync(movComisionVenta);
            }

            // Calcular Ganancia y registrar Ingreso SÓLO si la venta está cobrada
            if (venta.EstadoPago == "Cobrado")
            {
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

            return ventaAgregada;
        }
    }
}
