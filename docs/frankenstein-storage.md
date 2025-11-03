# Frankenstein Cloud Storage System

The Frankenstein Cloud Storage system is an innovative aggregation solution that unifies multiple freemium cloud storage services into a single, searchable, and automated backup system.

## Purpose

The system addresses the common inefficiency of having files scattered across multiple cloud storage providers with no unified search, backup, or space management. It aggregates storage from services like Dropbox (15GB), Google Drive (15GB), and MEGA (20GB) into a single interface.

## Features

- **Unified Search**: Search for files across all connected cloud storage providers simultaneously
- **Automatic Backup**: Automatically backup files to multiple providers based on available space
- **Intelligent Rotation**: Move files between providers when space limits are reached
- **Centralized Management**: View and manage all files from one interface
- **Space Rebalancing**: Automatically redistribute files when providers approach storage limits
- **Multi-Provider Resilience**: Store copies of important files across multiple providers

## Supported Providers

- Dropbox
- Google Drive
- MEGA
- (Extensible to other cloud storage providers)

## Integration

The Frankenstein Cloud Storage system integrates seamlessly with the FreebeeZ orchestration system and can be added as a service through the service templates system.

## Setup

1. Obtain API tokens for each cloud storage provider you want to connect
2. Configure the tokens in the system
3. The aggregator will automatically manage storage distribution

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Frankenstein Cloud Storage                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Dropbox   │  │  Google Drive │  │      MEGA       │ │
│  │   Provider  │  │   Provider    │  │   Provider      │ │
│  └─────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│               Cloud Storage Aggregator Core                 │
├─────────────────────────────────────────────────────────────┤
│      Unified Search • Backup Manager • Rebalancing        │
└─────────────────────────────────────────────────────────────┘
```

## Usage

The system can be accessed through:
- TypeScript API for programmatic access
- React UI component for user interaction
- Service integration for automated operations

## Backup Strategies

- **Space-Based**: Automatically backup to providers with available space
- **Rotate**: Distribute files evenly across providers
- **All**: Maintain copies on all providers (for critical files)

## Rebalancing

When providers approach 90% capacity, the system automatically moves files to providers with more available space, ensuring optimal space utilization across all connected services.