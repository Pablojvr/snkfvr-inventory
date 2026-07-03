using System;

namespace Inventory.Core.Entities
{
    public class Gasto
    {
        public int Id { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public DateTime Fecha { get; set; }
        public int UsuarioId { get; set; }
        public decimal Monto { get; set; }
        public DateTime FechaIngreso { get; set; }
        public int TipoGastoId { get; set; }
        public TipoGasto? TipoGasto { get; set; }
        public bool Activo { get; set; } = true;
        
        public int? ProductoId { get; set; }
        public Producto? Producto { get; set; }
    }
}
