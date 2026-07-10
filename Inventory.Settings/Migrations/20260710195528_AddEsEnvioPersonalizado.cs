using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Settings.Migrations
{
    public partial class AddEsEnvioPersonalizado : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsEnvioPersonalizado",
                table: "Ventas",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsEnvioPersonalizado",
                table: "Ventas");
        }
    }
}
