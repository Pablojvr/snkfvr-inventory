using System.Threading.Tasks;
using Inventory.Core.Entities;
using Inventory.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.Proyecto.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly IRepositorio<Usuario> _usuarioRepositorio;

        public UsuariosController(IRepositorio<Usuario> usuarioRepositorio)
        {
            _usuarioRepositorio = usuarioRepositorio;
        }

        [HttpGet]
        public async Task<IActionResult> ObtenerUsuarios()
        {
            var usuarios = await _usuarioRepositorio.ObtenerTodosAsync();
            return Ok(usuarios);
        }

        [HttpPost]
        public async Task<IActionResult> CrearUsuario([FromBody] Usuario usuario)
        {
            var usuarioAgregado = await _usuarioRepositorio.AgregarAsync(usuario);
            return Ok(usuarioAgregado);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarUsuario(int id)
        {
            await _usuarioRepositorio.EliminarAsync(id);
            return Ok(new { message = "Usuario desactivado correctamente." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> EditarUsuario(int id, [FromBody] Usuario usuario)
        {
            var usuarioDb = await _usuarioRepositorio.ObtenerPorIdAsync(id);
            if (usuarioDb == null) return NotFound();

            usuarioDb.Nombre = usuario.Nombre;
            await _usuarioRepositorio.ActualizarAsync(usuarioDb);
            return Ok(usuarioDb);
        }
    }
}
