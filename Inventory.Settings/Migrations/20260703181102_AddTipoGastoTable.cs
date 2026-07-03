using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Inventory.Settings.Migrations
{
    public partial class AddTipoGastoTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Create TiposGasto table first (before FK reference)
            migrationBuilder.CreateTable(
                name: "TiposGasto",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    EsSistema = table.Column<bool>(type: "boolean", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TiposGasto", x => x.Id);
                });

            // 2. Seed default types
            migrationBuilder.InsertData(
                table: "TiposGasto",
                columns: new[] { "Id", "Activo", "EsSistema", "Nombre" },
                values: new object[,]
                {
                    { 1, true, true, "Producto" },
                    { 2, true, true, "Envío" },
                    { 3, true, true, "Comisión" },
                    { 4, true, false, "Otro" }
                });

            // 3. Add TipoGastoId column with default = 1 (Producto)
            migrationBuilder.AddColumn<int>(
                name: "TipoGastoId",
                table: "Gastos",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // 4. Migrate existing data: map old Tipo string to new TipoGastoId
            migrationBuilder.Sql(@"
                UPDATE ""Gastos"" SET ""TipoGastoId"" = 2 WHERE ""Tipo"" = 'Envío';
                UPDATE ""Gastos"" SET ""TipoGastoId"" = 3 WHERE ""Tipo"" = 'Comisión';
                UPDATE ""Gastos"" SET ""TipoGastoId"" = 1 WHERE ""Tipo"" = 'Calzado' OR ""TipoGastoId"" = 1;
            ");

            // 5. Drop old Tipo column
            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "Gastos");

            // 6. Create index and FK
            migrationBuilder.CreateIndex(
                name: "IX_Gastos_TipoGastoId",
                table: "Gastos",
                column: "TipoGastoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Gastos_TiposGasto_TipoGastoId",
                table: "Gastos",
                column: "TipoGastoId",
                principalTable: "TiposGasto",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Gastos_TiposGasto_TipoGastoId",
                table: "Gastos");

            migrationBuilder.DropIndex(
                name: "IX_Gastos_TipoGastoId",
                table: "Gastos");

            migrationBuilder.DropColumn(
                name: "TipoGastoId",
                table: "Gastos");

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "Gastos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.DropTable(
                name: "TiposGasto");
        }
    }
}
