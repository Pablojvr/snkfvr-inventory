using System;

namespace Inventory.Application.DTOs
{
    public class GastoDto
    {
        public string Motivo { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public int UsuarioId { get; set; }
        public decimal Monto { get; set; }
        public DateTime FechaIngreso { get; set; }
        public int TipoGastoId { get; set; } = 1; // Default: Producto (Id=1)
        public int? ProductoId { get; set; }
        public decimal? ComisionMonto { get; set; }
        public int? ComisionUsuarioId { get; set; }
    }
}
