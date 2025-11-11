# Authentication Flow Diagrams

This document provides visual representations of the authentication flows in the MoneyWise system using Mermaid diagrams.

## Table of Contents

- [User Registration Flow](#user-registration-flow)
- [User Login Flow](#user-login-flow)
- [Token Refresh Flow](#token-refresh-flow)
- [Protected Route Access](#protected-route-access)
- [Logout Flow](#logout-flow)
- [Error Handling Flows](#error-handling-flows)
- [Security Validation Flow](#security-validation-flow)

## User Registration Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database
    participant V as Validator

    U->>F: Fill registration form
    F->>F: Client-side validation
    F->>B: POST /auth/register

    B->>V: Validate input data
    alt Validation fails
        V-->>B: Validation errors
        B-->>F: 400 Bad Request
        F-->>U: Show validation errors
    else Validation passes
        V-->>B: Valid data
        B->>DB: Check if user exists

        alt User exists
            DB-->>B: User found
            B-->>F: 409 Conflict
            F-->>U: Email already exists
        else User doesn't exist
            DB-->>B: No user found
            B->>B: Hash password (bcrypt)
            B->>DB: Create user record
            DB-->>B: User created
            B->>B: Generate JWT tokens
            B-->>F: 201 Success + tokens + user
            F->>F: Store tokens
            F-->>U: Registration successful
            F->>F: Redirect to dashboard
        end
    end
```

## User Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    U->>F: Enter email/password
    F->>B: POST /auth/login

    B->>DB: Find user by email
    alt User not found
        DB-->>B: No user
        B-->>F: 401 Invalid credentials
        F-->>U: Login failed
    else User found
        DB-->>B: User data
        B->>B: Check account status

        alt Account inactive
            B-->>F: 401 Account not active
            F-->>U: Account disabled
        else Account active
            B->>B: Compare password hash

            alt Password invalid
                B-->>F: 401 Invalid credentials
                F-->>U: Login failed
            else Password valid
                B->>DB: Update last login time
                B->>B: Generate JWT tokens
                B-->>F: 200 Success + tokens + user
                F->>F: Store tokens
                F-->>U: Login successful
                F->>F: Redirect to dashboard
            end
        end
    end
```

## Token Refresh Flow

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant DB as Database

    F->>F: Access token expired
    F->>B: POST /auth/refresh
    Note over F,B: Send refresh token

    B->>B: Verify refresh token
    alt Token invalid/expired
        B-->>F: 401 Invalid refresh token
        F->>F: Clear all tokens
        F->>F: Redirect to login
    else Token valid
        B->>B: Extract user ID from token
        B->>DB: Find user by ID

        alt User not found/inactive
            DB-->>B: No user or inactive
            B-->>F: 401 Invalid refresh token
            F->>F: Clear all tokens
            F->>F: Redirect to login
        else User valid
            DB-->>B: User data
            B->>B: Generate new tokens
            B-->>F: 200 New tokens + user
            F->>F: Update stored tokens
            F->>F: Retry original request
        end
    end
```

## Protected Route Access

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant G as JWT Guard
    participant S as JWT Strategy
    participant A as Auth Service
    participant DB as Database

    F->>B: GET /protected-endpoint
    Note over F,B: Authorization: Bearer <token>

    B->>G: Route guard check
    G->>G: Extract token from header

    alt No token provided
        G-->>B: Unauthorized
        B-->>F: 401 Access token required
    else Token provided
        G->>S: Validate token
        S->>S: Verify JWT signature

        alt Token invalid/expired
            S-->>G: Token validation failed
            G-->>B: Unauthorized
            B-->>F: 401 Invalid token
        else Token valid
            S->>S: Extract payload
            S->>A: Validate user from payload
            A->>DB: Find user by ID

            alt User not found/inactive
                DB-->>A: No user or inactive
                A-->>S: User validation failed
                S-->>G: Unauthorized
                G-->>B: Unauthorized
                B-->>F: 401 User not found
            else User valid
                DB-->>A: User data
                A-->>S: User validated
                S-->>G: User object
                G-->>B: Access granted
                B->>B: Process request
                B-->>F: 200 Response data
            end
        end
    end
```

## Logout Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend

    U->>F: Click logout
    F->>B: POST /auth/logout
    Note over F,B: Authorization: Bearer <token>

    B->>B: Validate token (via guard)
    alt Token invalid
        B-->>F: 401 Unauthorized
        F->>F: Clear tokens anyway
    else Token valid
        B->>B: Process logout
        Note over B: No server-side action needed (stateless JWT)
        B-->>F: 204 No Content
        F->>F: Clear stored tokens
    end

    F->>F: Clear user state
    F->>F: Redirect to login page
    F-->>U: Logged out successfully
```

## Error Handling Flows

### Password Validation Error Flow

```mermaid
flowchart TD
    A[User submits password] --> B{Password length >= 8?}
    B -->|No| C[Length error]
    B -->|Yes| D{Has uppercase?}
    D -->|No| E[Uppercase error]
    D -->|Yes| F{Has lowercase?}
    F -->|No| G[Lowercase error]
    F -->|Yes| H{Has number?}
    H -->|No| I[Number error]
    H -->|Yes| J{Has special char?}
    J -->|No| K[Special char error]
    J -->|Yes| L[Password valid]

    C --> M[Return validation errors]
    E --> M
    G --> M
    I --> M
    K --> M
    L --> N[Continue with registration/login]
    M --> O[Display error to user]
```

### JWT Token Validation Error Flow

```mermaid
flowchart TD
    A[Receive JWT token] --> B{Token format valid?}
    B -->|No| C[JsonWebTokenError]
    B -->|Yes| D{Token expired?}
    D -->|Yes| E[TokenExpiredError]
    D -->|No| F{Token signature valid?}
    F -->|No| G[Invalid signature error]
    F -->|Yes| H{User exists and active?}
    H -->|No| I[User validation error]
    H -->|Yes| J[Token valid - proceed]

    C --> K[Return 401 Invalid token]
    E --> L[Return 401 Token expired]
    G --> K
    I --> M[Return 401 User not found]
    J --> N[Continue with request]

    K --> O[Client handles error]
    L --> P[Client attempts refresh]
    M --> O
```

## Security Validation Flow

```mermaid
flowchart TD
    A[Authentication Request] --> B[Input Validation]
    B --> C{Valid input?}
    C -->|No| D[Return validation errors]
    C -->|Yes| E[Rate Limiting Check]
    E --> F{Within rate limits?}
    F -->|No| G[Return 429 Too Many Requests]
    F -->|Yes| H[Security Headers Check]
    H --> I{HTTPS required?}
    I -->|Yes, missing| J[Redirect to HTTPS]
    I -->|OK| K[CORS Validation]
    K --> L{Valid origin?}
    L -->|No| M[CORS error]
    L -->|Yes| N[Authentication Processing]
    N --> O{Auth successful?}
    O -->|No| P[Log security event]
    O -->|Yes| Q[Generate tokens]
    P --> R[Return auth error]
    Q --> S[Set security headers]
    S --> T[Return success response]

    D --> U[Client error handling]
    G --> V[Client retry logic]
    J --> W[Client HTTPS redirect]
    M --> X[Client CORS handling]
    R --> Y[Client auth failure handling]
    T --> Z[Client success handling]
```

## Token Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Generated: User login/register
    Generated --> Active: Token issued
    Active --> NearExpiry: Within 5 min of expiry
    Active --> Expired: Time limit reached
    NearExpiry --> Refreshed: Refresh token used
    NearExpiry --> Expired: Time limit reached
    Refreshed --> Active: New token issued
    Expired --> Invalid: Cannot be used
    Invalid --> [*]: Token discarded

    Active --> Revoked: User logout
    NearExpiry --> Revoked: User logout
    Revoked --> Invalid: Blacklisted

    note right of Generated
        Access: 15 minutes
        Refresh: 7 days
    end note

    note right of Refreshed
        Old refresh token
        becomes invalid
    end note
```

## Frontend Authentication State Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: App starts
    Initializing --> CheckingAuth: Load from storage
    CheckingAuth --> Authenticated: Valid tokens found
    CheckingAuth --> Unauthenticated: No/invalid tokens

    Unauthenticated --> Authenticating: Login attempt
    Authenticating --> Authenticated: Login success
    Authenticating --> Unauthenticated: Login failed

    Authenticated --> Refreshing: Token near expiry
    Refreshing --> Authenticated: Refresh success
    Refreshing --> Unauthenticated: Refresh failed

    Authenticated --> Unauthenticated: Logout
    Authenticated --> Unauthenticated: Token expired

    note right of Authenticated
        Access protected resources
        Auto-refresh tokens
    end note

    note right of Refreshing
        Background token refresh
        Transparent to user
    end note
```

## Database Security Flow

```mermaid
flowchart TD
    A[User credentials] --> B[Input sanitization]
    B --> C[Email normalization]
    C --> D{User registration?}
    D -->|Yes| E[Password complexity check]
    D -->|No| F[User lookup by email]
    E --> G[Generate salt]
    G --> H[Hash password with bcrypt]
    H --> I[Store user record]
    I --> J[Generate JWT tokens]

    F --> K{User exists?}
    K -->|No| L[Return auth error]
    K -->|Yes| M[Check account status]
    M --> N{Account active?}
    N -->|No| O[Return account inactive]
    N -->|Yes| P[Verify password hash]
    P --> Q{Password valid?}
    Q -->|No| R[Log failed attempt]
    Q -->|Yes| S[Update last login]

    R --> L
    S --> J
    J --> T[Return tokens to client]

    style G fill:#e1f5fe
    style H fill:#e1f5fe
    style P fill:#e1f5fe
    note bottom of H : bcrypt with 12 salt rounds
    note bottom of P : bcrypt.compare()
```

## API Authentication Middleware Flow

```mermaid
sequenceDiagram
    participant R as Request
    participant M as Middleware Stack
    participant C as CORS Middleware
    participant H as Helmet (Security Headers)
    participant T as Throttle (Rate Limiting)
    participant G as JWT Guard
    participant A as Auth Service
    participant E as Endpoint Handler

    R->>M: Incoming request
    M->>C: Check CORS
    alt CORS rejected
        C-->>R: 403 CORS error
    else CORS accepted
        C->>H: Add security headers
        H->>T: Check rate limits
        alt Rate limited
            T-->>R: 429 Too Many Requests
        else Within limits
            T->>G: Authentication guard
            alt Public endpoint
                G->>E: Skip auth, proceed
            else Protected endpoint
                G->>A: Validate JWT token
                alt Auth failed
                    A-->>R: 401 Unauthorized
                else Auth success
                    A->>E: User context added
                end
            end
            E->>E: Process business logic
            E-->>R: Response
        end
    end
```

---

These diagrams provide a comprehensive visual guide to understanding how authentication works in the MoneyWise system. They can be used for:

- Developer onboarding and training
- System architecture documentation
- Debugging authentication issues
- Security audits and reviews
- Frontend integration planning

All diagrams are created using Mermaid syntax and can be rendered in most modern documentation systems, including GitHub, GitLab, and popular documentation platforms.