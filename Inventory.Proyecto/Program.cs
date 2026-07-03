using Microsoft.EntityFrameworkCore;
using System;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Agregar servicios al contenedor.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configurar DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (!string.IsNullOrEmpty(connectionString) && (connectionString.StartsWith("postgres://") || connectionString.StartsWith("postgresql://")))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={(uri.IsDefaultPort ? 5432 : uri.Port)};Username={userInfo[0]};Password={(userInfo.Length > 1 ? userInfo[1] : "")};Database={uri.AbsolutePath.TrimStart('/')};Ssl Mode=Require;Trust Server Certificate=true;";
}

builder.Services.AddDbContext<Inventory.Settings.Data.InventarioDbContext>(options =>
    options.UseNpgsql(connectionString));

// Configurar Inyección de Dependencias para Repositorios
builder.Services.AddScoped(typeof(Inventory.Core.Interfaces.IRepositorio<>), typeof(Inventory.Settings.Repositories.Repositorio<>));

// Configurar Inyección de Dependencias para Casos de Uso
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarVentaUseCase, Inventory.Application.UseCases.RegistrarVentaUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarGastoUseCase, Inventory.Application.UseCases.RegistrarGastoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IObtenerMovimientosUseCase, Inventory.Application.UseCases.ObtenerMovimientosUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarProductoUseCase, Inventory.Application.UseCases.RegistrarProductoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarIngresoUseCase, Inventory.Application.UseCases.RegistrarIngresoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarGastoUseCase, Inventory.Application.UseCases.EditarGastoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEliminarGastoUseCase, Inventory.Application.UseCases.EliminarGastoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarProductoUseCase, Inventory.Application.UseCases.EditarProductoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarVentaUseCase, Inventory.Application.UseCases.EditarVentaUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarIngresoUseCase, Inventory.Application.UseCases.EditarIngresoUseCase>();

// Configurar CORS para permitir que Angular se conecte
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVercel", policy =>
    {
        policy.WithOrigins(
                "https://snkfvr-inventory.vercel.app",
                "http://localhost:4200"
              )
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Aplicar migraciones automáticamente y sembrar datos
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<Inventory.Settings.Data.InventarioDbContext>();
    dbContext.Database.Migrate();

    // La lógica de limpieza automática ha sido removida por seguridad.
    // Ahora se debe usar el endpoint de limpieza (SystemController) si se requiere limpiar la base de datos.
    if (!dbContext.Usuarios.Any())
    {
        dbContext.Usuarios.AddRange(
            new Inventory.Core.Entities.Usuario { Nombre = "Javier" },
            new Inventory.Core.Entities.Usuario { Nombre = "Fabri" },
            new Inventory.Core.Entities.Usuario { Nombre = "Alesito" }
        );
        dbContext.SaveChanges();
    }
}

// CORS debe ir antes de routing y authorization
app.UseRouting();
app.UseCors("AllowVercel");

// Configurar el pipeline de peticiones HTTP.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
