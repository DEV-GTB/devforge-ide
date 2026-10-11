# DevForge AI - Secure Configuration Guide

## Environment Variables Security

### ⚠️ IMPORTANT SECURITY NOTICE

Never commit your actual `.env` file to version control. The `.env` file is already in `.gitignore` to prevent accidental commits.

### Setting Up Your Environment

1. **Copy the example file:**
```bash
cp .env.example .env
```

2. **Edit `.env` with your actual values:**
```bash
# Open .env in your editor
# Replace placeholder values with real keys
```

3. **Never share your `.env` file**
- Don't commit it to git
- Don't share it in screenshots
- Don't include it in bug reports
- Don't upload it to public repositories

### Cloudflare Workers AI Setup

1. Get your Cloudflare Account ID:
   - Log in to Cloudflare Dashboard
   - Go to Workers & Pages
   - Your Account ID is in the URL or account settings

2. Get your API Token:
   - Go to Cloudflare Dashboard
   - Navigate to "Manage Account" → "API Tokens"
   - Create a new token with "Workers AI" permissions
   - Copy the token (starts with `cfut_`)

3. Add to `.env`:
```bash
CLOUDFLARE_ACCOUNT_ID=your_actual_account_id
CLOUDFLARE_API_KEY=your_actual_api_key
```

### Security Features Implemented

#### 1. Config Class with Safe Access
The `Config` class provides safe access to environment variables:
- Sensitive values are never logged
- Secrets are separated from config
- Safe objects exclude API keys

#### 2. License Validation
- Validates license keys against server
- Prevents unauthorized use
- Protects intellectual property

#### 3. Secret Generation
- Auto-generates secure secrets if not provided
- Warns if using default secrets in production

### Environment Variables Reference

| Variable | Required | Default | Description | Secret |
|----------|----------|---------|-------------|--------|
| CLOUDFLARE_ACCOUNT_ID | Yes | - | Cloudflare account ID | No |
| CLOUDFLARE_API_KEY | Yes | - | Cloudflare API token | **YES** |
| PORT | No | 3001 | Server port | No |
| NODE_ENV | No | development | Environment | No |
| JWT_SECRET | No | Auto-generated | Session JWT secret | **YES** |
| SESSION_SECRET | No | Auto-generated | Session encryption | **YES** |
| LICENSE_KEY | No | - | Commercial license key | **YES** |
| LICENSE_SERVER_URL | No | - | License validation server | No |

### Best Practices

1. **For Development:**
   - Use `.env` with test keys
   - Never use production keys in dev
   - Rotate keys regularly

2. **For Production:**
   - Use environment-specific config
   - Never commit `.env`
   - Use secret management services
   - Enable IP restrictions on API keys
   - Rotate keys if compromised

3. **For Teams:**
   - Use `.env.example` as template
   - Share secrets via secure channels
   - Use secret management tools (Vault, AWS Secrets Manager)
   - Document key rotation procedures

### Secret Management Options

For production deployments, consider using:

1. **Cloudflare Secrets**
   - Built-in Workers secret management
   - Secure and encrypted

2. **AWS Secrets Manager**
   - Enterprise-grade secret storage
   - Automatic rotation

3. **HashiCorp Vault**
   - Open-source secret management
   - Advanced features

4. **Environment Variables (Cloud)**
   - Set directly in cloud platform
   - Never commit to code

### Checking Your Config

To verify your configuration is loaded correctly:

```typescript
import { config } from './src/core/Config';

// Safe config (no secrets)
console.log(config.toSafeObject());

// Get specific values
const port = config.getPort();
const isDev = config.isDevelopment();
```

### Troubleshooting

**Issue: "Missing required environment variables"**
- Check `.env` file exists
- Verify values are set correctly
- Ensure no typos in variable names

**Issue: API calls failing**
- Verify API key is correct
- Check account ID matches
- Ensure token has correct permissions

**Issue: Secrets not loading**
- Restart server after changing `.env`
- Check file encoding (should be UTF-8)
- Verify no extra spaces in values

### Security Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` is committed
- [ ] Actual `.env` is never committed
- [ ] API keys have IP restrictions
- [ ] Keys are rotated regularly
- [ ] Secrets are not logged
- [ ] Production uses secret management
- [ ] Team knows security policies
- [ ] Keys are revoked when compromised
- [ ] License validation is enabled

### Additional Security Measures

1. **File Permissions:**
```bash
chmod 600 .env  # Only owner can read/write
```

2. **Git Hooks:**
Prevent committing `.env` files using pre-commit hooks.

3. **Environment-Specific Configs:**
- `.env.development`
- `.env.production`
- `.env.test`

4. **CI/CD Security:**
- Use encrypted secrets in CI/CD
- Never expose in logs
- Rotate after deployment

### Support

For security issues or questions about configuration:
- Do not post API keys in public forums
- Contact support privately
- Reference your config hash (not actual values)
