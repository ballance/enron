# Deployment Checklist ✅

Use this checklist when deploying to Digital Ocean.

## Pre-Deployment

- [ ] Digital Ocean account created
- [ ] Domain purchased and DNS configured
- [ ] Droplet created (Ubuntu 22.04, 4GB+ RAM)
- [ ] SSH access verified
- [ ] Git repository accessible

## Server Setup

- [ ] System updated: `apt update && apt upgrade -y`
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Git installed
- [ ] Firewall configured (UFW)
  - [ ] SSH (port 22) allowed
  - [ ] HTTP (port 80) allowed
  - [ ] HTTPS (port 443) allowed
- [ ] Firewall enabled

## Application Setup

- [ ] Repository cloned to `/opt/enron`
- [ ] `.env.production` configured
  - [ ] `POSTGRES_PASSWORD` set (strong password)
  - [ ] `DOMAIN` set (your domain name)
  - [ ] `EMAIL` set (for SSL certificates)
  - [ ] `VITE_API_URL` set (`https://yourdomain.com`)
- [ ] Database backup uploaded (if migrating)

## Deployment

- [ ] Deployment script executed: `./deploy.sh`
- [ ] Services started successfully
- [ ] SSL certificate obtained
- [ ] Database restored (if applicable)

## Verification

- [ ] All containers running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Website accessible: `https://yourdomain.com`
- [ ] SSL certificate valid (green padlock)
- [ ] API responding: `https://yourdomain.com/api/health`
- [ ] Dashboard loads correctly
- [ ] Search functionality works
- [ ] Thread explorer functional
- [ ] Network visualization renders
- [ ] Database contains data (517,401 messages)

## Post-Deployment

- [ ] Automated backups configured (cron)
- [ ] Monitoring set up (optional)
- [ ] Documentation reviewed
- [ ] Team notified
- [ ] DNS propagation complete (wait 24-48 hours)

## Security Hardening

- [ ] SSH password authentication disabled (if using keys)
- [ ] Fail2ban installed and configured
- [ ] Regular security updates scheduled
- [ ] Backup retention policy configured
- [ ] Access logs reviewed

## Performance Optimization

- [ ] Swap space configured (if needed)
- [ ] Redis cache verified working
- [ ] Database indexes checked
- [ ] Nginx gzip compression enabled
- [ ] Resource usage monitored

## Final Steps

- [ ] Test from different devices/networks
- [ ] Share URL with stakeholders
- [ ] Document any customizations
- [ ] Plan for maintenance schedule

---

**Date Deployed:** ________________

**Deployed By:** ________________

**Domain:** ________________

**Droplet IP:** ________________

**Notes:**
```



```
