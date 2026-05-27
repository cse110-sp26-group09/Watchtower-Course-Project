# Architecture Documentation

This is the WatchTower documentation index for WatchTower's Architecture. This folder contains all project documentation needed to understand, develop, and maintain the architecture for WatchTower observability platform.

# Purpose 
This documentation directory serves as the source of truth for 
- [api-contract-v1.md](api-contract-v1.md): - This explains what APIs we are using 
- [event-schema-v1.md](event-schema-v1.md) - This provides a template for backend about how events should do in order to keep some cannonicity between candidates in order for front-end candiates to be universal
- [event-storage.md](event-storage.md) - Prototype 1 SQLite event storage layer, schema, and the local verification flow used before promoting the script to external pages.
- [external-test-app-plan.md](external-test-app-plan.md) - This is a plan for how to mantain and expand the test application for WatchTower to test features.
- [system-overview.md](architecture/system-overview.md) - This gives an overview of what dependencies WatchTower uses