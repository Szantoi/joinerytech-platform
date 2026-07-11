using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Infrastructure.Persistence.Configurations;

/// <summary>
/// Employee aggregate entity type configuration with owned entities and collections.
/// </summary>
public class EmployeeEntityTypeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("employees", "hr");

        // Primary key
        builder.HasKey(e => e.Id);

        // StronglyTypedId conversion (DMS pattern)
        builder.Property(e => e.Id)
            .HasConversion(
                id => id.Value,
                value => new EmployeeId(value)
            )
            .IsRequired();

        // TenantId for RLS (multi-tenancy)
        builder.Property(e => e.TenantId)
            .IsRequired();

        builder.HasIndex(e => e.TenantId)
            .HasDatabaseName("ix_employees_tenant_id");

        // Name
        builder.Property(e => e.Name)
            .HasMaxLength(200)
            .IsRequired();

        // Role
        builder.Property(e => e.Role)
            .HasMaxLength(100)
            .IsRequired();

        // Department (enum as string)
        builder.Property(e => e.Department)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        // FacilityId
        builder.Property(e => e.FacilityId)
            .IsRequired();

        // PayGrade (owned value object)
        builder.OwnsOne(e => e.PayGrade, payGrade =>
        {
            payGrade.Property(p => p.Name)
                .HasMaxLength(50)
                .IsRequired();

            payGrade.Property(p => p.HourlyRate)
                .HasPrecision(10, 2)
                .IsRequired();
        });

        // WeeklyHours
        builder.Property(e => e.WeeklyHours)
            .HasPrecision(5, 2)
            .IsRequired();

        // Email
        builder.Property(e => e.Email)
            .HasMaxLength(200)
            .IsRequired();

        builder.HasIndex(e => e.Email)
            .HasDatabaseName("ix_employees_email");

        // VacationBase
        builder.Property(e => e.VacationBase)
            .IsRequired();

        // Active
        builder.Property(e => e.Active)
            .IsRequired();

        // Initials
        builder.Property(e => e.Initials)
            .HasMaxLength(10)
            .IsRequired();

        // PersonalData (owned entity) - sensitive HR data
        builder.OwnsOne(e => e.Personal, personal =>
        {
            personal.Property(p => p.Children)
                .IsRequired();

            personal.Property(p => p.MaritalStatus)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();

            personal.Property(p => p.BirthDate)
                .IsRequired();

            personal.Property(p => p.BirthName)
                .HasMaxLength(200)
                .IsRequired();

            personal.Property(p => p.BirthPlace)
                .HasMaxLength(200)
                .IsRequired();

            personal.Property(p => p.MotherName)
                .HasMaxLength(200)
                .IsRequired();

            personal.Property(p => p.Nationality)
                .HasMaxLength(10)
                .IsRequired();

            // Address (nested owned type)
            personal.OwnsOne(p => p.Address, address =>
            {
                address.Property(a => a.Street)
                    .HasMaxLength(500);

                address.Property(a => a.City)
                    .HasMaxLength(200);

                address.Property(a => a.PostalCode)
                    .HasMaxLength(20);

                address.Property(a => a.Country)
                    .HasMaxLength(100);
            });

            personal.Property(p => p.PrivatePhone)
                .HasMaxLength(20);

            personal.Property(p => p.PrivateEmail)
                .HasMaxLength(200);

            personal.Property(p => p.EmergencyContactName)
                .HasMaxLength(200);

            personal.Property(p => p.EmergencyContactPhone)
                .HasMaxLength(20);

            // Hungarian legal identifiers
            personal.Property(p => p.TajNumber)
                .HasMaxLength(20);

            personal.Property(p => p.TaxId)
                .HasMaxLength(20);

            personal.Property(p => p.IdCardNumber)
                .HasMaxLength(20);

            personal.Property(p => p.BankAccount)
                .HasMaxLength(34);
        });

        // Skills (owned collection)
        builder.OwnsMany(e => e.Skills, skills =>
        {
            skills.ToTable("employee_skills", "hr");
            skills.WithOwner().HasForeignKey("EmployeeId");

            // Shadow key for EF Core
            skills.Property<Guid>("Id");
            skills.HasKey("Id");

            // SkillKey (enum)
            skills.Property(s => s.Key)
                .HasConversion<string>()
                .HasMaxLength(100)
                .IsRequired();

            // SkillLevel (enum)
            skills.Property(s => s.Level)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();
        });
    }
}
