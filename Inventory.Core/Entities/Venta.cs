using System;

namespace Inventory.Core.Entities
{
    public class Venta
    {
        public int Id { get; set; }
        public int ProductoId { get; set; }
        public Producto? Producto { get; set; }
        
        public decimal CostoEnvio { get; set; }
        public decimal CostosAdicionales { get; set; }
        public DateTime? FechaVenta { get; set; }
        public decimal PrecioVenta { get; set; }
        public int UsuarioId { get; set; }
        public DateTime FechaRegistro { get; set; }
        public string Estado { get; set; } = "Reservado";
        public bool Activo { get; set; } = true;
    }
}
