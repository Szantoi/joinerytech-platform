# SpaceOS.Modules.Maintenance

Preview package for composing the Maintenance module into a SpaceOS shared host.

The host owns authentication and middleware order. The package exports
`MaintenanceModuleBootstrap`, which registers module services and maps module endpoints
through the shared hosting contract. The module ID is `spaceos.maintenance`.

This package is intentionally not a standalone deployment artifact. Its consumer must
provide the shared host configuration, including the Maintenance database connection string.
