using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "hr");

            migrationBuilder.CreateTable(
                name: "employees",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Role = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Department = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FacilityId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayGrade_Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PayGrade_HourlyRate = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    WeeklyHours = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    VacationBase = table.Column<int>(type: "integer", nullable: false),
                    Active = table.Column<bool>(type: "boolean", nullable: false),
                    Initials = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Personal_Children = table.Column<int>(type: "integer", nullable: false),
                    Personal_MaritalStatus = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Personal_BirthDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Personal_BirthName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Personal_BirthPlace = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Personal_MotherName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Personal_Nationality = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Personal_Address_Street = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Personal_Address_City = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Personal_Address_PostalCode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_Address_Country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Personal_PrivatePhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_PrivateEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Personal_EmergencyContactName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Personal_EmergencyContactPhone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_TajNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_TaxId = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_IdCardNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Personal_BankAccount = table.Column<string>(type: "character varying(34)", maxLength: 34, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employees", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "absences",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    WorkDays = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_absences", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "employee_skills",
                schema: "hr",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Level = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employee_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_employee_skills_employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalSchema: "hr",
                        principalTable: "employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_employees_tenant_id",
                schema: "hr",
                table: "employees",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "ix_employees_email",
                schema: "hr",
                table: "employees",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "ix_absences_tenant_id",
                schema: "hr",
                table: "absences",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "ix_absences_employee_id",
                schema: "hr",
                table: "absences",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_EmployeeId",
                schema: "hr",
                table: "employee_skills",
                column: "EmployeeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "employee_skills",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "absences",
                schema: "hr");

            migrationBuilder.DropTable(
                name: "employees",
                schema: "hr");
        }
    }
}
