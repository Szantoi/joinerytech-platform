using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Data.Configurations;

/// <summary>
/// EF Core entity configuration for the User entity.
/// Maps to jt_core.users table with RLS policy enabled.
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", "jt_core");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.TenantId)
            .IsRequired();

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(u => u.FirstName)
            .HasMaxLength(100);

        builder.Property(u => u.LastName)
            .HasMaxLength(100);

        // JSONB columns for roles and permissions
        builder.Property(u => u.Roles)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(u => u.Permissions)
            .HasColumnType("jsonb")
            .IsRequired();

        builder.Property(u => u.Status)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>();

        builder.Property(u => u.LastLoginAt)
            .IsRequired(false);

        builder.Property(u => u.CreatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        builder.Property(u => u.UpdatedAt)
            .IsRequired()
            .HasDefaultValueSql("NOW()");

        // Indexes
        builder.HasIndex(u => new { u.TenantId, u.Email })
            .IsUnique()
            .HasDatabaseName("unique_email_per_tenant");

        builder.HasIndex(u => new { u.TenantId, u.Status })
            .HasDatabaseName("idx_users_tenant_status");

        builder.HasIndex(u => u.Email)
            .HasDatabaseName("idx_users_email");

        // Navigation
        builder.HasOne(u => u.Tenant)
            .WithMany(t => t.Users)
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(u => u.RefreshTokens)
            .WithOne(rt => rt.User)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
