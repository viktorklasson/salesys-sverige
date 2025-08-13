# Call Flow Architecture Diagram

## Current Implementation Analysis

**DISCREPANCIES FOUND:**

1. **Caller Number**: The diagram shows fixed caller `+46752751354`, but current code uses `phoneLineData?.username`
2. **Hangup Method**: The diagram shows `DELETE /Calls/{callId}`, but current code uses `POST` with `action: 'hangup'`
3. **Missing Phone Line Creation**: The diagram doesn't show the initial phone line creation step

## Corrected System Architecture

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend (React + TypeScript)"
        UI[Phone Interface Component]
        VertoHook[useVerto Hook]
        SupabaseClient[Supabase Client]
    end

    %% Supabase Edge Functions
    subgraph "Supabase Edge Functions"
        CreatePhone[telnect-create-phone]
        CreateCall[telnect-create-call]
        GetCall[telnect-get-call]
        CallAction[telnect-call-action]
        BridgeCalls[telnect-bridge-calls]
    end

    %% External Services
    subgraph "Telnect API (WebRTC)"
        TelnectAPI[Telnect API Server]
        TelnectWS[Telnect WebSocket Server]
    end

    %% Verto WebRTC
    subgraph "Verto WebRTC"
        VertoWS[Verto WebSocket]
        VertoCall[Verto Call Session]
    end

    %% Call Flow Steps
    subgraph "Actual Call Flow Process"
        ComponentMount[1. Component Mount]
        CreatePhoneLine[2. Create Phone Line]
        ConnectVerto[3. Connect to Verto]
        UserInput[4. User Enters Number]
        MakeCall[5. Make Outbound Call]
        PollStatus[6. Poll Call Status]
        BridgeCalls[7. Bridge Calls]
        HandleHangup[8. Handle Hangup]
    end

    %% Connections
    UI --> VertoHook
    UI --> SupabaseClient
    SupabaseClient --> CreatePhone
    SupabaseClient --> CreateCall
    SupabaseClient --> GetCall
    SupabaseClient --> CallAction
    SupabaseClient --> BridgeCalls

    CreatePhone --> TelnectAPI
    CreateCall --> TelnectAPI
    GetCall --> TelnectAPI
    CallAction --> TelnectAPI
    BridgeCalls --> TelnectAPI

    VertoHook --> VertoWS
    VertoWS --> TelnectWS
    VertoCall --> TelnectWS

    %% Flow Sequence
    ComponentMount --> CreatePhoneLine
    CreatePhoneLine --> ConnectVerto
    ConnectVerto --> UserInput
    UserInput --> MakeCall
    MakeCall --> PollStatus
    PollStatus --> BridgeCalls
    BridgeCalls --> HandleHangup
```

## Corrected Call Flow Sequence

```mermaid
sequenceDiagram
    participant User as User
    participant UI as Phone Interface
    participant Verto as Verto WebRTC
    participant Supabase as Supabase Functions
    participant Telnect as Telnect API
    participant WS as WebSocket Server

    %% Component Mount
    Note over UI: Component mounts
    UI->>Supabase: telnect-create-phone
    Supabase->>Telnect: POST /Phones
    Telnect-->>Supabase: Phone line credentials
    Supabase-->>UI: Phone line data
    UI->>Verto: Connect with credentials
    Verto->>WS: WebSocket connection
    WS-->>Verto: Connected
    Verto-->>UI: Verto connected

    %% User Makes Call
    User->>UI: Enter phone number & click call
    UI->>Verto: Call 'park' (create WebRTC session)
    Verto->>WS: WebSocket connection
    WS-->>Verto: Session created
    Verto-->>UI: Verto call ID

    %% Create Outbound Call
    UI->>Supabase: telnect-create-call
    Supabase->>Telnect: POST /Calls
    Note over Telnect: Create outbound call<br/>with caller: phoneLineData.username
    Telnect-->>Supabase: Call created with ID
    Supabase-->>UI: Outbound call ID

    %% Poll for Call Status
    loop Every 2 seconds
        UI->>Supabase: telnect-get-call
        Supabase->>Telnect: GET /Calls/{callId}
        Telnect-->>Supabase: Call status
        Supabase-->>UI: Status update
    end

    %% Bridge Calls When Answered
    alt Call Status = 'answered'
        UI->>Supabase: telnect-bridge-calls
        Supabase->>Telnect: POST /Calls/{outboundCallId}
        Note over Telnect: Bridge action with<br/>param.id = vertoCallId
        Telnect-->>Supabase: Bridge successful
        Supabase-->>UI: Calls bridged
        UI->>User: Call connected
    end

    %% Handle Hangup
    User->>UI: Click hangup
    UI->>Verto: Hangup verto call
    UI->>Supabase: telnect-call-action (hangup)
    Supabase->>Telnect: POST /Calls/{callId}
    Note over Telnect: action: 'hangup'
    Telnect-->>Supabase: Call terminated
    Supabase-->>UI: Hangup complete
    UI->>User: Call ended
```

## Current Implementation Details

### **Actual API Calls:**

1. **Phone Line Creation:**
   ```javascript
   // telnect-create-phone
   POST /Phones
   Body: { allow_features: ['inbound', 'outbound', 'websocket'], type: 'dynamic', max_expire: 86400 }
   ```

2. **Outbound Call Creation:**
   ```javascript
   // telnect-create-call
   POST /Calls
   Body: { caller: phoneLineData.username, number: phoneNumber, notifyUrl: ... }
   ```

3. **Call Status Polling:**
   ```javascript
   // telnect-get-call
   GET /Calls/{callId}
   ```

4. **Bridging:**
   ```javascript
   // telnect-bridge-calls
   POST /Calls/{outboundCallId}
   Body: { actions: [{ action: "bridge", param: { id: vertoCallId } }] }
   ```

5. **Hangup:**
   ```javascript
   // telnect-call-action
   POST /Calls/{callId}
   Body: { actions: [{ action: "hangup" }] }
   ```

### **Key Differences from Diagram:**

1. **Caller Number**: Uses `phoneLineData.username` instead of fixed `+46752751354`
2. **Hangup Method**: Uses `POST` with action instead of `DELETE`
3. **Phone Line Creation**: Happens on component mount, not user action
4. **Verto Connection**: Uses phone line credentials, not separate WebSocket credentials

### **Current Call States:**
- `idle` - No active call
- `connecting` - Creating calls
- `calling` - Calls created, waiting for answer
- `answered` - Call answered and bridged
- `hangup` - Call terminated

This corrected diagram now accurately reflects the current implementation.
