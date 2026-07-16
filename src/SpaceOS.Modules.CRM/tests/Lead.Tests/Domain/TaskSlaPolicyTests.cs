using FluentAssertions;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Policies;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Domain;

/// <summary>
/// Task SLA policy tests — the portal <c>services/sla.ts</c> +
/// <c>__tests__/taskSla.test.ts</c> mirror (pure functions, boundary values).
/// </summary>
public class TaskSlaPolicyTests
{
    private const int SoonDays = 2;

    private static readonly DateTimeOffset Now = new(2026, 7, 16, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void DueYesterday_IsOverdue()
    {
        TaskSlaPolicy.Compute(Now.AddDays(-1), Now, SoonDays).Should().Be(TaskSla.Overdue);
    }

    [Fact]
    public void DueToday_IsSoon_NotOverdue()
    {
        // The due day itself is not yet late: the deadline runs to end of day.
        TaskSlaPolicy.Compute(Now, Now, SoonDays).Should().Be(TaskSla.Soon);
    }

    [Fact]
    public void DueWithinWindow_IsSoon()
    {
        TaskSlaPolicy.Compute(Now.AddDays(SoonDays), Now, SoonDays).Should().Be(TaskSla.Soon);
    }

    [Fact]
    public void DueJustOutsideWindow_IsOk()
    {
        TaskSlaPolicy.Compute(Now.AddDays(SoonDays + 1), Now, SoonDays).Should().Be(TaskSla.Ok);
    }

    [Fact]
    public void CompletedTask_NeverBreaches()
    {
        TaskSlaPolicy
            .Compute(Now.AddDays(-30), Now, SoonDays, isCompleted: true)
            .Should().Be(TaskSla.Ok);
    }

    [Fact]
    public void SoonWindow_IsConfigurable_NotHardcoded()
    {
        var dueIn5Days = Now.AddDays(5);

        TaskSlaPolicy.Compute(dueIn5Days, Now, soonDays: 2).Should().Be(TaskSla.Ok);
        TaskSlaPolicy.Compute(dueIn5Days, Now, soonDays: 7).Should().Be(TaskSla.Soon);
    }

    [Theory]
    [InlineData(-3, -3)]
    [InlineData(0, 0)]
    [InlineData(4, 4)]
    public void DaysUntilDue_CountsToEndOfDueDay(int dueInDays, int expectedDays)
    {
        TaskSlaPolicy.DaysUntilDue(Now.AddDays(dueInDays), Now).Should().Be(expectedDays);
    }
}
