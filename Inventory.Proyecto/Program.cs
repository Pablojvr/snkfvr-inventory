using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Agregar servicios al contenedor.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configurar DbContext
builder.Services.AddDbContext<Inventory.Settings.Data.InventarioDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configurar Inyección de Dependencias para Repositorios
builder.Services.AddScoped(typeof(Inventory.Core.Interfaces.IRepositorio<>), typeof(Inventory.Settings.Repositories.Repositorio<>));

// Configurar Inyección de Dependencias para Casos de Uso
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarVentaUseCase, Inventory.Application.UseCases.RegistrarVentaUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarGastoUseCase, Inventory.Application.UseCases.RegistrarGastoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IObtenerMovimientosUseCase, Inventory.Application.UseCases.ObtenerMovimientosUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarProductoUseCase, Inventory.Application.UseCases.RegistrarProductoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IRegistrarIngresoUseCase, Inventory.Application.UseCases.RegistrarIngresoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarGastoUseCase, Inventory.Application.UseCases.EditarGastoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarProductoUseCase, Inventory.Application.UseCases.EditarProductoUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarVentaUseCase, Inventory.Application.UseCases.EditarVentaUseCase>();
builder.Services.AddScoped<Inventory.Application.UseCases.IEditarIngresoUseCase, Inventory.Application.UseCases.EditarIngresoUseCase>();

// Configurar CORS para permitir que Angular se conecte
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Usar CORS antes de la autorización
app.UseCors("AllowAll");

// Aplicar migraciones automáticamente
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<Inventory.Settings.Data.InventarioDbContext>();
    dbContext.Database.Migrate();
}

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
