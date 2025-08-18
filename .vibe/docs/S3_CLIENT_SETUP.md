# AWS S3 Client Setup Guide for BIDS Collector

This project uses **AWS S3 SDK** for downloading datasets from S3 and S3-compatible services like OpenNeuro, CCNDC, etc.

## Features

- **Direct S3 integration**: Uses AWS SDK for S3 operations
- **Progress reporting**: Real-time download progress updates
- **Cross-platform**: Works on all platforms without external dependencies
- **S3 compatibility**: Supports AWS S3, MinIO, and other S3-compatible services
- **Automatic retry**: Built-in error handling and retry mechanisms

## How It Works

1. **Storage Configuration**: Configure S3 source locations (data providers) and local destination locations
2. **Dataset Discovery**: Browse and select datasets from the Dataset page
3. **Download Tasks**: Create collection tasks that will download from S3 to local storage
4. **Real Downloads**: Tasks now actually download files using AWS S3 SDK instead of simulation

## Storage Location Setup

### Source Locations (S3-compatible)
Configure S3 storage locations for your data providers:

- **OpenNeuro**: Configure S3 endpoint for OpenNeuro datasets
- **CCNDC**: Configure S3 endpoint for CCNDC datasets  
- **Custom providers**: Add any S3-compatible service

Required fields:
- **Name**: Display name (e.g., "OpenNeuro S3")
- **Endpoint**: S3 endpoint URL
- **Region**: AWS region (e.g., "us-east-1")
- **Bucket Name**: The bucket containing datasets
- **Access Key ID**: S3 access credentials
- **Secret Access Key**: S3 secret credentials

### Destination Locations (Local)
Configure local storage paths where datasets will be downloaded:

- **Name**: Display name (e.g., "Local Storage")
- **Path**: Local directory path (e.g., "/data/datasets")

## Download Process

1. **Select Dataset**: Choose a dataset from the Dataset page
2. **Choose Destinations**: Select one or more local storage locations
3. **Create Task**: Collection task is created with DOI-based folder naming
4. **Start Download**: Click "Start" on the collection task to begin actual download
5. **Monitor Progress**: Real-time progress updates with file transfer status

## Benefits

- ✅ **No external dependencies**: Uses built-in AWS SDK
- ✅ **Real file downloads**: Actually downloads and saves files to local storage
- ✅ **Progress tracking**: Shows real download progress and speeds
- ✅ **Error handling**: Automatic retries and detailed error messages
- ✅ **DOI-based naming**: Uses full DOI as folder names for organization
- ✅ **Multi-destination**: Can download to multiple local locations simultaneously

## Troubleshooting

### "No S3 source location found" error
- Ensure you have configured an S3 storage location for the dataset provider
- Check that the provider name matches (e.g., "OpenNeuro", "CCNDC")

### Permission errors
- Verify your S3 credentials have read access to the bucket
- Check that the access key and secret key are correct

### Network issues
- Check your internet connection
- Verify the S3 endpoint URL is accessible
- Ensure firewall allows S3 connections
