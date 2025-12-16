# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Security Considerations

### Development vs. Production

**⚠️ IMPORTANT**: This project is configured for **local development by default**.

The default configuration includes:
- Hardcoded development passwords
- Exposed ports without authentication
- No SSL/TLS encryption
- Disabled security features for ease of development

**DO NOT deploy with default settings to production or public networks.**

### Production Deployment Checklist

Before deploying to production, ensure you:

#### Database Security
- [ ] Change all default passwords
- [ ] Use strong, randomly generated passwords (min 32 characters)
- [ ] Enable SSL/TLS for PostgreSQL connections
- [ ] Restrict database port access (use firewall rules)
- [ ] Enable PostgreSQL connection logging and monitoring
- [ ] Configure pg_hba.conf for appropriate access control
- [ ] Use connection pooling with appropriate limits

#### Application Security
- [ ] Use environment variables for sensitive configuration
- [ ] Implement secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Enable HTTPS/TLS for all web traffic
- [ ] Implement rate limiting on API endpoints
- [ ] Add authentication and authorization
- [ ] Enable CORS with appropriate restrictions
- [ ] Sanitize all user inputs
- [ ] Implement SQL injection prevention
- [ ] Add security headers (CSP, HSTS, etc.)

#### Infrastructure Security
- [ ] Run containers as non-root users
- [ ] Use Docker secrets instead of environment variables
- [ ] Enable Docker security scanning
- [ ] Keep base images updated
- [ ] Implement network segmentation
- [ ] Use private container registries
- [ ] Enable logging and monitoring
- [ ] Implement backup and disaster recovery

#### Redis Security
- [ ] Require authentication (set password)
- [ ] Bind to localhost or private network only
- [ ] Disable dangerous commands (FLUSHDB, FLUSHALL, etc.)
- [ ] Enable SSL/TLS if available
- [ ] Implement rate limiting

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### DO:
1. **Email** security details to: [Your security contact email]
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. **Allow** up to 48 hours for initial response
4. **Coordinate** disclosure timeline with maintainers

### DO NOT:
- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it's fixed
- Exploit the vulnerability beyond verification

### Response Timeline

- **Initial Response**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix Timeline**: Depends on severity
  - Critical: Within 7 days
  - High: Within 30 days
  - Medium: Within 90 days
  - Low: Next regular release

### Recognition

We appreciate security researchers who responsibly disclose vulnerabilities. With your permission, we will:
- Acknowledge you in the security advisory
- List you in our CONTRIBUTORS.md file
- Provide updates on fix progress

## Known Security Limitations

### Default Configuration
- Default passwords are publicly visible in repository
- No authentication on development endpoints
- PostgreSQL exposed on non-standard port (5434) but accessible
- Redis has no password in development mode

### Dataset Considerations
- The Enron dataset contains real email addresses
- Some emails may contain sensitive historical information
- Consider privacy implications when deploying publicly
- Implement appropriate access controls for public deployments

## Security Best Practices

### For Development
- Never commit `.env` files with real credentials
- Use `.env.example` as a template only
- Rotate credentials if accidentally committed
- Keep dependencies updated
- Run security scans regularly

### For Production
- Use a Web Application Firewall (WAF)
- Implement DDoS protection
- Enable audit logging
- Regular security assessments
- Penetration testing before public deployment
- Implement intrusion detection
- Regular backup testing
- Incident response plan

## Security Tools

We recommend using these tools:

### Dependency Scanning
```bash
# Python
pip install safety
safety check

# Node.js
npm audit
npm audit fix
```

### Container Scanning
```bash
# Docker Scout
docker scout cves

# Trivy
trivy image enron_backend:latest
```

### Static Analysis
```bash
# Python
bandit -r .

# JavaScript
npm install -g eslint-plugin-security
```

## Updates and Patches

- Security patches will be released as soon as possible
- Subscribe to GitHub releases for notifications
- Check [GitHub Security Advisories](../../security/advisories)
- Star the repository to receive updates

## Contact

For security concerns, contact:
- **Email**: [Your security email]
- **GitHub**: [@yourusername](https://github.com/yourusername)

For general questions, open a GitHub issue (do not include security details).

---

Last updated: 2024-12-16
