using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Settings.Migrations
{
    public partial class RemoveCostoFromProducto : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Costo",
                table: "Productos");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Costo",
                table: "Productos",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
