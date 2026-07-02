using System;
using System.Threading.Tasks;
using Inventory.Application.DTOs;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;

namespace Inventory.Application.UseCases
{
    public interface IRegistrarIngresoUseCase
    {
        Task<Ingreso> EjecutarAsync(IngresoDto ingresoDto);
    }

    public class RegistrarIngresoUseCase : IRegistrarIngresoUseCase
    {
        private readonly IRepositorio<Ingreso> _ingresoRepositorio;
        private readonly IRepositorio<Movimiento> _movimientoRepositorio;

        public RegistrarIngresoUseCase(IRepositorio<Ingreso> ingresoRepositorio, IRepositorio<Movimiento> movimientoRepositorio)
        {
            _ingresoRepositorio = ingresoRepositorio;
            _movimientoRepositorio = movimientoRepositorio;
        }

        public async Task<Ingreso> EjecutarAsync(IngresoDto ingresoDto)
        {
            var ingreso = new Ingreso
            {
                Motivo = ingresoDto.Motivo,
                Monto = ingresoDto.Monto,
                Fecha = ingresoDto.Fecha != default ? ingresoDto.Fecha : DateTime.Now,
                UsuarioId = ingresoDto.UsuarioId,
                Activo = true
            };

            var ingresoAgregado = await _ingresoRepositorio.AgregarAsync(ingreso);

            var movimiento = new Movimiento
            {
                Tipo = "Ingreso",
                Fecha = ingresoAgregado.Fecha,
                Descripcion = $"Ingreso de efectivo: {ingresoAgregado.Motivo} por usuario ID {ingresoAgregado.UsuarioId}",
                MontoTotal = ingresoAgregado.Monto,
                ReferenciaId = ingresoAgregado.Id
            };

            await _movimientoRepositorio.AgregarAsync(movimiento);

            return ingresoAgregado;
        }
    }
}
