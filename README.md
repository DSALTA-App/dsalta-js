# Dsalta Node.js SDK

Official Node.js SDK for Dsalta API - File hashing and verification service.

## Installation

```bash
npm install dsalta-node-sdk
# or
yarn add dsalta-node-sdk
```

## Usage

### JavaScript

```javascript
const Dsalta = require("dsalta-node-sdk").default;

const dsalta = new Dsalta({
  apiKey: "your-api-key",
  baseUrl: "https://api.dsalta.com", // Required
  timeout: 5000 // Optional, defaults to 5000ms
});

async function example() {
  const result = await dsalta.hashFile("./document.pdf", {
    author: "John Doe",
    department: "Legal",
  });

  console.log("File:", result.file);
  console.log("File type:", result.fileType);
  console.log("Metadata:", result.data.metadata);
}

example();
```

### TypeScript

```typescript
import Dsalta from "dsalta-node-sdk";
import { FileMetadata } from "dsalta-node-sdk";

const dsalta = new Dsalta({
  apiKey: "your-api-key",
  baseUrl: "https://api.dsalta.com", // Required
  timeout: 5000 // Optional, defaults to 5000ms
});

async function example() {
  const metadata: FileMetadata = {
    author: "John Doe",
    department: "Legal",
  };

  const result = await dsalta.hashFile("./document.pdf", metadata);
  console.log("File:", result.file);
  console.log("File type:", result.fileType);
  console.log("Metadata:", result.data.metadata);
}

example();
```

## API Reference

### Constructor

```typescript
new Dsalta(config: DsaltaConfig)
```

Configuration options:

- `apiKey` (required): Your Dsalta API key
- `baseUrl` (required): The base URL for the Dsalta API 
- `timeout` (optional): Request timeout in milliseconds (default: 5000)

### Methods

#### hashFile(file, metadata?)

Hash a file with optional metadata.

Parameters:

- `file`: File to hash (can be a file path string, Buffer, or ReadStream)
- `metadata` (optional): Object containing metadata to attach to the hash

Returns: Promise<HashFileResponse>

The response includes:

- `success`: boolean indicating if the operation succeeded
- `file`: Original File object
- `filename`: Name of the processed file
- `fileType`: MIME type of the file
- `timestamp`: ISO timestamp of the operation
- `data`: Contains hash and metadata (when success is true)
- `error`: Contains error details (when success is false)

## Example Response

Success case:

```typescript
{
  success: true,
  timestamp: '2024-02-19T19:19:46.776Z',
  file: File,
  filename: 'document.pdf',
  fileType: 'application/pdf',
  data: {
    hash: 'abc123...',
    metadata: {
      author: 'John Doe',
      department: 'Legal'
    },
    base64File: 'base64EncodedContent...'
  }
}
```

Error case:

```typescript
{
  success: false,
  timestamp: '2024-02-19T19:19:46.776Z',
  file: File,
  filename: 'document.pdf',
  fileType: 'application/pdf',
  error: {
    message: 'API authentication failed',
    status: 401,
    code: 'AUTH_ERROR'
  }
}
```

## License

MIT
