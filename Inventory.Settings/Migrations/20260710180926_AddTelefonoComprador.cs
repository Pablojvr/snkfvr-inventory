using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Inventory.Settings.Migrations
{
    public partial class AddTelefonoComprador : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TelefonoComprador",
                table: "Ventas",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TelefonoComprador",
                table: "Ventas");
        }
    }
}
