using FluentValidation;
using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Common.Behaviors;

/// <summary>
/// MediatR pipeline behavior running the module's FluentValidation validators before
/// each command handler (single shared wiring point: EhsServiceCollectionExtensions —
/// the validators were registered but never executed until this behavior existed).
/// Failures surface as <see cref="ValidationException"/>, which the endpoint layer maps
/// to the documented status: 400 on body-carrying commands, 404 on id-only action routes
/// where an empty id can never match a resource (those routes document no 400).
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (!_validators.Any())
            return await next().ConfigureAwait(false);

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            _validators.Select(v => v.ValidateAsync(context, ct))).ConfigureAwait(false);

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next().ConfigureAwait(false);
    }
}
