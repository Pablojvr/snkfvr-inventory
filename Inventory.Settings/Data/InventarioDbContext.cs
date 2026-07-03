using Inventory.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Settings.Data
{
    public class InventarioDbContext : DbContext
    {
        public InventarioDbContext(DbContextOptions<InventarioDbContext> options) : base(options)
        {
        }

        public DbSet<Producto> Productos { get; set; } = null!;
        public DbSet<Gasto> Gastos { get; set; } = null!;
        public DbSet<Venta> Ventas { get; set; } = null!;
        public DbSet<Movimiento> Movimientos { get; set; } = null!;
        public DbSet<Usuario> Usuarios { get; set; } = null!;
        public DbSet<Ingreso> Ingresos { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Precisión para decimales
            modelBuilder.Entity<Gasto>().Property(e => e.Monto).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Venta>().Property(s => s.CostoEnvio).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Venta>().Property(s => s.CostosAdicionales).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Venta>().Property(s => s.PrecioVenta).HasColumnType("decimal(18,2)");
            modelBuilder.Entity<Movimiento>().Property(m => m.MontoTotal).HasColumnType("decimal(18,2)");

            // Filtros globales para Soft Delete
            modelBuilder.Entity<Producto>().HasQueryFilter(p => p.Activo);
            modelBuilder.Entity<Gasto>().HasQueryFilter(e => e.Activo);
            modelBuilder.Entity<Venta>().HasQueryFilter(s => s.Activo);
            modelBuilder.Entity<Movimiento>().HasQueryFilter(m => m.Activo);
        }
    }
}
