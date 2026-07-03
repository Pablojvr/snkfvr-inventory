using System;

namespace Inventory.Core.Entities
{
    public class Producto
    {
        public int Id { get; set; }
        public string Descripcion { get; set; } = string.Empty;
        public DateTime FechaCompra { get; set; }
        public string Estado { get; set; } = "Disponible";
        public bool Activo { get; set; } = true;
    }
}
