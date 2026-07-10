using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Inventory.Core.Entities
{
    public class Venta
    {
        public int Id { get; set; }
        public int ProductoId { get; set; }
        
        public decimal CostoEnvio { get; set; }
        public decimal CostosAdicionales { get; set; }
        public DateTime? FechaVenta { get; set; }
        public decimal PrecioVenta { get; set; }
        public int UsuarioId { get; set; }
        public string? NombreComprador { get; set; }
        public string? TelefonoComprador { get; set; }
        public string? LugarDestino { get; set; }
        public DateTime FechaRegistro { get; set; }
        public DateTime? FechaEntrega { get; set; }

        public bool EsEnvioPersonalizado { get; set; }

        public string Estado { get; set; } = "Reservado";
        public string EstadoPago { get; set; } = "Pendiente";
        public bool Activo { get; set; } = true;
        
        // Navegación
        public Producto? Producto { get; set; }
    }
}
