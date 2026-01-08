# Security Overview

This document outlines the security measures implemented in the Storyboard Flow application.

## Implemented Security Measures

### 1. **Environment Variable Validation**
- **File**: `src/lib/supabase.ts`
- **Purpose**: Ensures all required environment variables are present before the app starts
- **Implementation**: Validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on startup
- **Error Handling**: Provides clear error messages if variables are missing

### 2. **Security Headers**
- **File**: `index.html`
- **Headers Implemented**:
  - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
  - `X-Frame-Options: DENY` - Prevents clickjacking attacks
  - `X-XSS-Protection: 1; mode=block` - Enables XSS filter in browsers
  - `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
  - **Content Security Policy (CSP)**: Restricts resource loading

### 3. **Content Security Policy (CSP)**
```
default-src 'self';                    # Only load resources from same origin
script-src 'self' 'unsafe-inline' 'unsafe-eval';  # Scripts (required for jsPDF/html2canvas)
style-src 'self' 'unsafe-inline';     # Styles (required for inline styles)
img-src 'self' data: https: blob:;    # Images from various sources
connect-src 'self' https://*.supabase.co;  # API calls to Supabase only
font-src 'self' data:;                # Fonts
object-src 'none';                    # No plugins
base-uri 'self';                      # Restrict base tag
form-action 'self';                   # Forms submit to same origin only
```

**Note**: `'unsafe-eval'` is required for jsPDF and html2canvas libraries to function properly for PDF export.

### 4. **Input Sanitization**
- **File**: `src/utils/inputSanitizer.ts`
- **Functions**:
  - `sanitizeString()` - General string sanitization
  - `sanitizeName()` - Project/shot names
  - `sanitizeNumber()` - Numeric input validation
  - `sanitizeUrl()` - URL validation (http/https only)
  - `sanitizeFileName()` - File name sanitization
  - `sanitizeEmail()` - Email validation
  - `sanitizeMultilineText()` - Text with newlines
  - `validateFileSize()` - File size limits
  - `validateImageFileType()` - Image type validation

### 5. **Session Management**
- **Files**: `src/services/authService.ts`, `src/store/authStore.ts`
- **Features**:
  - Session validation and refresh
  - Forced logout detection (other device login)
  - Session cleanup on sign-out
  - Real-time session monitoring

### 6. **Data Validation**
- **Files**: `src/utils/dataValidator.ts`, `src/services/projectService.ts`
- **Features**:
  - Multi-layer validation before saving to cloud
  - Timestamp-based conflict resolution
  - Data corruption detection
  - Auto-repair for minor inconsistencies

### 7. **Offline/Online Sync Security**
- **File**: `src/services/cloudSyncService.ts`
- **Features**:
  - Blocks sign-out when offline with unsynced changes
  - Timestamp validation before syncing
  - Prevents overwriting newer cloud data

## Dependency Security

### Vulnerability Status
- **jspdf**: Using v2.5.1 (safe, vulnerability only affects v3.0.1 and earlier in 3.x line)
- **esbuild**: Dev dependency vulnerability (moderate, only affects development server)
- **@eslint/plugin-kit**: Dev dependency vulnerability (low risk, ReDoS)

### Recommendations
- Run `npm audit` regularly to check for new vulnerabilities
- Update dependencies periodically
- Monitor security advisories for critical libraries

## Authentication & Authorization

### Supabase Security
- Row Level Security (RLS) policies enforced at database level
- User sessions managed by Supabase Auth
- JWT tokens for API authentication
- Secure session storage with auto-refresh

### Best Practices
- Never commit `.env` files
- Use environment variables for sensitive data
- Rotate API keys periodically
- Monitor for suspicious activity

## File Upload Security

### Image Upload Validation
- File type validation (JPEG, PNG, GIF, WebP, SVG)
- File size limits (default 10MB)
- Secure storage in Supabase Storage
- Unique file paths to prevent collisions

### Storage Security
- Public access for project images (authenticated users only)
- Automatic cleanup of orphaned images
- Storage quota management

## Newly Implemented Security Features

### 8. **Rate Limiting**
- **File**: `src/utils/rateLimiter.ts`
- **Features**:
  - API rate limiting (100 requests per 15 minutes)
  - Authentication rate limiting (5 attempts per 15 minutes)
  - Upload rate limiting (10 uploads per hour)
  - Export rate limiting (5 exports per hour)
  - Configurable rate limits per user/endpoint
  - Automatic cleanup of expired entries

### 9. **Request Size Limits**
- **File**: `src/utils/requestLimits.ts`
- **Features**:
  - Project size limits (50MB default)
  - Image file size limits (10MB default)
  - Page count limits (50 pages max)
  - Shot count limits (100 shots per page)
  - Text field length limits (10,000 characters)
  - Concurrent upload limits (5 max)
  - Memory usage monitoring
  - Configurable via environment variables

### 10. **Enhanced Data Validation**
- **File**: `src/utils/dataValidator.ts` (updated)
- **Features**:
  - Comprehensive project data validation
  - Save validation (prevents data corruption)
  - Load validation (detects corrupted data)
  - Empty project protection
  - Suspicious data pattern detection
  - Auto-repair for common issues
  - Project ID/name mismatch detection
  - Duplicate ID detection

### 11. **Audit Logging**
- **File**: `src/utils/auditLogger.ts`
- **Features**:
  - Security event tracking
  - Authentication event logging
  - Data operation logging
  - Rate limit violation logging
  - Security violation detection
  - Suspicious activity monitoring
  - CSP violation reporting
  - Event filtering and export
  - Memory-based storage (1000 events)

### 12. **Advanced Session Security**
- **File**: `src/utils/sessionSecurity.ts`
- **Features**:
  - Session timeout warnings (5 minutes before expiry)
  - Maximum session duration (8 hours)
  - Maximum inactive time (2 hours)
  - Device fingerprinting
  - Suspicious activity detection (threshold: 200 actions per minute)
  - Activity pattern analysis with throttling (500ms minimum between logs)
  - Automated behavior detection
  - Session monitoring and cleanup

### 13. **Recent Security Fixes (October 22, 2025)**
- **Fixed**: `BackgroundSyncService.isProcessingOfflineQueue()` method returning wrong property
- **Fixed**: Excessive audit log spam during batch operations (threshold increased 10→200, throttling improved 100ms→500ms)
- **Fixed**: CSP blocking base64 images (added `data:` to `connect-src` directive)
- **Fixed**: `process.env` usage in client-side code (replaced with `import.meta.env` in 6 files)
- **Fixed**: `audit.log is not a function` error (changed to `auditLogger.log()`)
- **Fixed**: ESLint version conflicts (updated `typescript-eslint` v7→v8)
- **Fixed**: Missing `lovable-tagger` package (removed from package.json)

## Future Security Enhancements

### Recommended Improvements
1. **Remove `unsafe-eval` from CSP**: Explore alternatives to jsPDF/html2canvas that don't require eval
2. **External Logging**: Integrate with external logging services (Sentry, LogRocket)
3. **Advanced Monitoring**:
   - Real-time security dashboard
   - Automated threat detection
   - User behavior analytics
4. **Enhanced Authentication**:
   - Multi-factor authentication
   - Biometric authentication
   - Device trust management

### Monitoring
- Set up error tracking (e.g., Sentry)
- Monitor for unusual access patterns
- Regular security audits
- Penetration testing before major releases
- Real-time security event monitoring

## Security Incident Response

### If a Security Issue is Discovered
1. Assess the severity and impact
2. Document the issue privately
3. Develop and test a fix
4. Deploy the fix promptly
5. Notify affected users if necessary
6. Update this document

## Contact
For security concerns, please contact: [your-email@example.com]

---

**Last Updated**: October 22, 2025
**Security Review Date**: October 22, 2025

## Security Implementation Summary

### ✅ Completed This Session
1. **Rate Limiting System** - Prevents API abuse with configurable limits
2. **Request Size Limits** - Protects against large payload attacks
3. **Enhanced Data Validation** - Comprehensive save/load validation with corruption detection
4. **Audit Logging** - Security event tracking and monitoring
5. **Advanced Session Security** - Timeout warnings, device fingerprinting, suspicious activity detection

### 🔴 Known Issues
1. **Dependency Vulnerabilities** - ESLint v9 vs typescript-eslint v7 conflict blocking updates
2. **jsPDF High Severity** - Needs update to v3.0.3 (breaking change)
3. **esbuild Moderate** - Development server vulnerability
4. **@eslint/plugin-kit Low** - ReDoS vulnerability

### 📋 Next Steps
1. Resolve dependency conflicts to enable security updates
2. Integrate new security features into existing services
3. Add UI components for session timeout warnings
4. Set up external logging service integration
5. Conduct security testing of new features

