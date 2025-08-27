# MCP JSON-RPC API Contracts

This document specifies the JSON-RPC 2.0 contracts used between the Mira client and MCP servers. It includes common conventions, error model, and schemas for core methods.

---

## 1) JSON-RPC Envelope

All requests follow JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "method": "method/name",
  "params": {},
  "id": 1
}
```

Responses:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {}
}
```

Errors:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "Internal error",
    "data": { "detail": "..." }
  }
}
```

Notes
- jsonrpc is always "2.0"
- id may be a number or string, echoed back by server
- params is an object for all methods in this spec

---

## 2) Conventions

- Encoding: UTF-8 unless otherwise specified.
- Timeouts: Clients should apply reasonable timeouts (default 10s except where noted).
- Pagination: Methods that can return many items use cursor + limit.
- ETags: Optional optimistic concurrency control for files.* endpoints.
- Security: Servers must validate paths and enforce allowlists.

---

## 3) Error Model

Servers should use JSON-RPC standard codes where applicable and domain-specific codes otherwise.

Standard JSON-RPC codes
- -32600 Invalid Request
- -32601 Method not found
- -32602 Invalid params
- -32603 Internal error

Domain-specific codes
- 1001 NotFound
- 1002 PermissionDenied
- 1003 ValidationError
- 1004 RateLimited
- 1005 Conflict (e.g., ETag mismatch)
- 1006 ToolUnavailable
- 1007 ContentTooLarge
- 1010 VectorDBUnavailable

Error object schema
```json
{
  "code": 1003,
  "message": "Validation failed",
  "data": {
    "field": "path",
    "reason": "Path outside workspace"
  }
}
```

---

## 4) Method Schemas

The following sections provide JSON Schema-like definitions and examples for each method.

### 4.1 tools/list
Request params schema
```json
{
  "type": "object",
  "properties": {
    "filter": {
      "type": "object",
      "properties": {
        "names": { "type": "array", "items": {"type": "string"} },
        "tags": { "type": "array", "items": {"type": "string"} },
        "enabled": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "cursor": { "type": ["string", "null"] },
    "limit": { "type": "integer", "minimum": 1, "maximum": 200, "default": 50 }
  },
  "additionalProperties": false
}
```

Result schema
```json
{
  "type": "object",
  "properties": {
    "tools": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "version": { "type": "string" },
          "input_schema": { "type": "object" },
          "output_schema": { "type": ["object", "null"] },
          "tags": { "type": "array", "items": {"type": "string"} },
          "auth_required": { "type": "boolean" },
          "rate_limit": { "type": ["object", "null"] },
          "server": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "transport": { "type": "string", "enum": ["stdio", "http"] },
              "endpoint": { "type": ["string", "null"] }
            },
            "required": ["id", "transport"],
            "additionalProperties": false
          },
          "enabled": { "type": "boolean" }
        },
        "required": ["name", "description", "input_schema", "auth_required", "server", "enabled"],
        "additionalProperties": false
      }
    },
    "next_cursor": { "type": ["string", "null"] }
  },
  "required": ["tools"],
  "additionalProperties": false
}
```

Example request
```json
{ "jsonrpc": "2.0", "method": "tools/list", "params": {"limit": 50}, "id": 1 }
```

Example result
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "files/read",
        "title": "Read File",
        "description": "Read a file from the workspace",
        "version": "1.0.0",
        "input_schema": {"type": "object"},
        "output_schema": {"type": "object"},
        "tags": ["fs"],
        "auth_required": false,
        "rate_limit": null,
        "server": {"id": "fs", "transport": "http", "endpoint": "http://localhost:3001"},
        "enabled": true
      }
    ],
    "next_cursor": null
  }
}
```

---

### 4.2 files/read
Request params schema
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "encoding": { "type": "string", "enum": ["utf-8", "base64"], "default": "utf-8" },
    "max_bytes": { "type": "integer", "minimum": 1 },
    "etag": { "type": ["string", "null"] },
    "offset": { "type": "integer", "minimum": 0 },
    "length": { "type": "integer", "minimum": 1 }
  },
  "required": ["path"],
  "additionalProperties": false
}
```

Result schema
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "content": { "type": ["string", "null"] },
    "content_base64": { "type": ["string", "null"] },
    "encoding": { "type": "string" },
    "size": { "type": "integer" },
    "etag": { "type": "string" },
    "mtime": { "type": "string", "description": "ISO-8601" }
  },
  "required": ["path", "encoding", "size", "etag", "mtime"],
  "additionalProperties": false
}
```

Errors
- 1001 NotFound
- 1002 PermissionDenied
- 1007 ContentTooLarge
- -32602 Invalid params

Example request
```json
{ "jsonrpc": "2.0", "method": "files/read", "params": {"path": "src/main.rs"}, "id": 2 }
```

---

### 4.3 files/write
Request params schema
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "content": { "type": ["string", "null"] },
    "content_base64": { "type": ["string", "null"] },
    "encoding": { "type": "string", "enum": ["utf-8", "base64"], "default": "utf-8" },
    "create": { "type": "boolean", "default": true },
    "overwrite": { "type": "boolean", "default": false },
    "etag": { "type": ["string", "null"] },
    "mode": { "type": ["integer", "null"], "description": "POSIX file mode" },
    "mkdirs": { "type": "boolean", "default": true }
  },
  "required": ["path"],
  "additionalProperties": false
}
```

Result schema
```json
{
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "size": { "type": "integer" },
    "etag": { "type": "string" },
    "mtime": { "type": "string" },
    "created": { "type": "boolean" },
    "overwritten": { "type": "boolean" }
  },
  "required": ["path", "size", "etag", "mtime", "created", "overwritten"],
  "additionalProperties": false
}
```

Errors
- 1005 Conflict (ETag mismatch when overwrite=false or optimistic locking failed)
- 1002 PermissionDenied
- 1003 ValidationError

Example request
```json
{
  "jsonrpc": "2.0",
  "method": "files/write",
  "params": {
    "path": "src/main.rs",
    "content": "fn main() {}",
    "encoding": "utf-8",
    "overwrite": false
  },
  "id": 3
}
```

---

### 4.4 exec/run
Request params schema
```json
{
  "type": "object",
  "properties": {
    "command": { "type": "string" },
    "args": { "type": "array", "items": {"type": "string"}, "default": [] },
    "cwd": { "type": ["string", "null"] },
    "env": { "type": "object", "additionalProperties": {"type": "string"} },
    "timeout_ms": { "type": "integer", "minimum": 1000, "maximum": 600000, "default": 60000 },
    "stdin": { "type": ["string", "null"] },
    "shell": { "type": "boolean", "default": false },
    "stream": { "type": "boolean", "default": false }
  },
  "required": ["command"],
  "additionalProperties": false
}
```

Result schema
```json
{
  "type": "object",
  "properties": {
    "exit_code": { "type": "integer" },
    "stdout": { "type": "string" },
    "stderr": { "type": "string" },
    "duration_ms": { "type": "integer" },
    "timed_out": { "type": "boolean" }
  },
  "required": ["exit_code", "stdout", "stderr", "duration_ms", "timed_out"],
  "additionalProperties": false
}
```

Notes
- If stream=true, servers may emit notifications like `exec/stream` with chunk data; final response still returns aggregated result.

Errors
- 1002 PermissionDenied
- 1003 ValidationError
- -32603 Internal error

Example request
```json
{ "jsonrpc": "2.0", "method": "exec/run", "params": {"command": "cargo", "args": ["build"]}, "id": 4 }
```

---

### 4.5 vector/search
Request params schema
```json
{
  "type": "object",
  "properties": {
    "query": { "type": ["string", "null"] },
    "embedding": { "type": ["array", "null"], "items": {"type": "number"} },
    "top_k": { "type": "integer", "minimum": 1, "maximum": 50, "default": 5 },
    "namespace": { "type": ["string", "null"] },
    "filter": {
      "type": "object",
      "properties": {
        "path_prefix": { "type": ["string", "null"] },
        "tags": { "type": "array", "items": {"type": "string"} }
      },
      "additionalProperties": false
    },
    "include_vectors": { "type": "boolean", "default": false },
    "rerank": { "type": "boolean", "default": true }
  },
  "additionalProperties": false
}
```

Result schema
```json
{
  "type": "object",
  "properties": {
    "matches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "score": { "type": "number" },
          "vector": { "type": ["array", "null"], "items": {"type": "number"} },
          "metadata": {
            "type": "object",
            "properties": {
              "path": { "type": "string" },
              "line_start": { "type": ["integer", "null"] },
              "line_end": { "type": ["integer", "null"] },
              "lang": { "type": ["string", "null"] },
              "commit": { "type": ["string", "null"] },
              "shard_id": { "type": ["string", "null"] },
              "etag": { "type": ["string", "null"] },
              "tags": { "type": "array", "items": {"type": "string"} },
              "snippet": { "type": ["string", "null"] }
            },
            "additionalProperties": false
          }
        },
        "required": ["id", "score", "metadata"],
        "additionalProperties": false
      }
    },
    "usage": {
      "type": "object",
      "properties": {
        "embedding_model": { "type": ["string", "null"] },
        "embed_time_ms": { "type": ["integer", "null"] },
        "rerank_model": { "type": ["string", "null"] }
      },
      "additionalProperties": false
    }
  },
  "required": ["matches"],
  "additionalProperties": false
}
```

Errors
- 1010 VectorDBUnavailable
- 1003 ValidationError

Example request
```json
{
  "jsonrpc": "2.0",
  "method": "vector/search",
  "params": { "query": "authentication middleware", "top_k": 5 },
  "id": 5
}
```

---

## 5) Pagination

For methods supporting pagination, servers return `next_cursor`. Clients should pass it back in subsequent requests until null.

## 6) Versioning

Fields may be added over time. Breaking changes require a new method name (e.g., files/read.v2) or negotiated via a capabilities method (future).

## 7) Security Considerations

- Enforce workspace root and path allowlists for files/*.
- Sanitize command and environment for exec/run.
- Redact secrets in errors and logs.
- Apply rate limiting per tool and per client.

