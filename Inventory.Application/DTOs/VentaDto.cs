using System;

namespace Inventory.Application.DTOs
{
    public class VentaDto
    {
        public int ProductoId { get; set; }
        public decimal CostoEnvio { get; set; }
        public decimal CostosAdicionales { get; set; }
        public DateTime? FechaVenta { get; set; }
        public decimal PrecioVenta { get; set; }
        public int UsuarioId { get; set; }
        public string? NombreComprador { get; set; }
        public string? LugarDestino { get; set; }
        public DateTime FechaRegistro { get; set; }
        public string Estado { get; set; } = "Reservado";
    }
}
