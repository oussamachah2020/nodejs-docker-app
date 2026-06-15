
# Authentication

Authentication is the process of identifying the user's information, in spring boot the process has different layers

## **UserPrincipal**:

Wraps the User entity to help extract the user info with methods in order to keep the `User` Entity clean

Key method: `getUsername()` returns the email — because email is your identifier.


---
 
## **UserDetailsServiceImp**:

Called by spring security during authentication , it's sole job is to extract the user details from the database using the email and wraps it in `UserPrincipal`

---

## **JwtUtil**

Class containing utility methods for three main purposes:

- **`generateToken`**: Build a signs JWT token from user details
- **`extractUsername`**: Read the claim value (email / username) from the token
- **`isTokenValid`**:  Checks signature and expiry

the JwtUtil class read the secret key and expiration date from the `application.yaml`

```yaml
application:
  security:
    secret-key: generated-secret-key
    expirartion: 00000 //milliseconds
```

---

## **JwtAuthFilter**

```
Read Authorization header
       ↓
Extract "Bearer " token
       ↓
Extract email from token
       ↓
Load user from DB
       ↓
Validate token
       ↓
Set authentication in SecurityContext
       ↓
Continue chain
```

> Extends from `OncePerRequestFilter` runs on every request

If no token is there it skips silently and continues the chain

---

## **Security Config**

Ties everything together. Defines:

- Public routes → /auth/**
- Protected routes → everything else
- CSRF → disabled (stateless API)
- Sessions → STATELESS (no server-side sessions)
- Registers JwtAuthFilter before Spring's default filter
- Exposes AuthenticationManager and PasswordEncoder beans

![[attachments/Linux_Server_Security_Practices (1).pdf|Linux_Server_Security_Practices (1).pdf|3358]]



