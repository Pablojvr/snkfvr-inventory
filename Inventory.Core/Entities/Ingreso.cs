using System;

namespace Inventory.Core.Entities
{
    public class Ingreso
    {
        public int Id { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public DateTime Fecha { get; set; }
        public int UsuarioId { get; set; }
        public bool Activo { get; set; } = true;
    }
}
