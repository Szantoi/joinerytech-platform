namespace Production.Tests.Mocks;

/// <summary>
/// Spy for capturing notifications sent during tests.
/// </summary>
public class NotificationSpy
{
    private readonly List<NotificationRecord> _sentNotifications = new();

    /// <summary>
    /// Gets all notifications that were sent.
    /// </summary>
    public IReadOnlyList<NotificationRecord> SentNotifications => _sentNotifications.AsReadOnly();

    /// <summary>
    /// Records a notification as sent.
    /// </summary>
    public void Record(string recipient, string message)
    {
        _sentNotifications.Add(new NotificationRecord(recipient, message, DateTimeOffset.UtcNow));
    }

    /// <summary>
    /// Clears all recorded notifications.
    /// </summary>
    public void Clear()
    {
        _sentNotifications.Clear();
    }
}

/// <summary>
/// Represents a recorded notification.
/// </summary>
public record NotificationRecord(string Recipient, string Message, DateTimeOffset SentAt);
