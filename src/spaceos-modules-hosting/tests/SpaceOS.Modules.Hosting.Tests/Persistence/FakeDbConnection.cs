using System.Data;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;

namespace SpaceOS.Modules.Hosting.Tests.Persistence;

/// <summary>
/// Minimal recording <see cref="DbConnection"/> so the interceptor contract is testable
/// without Docker/PostgreSQL: every executed command's text and parameters are captured,
/// and failures can be injected to prove the fail-loud behaviour.
/// </summary>
internal sealed class FakeDbConnection : DbConnection
{
    /// <summary>Recorded (CommandText, ParameterName→Value) pairs, in execution order.</summary>
    public List<(string CommandText, Dictionary<string, object?> Parameters)> ExecutedCommands { get; } = [];

    /// <summary>When set, every command execution throws this exception.</summary>
    public Exception? ThrowOnExecute { get; set; }

    [AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "fake";
    public override string DataSource => "fake";
    public override string ServerVersion => "0.0";
    public override ConnectionState State => ConnectionState.Open;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() { }
    public override void Open() { }

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
        => throw new NotSupportedException();

    protected override DbCommand CreateDbCommand() => new FakeDbCommand(this);

    private sealed class FakeDbCommand(FakeDbConnection owner) : DbCommand
    {
        private readonly FakeParameterCollection _parameters = [];

        [AllowNull]
        public override string CommandText { get; set; } = string.Empty;
        public override int CommandTimeout { get; set; }
        public override CommandType CommandType { get; set; }
        public override bool DesignTimeVisible { get; set; }
        public override UpdateRowSource UpdatedRowSource { get; set; }
        protected override DbConnection? DbConnection { get; set; }
        protected override DbParameterCollection DbParameterCollection => _parameters;
        protected override DbTransaction? DbTransaction { get; set; }

        public override void Cancel() { }
        public override void Prepare() { }

        public override int ExecuteNonQuery()
        {
            if (owner.ThrowOnExecute is { } failure)
                throw failure;

            owner.ExecutedCommands.Add((
                CommandText,
                _parameters.Items.ToDictionary(static p => p.ParameterName, static p => p.Value)));
            return 1;
        }

        public override object? ExecuteScalar() => ExecuteNonQuery();

        protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
            => throw new NotSupportedException();

        protected override DbParameter CreateDbParameter() => new FakeParameter();
    }

    private sealed class FakeParameter : DbParameter
    {
        public override DbType DbType { get; set; }
        public override ParameterDirection Direction { get; set; }
        public override bool IsNullable { get; set; }
        [AllowNull]
        public override string ParameterName { get; set; } = string.Empty;
        public override int Size { get; set; }
        [AllowNull]
        public override string SourceColumn { get; set; } = string.Empty;
        public override bool SourceColumnNullMapping { get; set; }
        public override object? Value { get; set; }
        public override void ResetDbType() { }
    }

    private sealed class FakeParameterCollection : DbParameterCollection
    {
        public List<DbParameter> Items { get; } = [];

        public override int Count => Items.Count;
        public override object SyncRoot => Items;

        public override int Add(object value)
        {
            Items.Add((DbParameter)value);
            return Items.Count - 1;
        }

        public override void AddRange(Array values)
        {
            foreach (var value in values) Add(value!);
        }

        public override void Clear() => Items.Clear();
        public override bool Contains(object value) => Items.Contains((DbParameter)value);
        public override bool Contains(string value) => Items.Exists(p => p.ParameterName == value);
        public override void CopyTo(Array array, int index) => ((System.Collections.ICollection)Items).CopyTo(array, index);
        public override System.Collections.IEnumerator GetEnumerator() => Items.GetEnumerator();
        public override int IndexOf(object value) => Items.IndexOf((DbParameter)value);
        public override int IndexOf(string parameterName) => Items.FindIndex(p => p.ParameterName == parameterName);
        public override void Insert(int index, object value) => Items.Insert(index, (DbParameter)value);
        public override void Remove(object value) => Items.Remove((DbParameter)value);
        public override void RemoveAt(int index) => Items.RemoveAt(index);
        public override void RemoveAt(string parameterName) => Items.RemoveAll(p => p.ParameterName == parameterName);
        protected override DbParameter GetParameter(int index) => Items[index];
        protected override DbParameter GetParameter(string parameterName) => Items.First(p => p.ParameterName == parameterName);
        protected override void SetParameter(int index, DbParameter value) => Items[index] = value;
        protected override void SetParameter(string parameterName, DbParameter value)
            => Items[IndexOf(parameterName)] = value;
    }
}
