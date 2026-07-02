using System.Collections.Generic;
using System.Threading.Tasks;
using Inventory.Core.Interfaces;
using Inventory.Settings.Data;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Settings.Repositories
{
    public class Repositorio<T> : IRepositorio<T> where T : class
    {
        private readonly InventarioDbContext _contexto;
        private readonly DbSet<T> _dbSet;

        public Repositorio(InventarioDbContext contexto)
        {
            _contexto = contexto;
            _dbSet = contexto.Set<T>();
        }

        public async Task<T?> ObtenerPorIdAsync(int id)
        {
            return await _dbSet.FindAsync(id);
        }

        public async Task<IEnumerable<T>> ObtenerTodosAsync()
        {
            return await _dbSet.ToListAsync();
        }

        public async Task<T> AgregarAsync(T entidad)
        {
            await _dbSet.AddAsync(entidad);
            await _contexto.SaveChangesAsync();
            return entidad;
        }

        public async Task ActualizarAsync(T entidad)
        {
            _dbSet.Update(entidad);
            await _contexto.SaveChangesAsync();
        }

        public async Task EliminarAsync(int id)
        {
            var entidad = await _dbSet.FindAsync(id);
            if (entidad != null)
            {
                // Soft Delete: Intentamos setear Activo a false si la propiedad existe
                var propiedadActivo = entidad.GetType().GetProperty("Activo");
                if (propiedadActivo != null)
                {
                    propiedadActivo.SetValue(entidad, false);
                    _dbSet.Update(entidad);
                }
                else
                {
                    _dbSet.Remove(entidad);
                }
                await _contexto.SaveChangesAsync();
            }
        }
    }
}
