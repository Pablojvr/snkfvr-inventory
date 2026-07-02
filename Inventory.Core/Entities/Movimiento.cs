using System;

namespace Inventory.Core.Entities
{
    public class Movimiento
    {
        public int Id { get; set; }
        public string Tipo { get; set; } = string.Empty; // 'Compra', 'Salida de dinero', 'Venta'
        public DateTime Fecha { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public decimal MontoTotal { get; set; }
        public int? ReferenciaId { get; set; }
        public int? ProductoId { get; set; }
        public bool Activo { get; set; } = true;
    }
}
