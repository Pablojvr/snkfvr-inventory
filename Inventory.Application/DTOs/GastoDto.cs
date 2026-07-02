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
        public string Tipo { get; set; } = "Calzado";
        public int? ProductoId { get; set; }
    }
}
