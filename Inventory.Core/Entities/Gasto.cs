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
        public string Tipo { get; set; } = "Calzado";
        public bool Activo { get; set; } = true;
        
        public int? ProductoId { get; set; }
        public Producto? Producto { get; set; }
    }
}
