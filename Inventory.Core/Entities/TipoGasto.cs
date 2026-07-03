using System;

namespace Inventory.Core.Entities
{
    public class TipoGasto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public bool EsSistema { get; set; } = false;
        public bool Activo { get; set; } = true;
    }
}
