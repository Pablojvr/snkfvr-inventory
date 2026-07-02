using System;

namespace Inventory.Application.DTOs
{
    public class IngresoDto
    {
        public int Id { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public DateTime Fecha { get; set; }
        public int UsuarioId { get; set; }
    }
}
