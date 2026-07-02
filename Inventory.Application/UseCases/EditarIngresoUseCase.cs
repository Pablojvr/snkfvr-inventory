using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using System.Linq;

namespace Inventory.Application.UseCases
{
    public interface IEditarIngresoUseCase
    {
        Task<Ingreso> EjecutarAsync(int id, IngresoDto ingresoDto);
    }

    public class EditarIngresoUseCase : IEditarIngresoUseCase
    {
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;

        public EditarIngresoUseCase(
            IRepositorio<Ingreso> ingresoRepositorio,
            IRepositorio<Movimiento> movimientoRepositorio)
        {
            _ingresoRepositorio = ingresoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
        }

        public async Task<Ingreso> EjecutarAsync(int id, IngresoDto ingresoDto)
        {
            var ingreso = await _ingresoRepositorio.ObtenerPorIdAsync(id);
            if (ingreso == null) throw new Exception("Ingreso no encontrado");

            ingreso.Motivo = ingresoDto.Motivo;
            ingreso.Monto = ingresoDto.Monto;
            ingreso.Fecha = ingresoDto.Fecha;
            ingreso.UsuarioId = ingresoDto.UsuarioId;

            await _ingresoRepositorio.ActualizarAsync(ingreso);

            var movimientos = await _movimientoRepositorio.ObtenerTodosAsync();
            var mov = movimientos.FirstOrDefault(m => m.ReferenciaId == id && m.Tipo == "Ingreso");

            if (mov != null)
            {
                mov.MontoTotal = ingresoDto.Monto;
                mov.Descripcion = $"Ingreso: {ingresoDto.Motivo} registrado por el usuario {ingresoDto.UsuarioId}";
                await _movimientoRepositorio.ActualizarAsync(mov);
            }

            return ingreso;
        }
    }
}
