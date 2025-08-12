# Telnect API Documentation

## Overview

This document provides comprehensive documentation for the Telnect API, a telecommunications platform that offers voice calling, SMS, and phone line management capabilities.

**Base URL:** `https://bss.telnect.com/api/v1`

**Authentication:** Bearer Token (required for all endpoints)

## Table of Contents

1. [Voice APIs](#voice-apis)
2. [Phone Line Management](#phone-line-management)
3. [Call Management](#call-management)
4. [Authentication](#authentication)
5. [Common Response Formats](#common-response-formats)

---

## Voice APIs

### 1. Create Outbound Call

**Endpoint:** `POST /Calls`

**Description:** Initiates an outbound call from a specified source to a destination.

**Request Body:**
```json
{
  "source": {
    "type": "phone",
    "number": "+4610100555"
  },
  "destination": {
    "type": "phone", 
    "number": "+46890510"
  },
  "options": {
    "record": false,
    "timeout": 30
  }
}
```

**Parameters:**
- `source.type` (string, required): Type of source ("phone")
- `source.number` (string, required): Source phone number
- `destination.type` (string, required): Type of destination ("phone")
- `destination.number` (string, required): Destination phone number
- `options.record` (boolean, optional): Whether to record the call
- `options.timeout` (integer, optional): Call timeout in seconds

**Response:**
```json
{
  "id": "c000daeuyzzoq-za3wqdi-ycuaugy-jmqq",
  "url": "https://api.telnect.com/v1/Calls/c000daeuyzzoq-za3wqdi-ycuaugy-jmqq",
  "status": "created"
}
```

### 2. Get Call Information

**Endpoint:** `GET /Calls/{callId}`

**Description:** Retrieves detailed information about a specific call.

**Path Parameters:**
- `callId` (string, required): Unique identifier for the call

**Response:**
```json
{
  "id": "c000daeuyzzoq-za3wqdi-ycuaugy-jmqq",
  "url": "https://api.telnect.com/v1/Calls/c000daeuyzzoq-za3wqdi-ycuaugy-jmqq",
  "source": {
    "dialplan": {
      "key": "SE",
      "name": "Sweden",
      "globalPrefix": "00",
      "localPrefix": "0",
      "cc": "46"
    },
    "asserted": {
      "scheme": "sip",
      "user": "0890510",
      "name": "",
      "userParam": {
        "user": "phone"
      }
    },
    "caller": {
      "scheme": "sip",
      "user": "0890510",
      "name": "",
      "userParam": {
        "user": "phone"
      }
    },
    "privacy": true
  },
  "destination": {
    "dialplan": {
      "key": "SE",
      "name": "Sweden",
      "globalPrefix": "00",
      "localPrefix": "0",
      "cc": "46"
    },
    "req": {
      "scheme": "sip",
      "user": "0890510",
      "name": "",
      "userParam": {
        "user": "phone"
      }
    },
    "to": {
      "scheme": "sip",
      "user": "0890510",
      "name": "",
      "userParam": {
        "user": "phone"
      }
    }
  },
  "auth": {
    "user": "f8ab70c893d0e9f715094b",
    "domain": "example.com"
  },
  "number": {
    "caller": "+4610100555",
    "called": "+46890510",
    "asserted": "+4610100555",
    "diverter": "+462012345",
    "billing": "+4610100555"
  },
  "meta": {},
  "header": {},
  "status": "created"
}
```

### 3. Execute Call Action

**Endpoint:** `POST /Calls/{callId}/actions`

**Description:** Performs actions on an active call such as transfer, hold, or resume.

**Path Parameters:**
- `callId` (string, required): Unique identifier for the call

**Request Body:**
```json
{
  "action": "transfer",
  "destination": "+46890510"
}
```

**Available Actions:**
- `transfer`: Transfer call to another number
- `hold`: Put call on hold
- `resume`: Resume held call
- `mute`: Mute the call
- `unmute`: Unmute the call

### 4. Hangup Call

**Endpoint:** `DELETE /Calls/{callId}`

**Description:** Terminates an active call.

**Path Parameters:**
- `callId` (string, required): Unique identifier for the call

**Response:** 204 No Content

### 5. Get Call History

**Endpoint:** `GET /Calls/history`

**Description:** Retrieves call history with optional filtering.

**Query Parameters:**
- `limit` (integer, optional): Number of records to return (default: 50)
- `offset` (integer, optional): Number of records to skip
- `start_date` (string, optional): Start date filter (YYYY-MM-DD)
- `end_date` (string, optional): End date filter (YYYY-MM-DD)
- `status` (string, optional): Filter by call status

**Response:**
```json
{
  "calls": [
    {
      "id": "c000daeuyzzoq-za3wqdi-ycuaugy-jmqq",
      "source": "+4610100555",
      "destination": "+46890510",
      "status": "completed",
      "duration": 120,
      "start_time": "2023-01-01T10:00:00Z",
      "end_time": "2023-01-01T10:02:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 6. Get Customer Call History

**Endpoint:** `GET /Calls/customer/{customerId}/history`

**Description:** Retrieves call history for a specific customer.

**Path Parameters:**
- `customerId` (string, required): Customer identifier

**Query Parameters:** Same as Get Call History

---

## Phone Line Management

### 1. Create Phone Line

**Endpoint:** `POST /Phones`

**Description:** Creates a temporary phone line for WebRTC integration.

**Request Body:**
```json
{
  "allow_features": ["park", "inbound", "outbound", "websocket"],
  "type": "dynamic",
  "max_expire": 86400,
  "event_callback": "https://example.com/api/callback/phone"
}
```

**Parameters:**
- `allow_features` (array[string], required): Allowed features
  - `park`: Call parking
  - `inbound`: Incoming calls
  - `outbound`: Outgoing calls
  - `websocket`: WebSocket connection
- `type` (string, required): Phone line type (currently only "dynamic" supported)
- `max_expire` (integer, required): Maximum validity time in seconds
- `event_callback` (string, optional): URL for event callbacks

**Response:**
```json
{
  "username": "f8ab70c893d0e9f715094b",
  "password": "2Nmgsdos6vwqe756G4CihsAF2k45KfCwEWbm",
  "domain": "example.com",
  "websocket_url": "wss://phone.example.com/ws",
  "expires": "2019-04-07 12:00:00"
}
```

---

## Call Management

### Call Status Values

The following status values are used throughout the API:

- `created`: Call has been created but not yet initiated
- `trying`: Call is being attempted
- `early`: Early media is being received
- `progress`: Call is progressing
- `ringing`: Destination is ringing
- `answered`: Call has been answered
- `hangup`: Call has been terminated

### Call Number Types

The API uses several number types in call information:

- `caller`: The number making the call (Caller ID)
- `called`: The number being called (destination)
- `asserted`: The actual caller number
- `diverter`: Forwarding number (if call is forwarded)
- `billing`: The number being billed for the call

---

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN
```

### Getting an API Token

API tokens can be obtained through the Telnect BSS interface or by contacting Telnect support.

---

## Common Response Formats

### Success Response

Most successful API calls return a JSON response with the requested data:

```json
{
  "data": {...},
  "status": "success"
}
```

### Error Response

Error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {...}
  }
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `204 No Content`: Request successful, no content to return
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting

The API implements rate limiting to ensure fair usage. Limits are applied per API token and may vary based on your service plan.

### Rate Limit Headers

Response headers include rate limit information:

- `X-RateLimit-Limit`: Maximum requests per time window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

---

## WebSocket Integration

For real-time call events, the API provides WebSocket endpoints that can be accessed using the credentials returned from the Create Phone Line endpoint.

### WebSocket URL

Use the `websocket_url` from the phone line creation response to establish a WebSocket connection.

### WebSocket Events

The WebSocket connection provides real-time events for:
- Call state changes
- Incoming calls
- Call completion
- Error notifications

---

## Examples

### Complete Call Flow

1. **Create Phone Line:**
```bash
curl -X POST https://bss.telnect.com/api/v1/Phones \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allow_features": ["inbound", "outbound", "websocket"],
    "type": "dynamic",
    "max_expire": 86400
  }'
```

2. **Create Outbound Call:**
```bash
curl -X POST https://bss.telnect.com/api/v1/Calls \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "type": "phone",
      "number": "+4610100555"
    },
    "destination": {
      "type": "phone",
      "number": "+46890510"
    }
  }'
```

3. **Get Call Status:**
```bash
curl -X GET https://bss.telnect.com/api/v1/Calls/CALL_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

4. **Hangup Call:**
```bash
curl -X DELETE https://bss.telnect.com/api/v1/Calls/CALL_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Support

For additional support or questions about the API:

- **Documentation:** https://bss.telnect.com/help/api
- **Support Email:** support@telnect.com
- **API Status:** Check the Telnect status page for current API availability

---

*Last Updated: January 2024*
*API Version: v1*
