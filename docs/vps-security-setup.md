

> **OS:** Ubuntu Server  
> **SSH Port:** `52`  
> **Date:** 28 Mars 2026
> **Tags:** #vps #security #ubuntu #ssh #linux

---

## Table of Contents

- [[#Step 1 — Create a User with Sudo Access]]
- [[#Step 2 — SSH Hardening]]
- [[#Step 3 — SSH Key Authentication]]
- [[#Step 4 — Firewall (UFW)]]
- [[#Step 5 — Fail2Ban]]
- [[#Step 6 — Automatic Security Updates]]
- [[#Step 7 — User & Privilege Hardening]]
- [[#Step 8 — Intrusion Detection]]
- [[#Step 9 — Monitoring & Logging]]
- [[#Security Checklist]]
- [[#Quick Reference]]

---

## Step 1 — Create a User with Sudo Access

Never operate as `root`. Create a dedicated admin user first.

### Create the user (interactive)

```bash
sudo adduser username
```

### Add user to sudo group

```bash
sudo usermod -aG sudo username
```

### Verify sudo access

```bash
su - username
sudo whoami   # Expected output: root
```

### Alternative (non-interactive)

```bash
sudo useradd -m -s /bin/bash -G sudo username
sudo passwd username
```

|Flag|Meaning|
|---|---|
|`-m`|Create home directory|
|`-s /bin/bash`|Set default shell to bash|
|`-G sudo`|Add to sudo group at creation|

> [!tip] Verify group membership Run `groups username` — output should include `sudo`

---

## Step 2 — SSH Hardening

### Edit the SSH config file

```bash
sudo nano /etc/ssh/sshd_config
```

### Settings applied

```ini
Port 52                      # Changed from default 22
PermitRootLogin no           # Disable root login
PasswordAuthentication no    # SSH keys only
MaxAuthTries 3               # Limit login attempts
AllowUsers youruser          # Whitelist specific users
```

|Directive|Value|Purpose|
|---|---|---|
|`Port`|`52`|Avoids automated scans on port 22|
|`PermitRootLogin`|`no`|No direct root SSH access|
|`PasswordAuthentication`|`no`|Keys only, no passwords|
|`MaxAuthTries`|`3`|Disconnect after 3 failed attempts|
|`AllowUsers`|`youruser`|Whitelist specific users|

### Restart SSH to apply

```bash
sudo systemctl restart sshd
```

> [!warning] Important Port is now **52**. Always connect with `ssh -p 52 user@your-vps-ip`

---

## Step 3 — SSH Key Authentication

Passwords are disabled — SSH keys are required to log in.

### Generate key pair (on your LOCAL machine)

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

### Copy public key to the server

```bash
ssh-copy-id -p 52 user@your-vps-ip
```

> [!danger] Critical Store your private key securely. If lost, you will be locked out.

---

## Step 4 — Firewall (UFW)

### Apply firewall rules

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 52/tcp        # SSH on custom port
sudo ufw allow 80/tcp        # HTTP
sudo ufw allow 443/tcp       # HTTPS
sudo ufw enable
sudo ufw status verbose
```

### Active rules

|Port|Protocol|Service|Status|
|---|---|---|---|
|`52`|TCP|SSH (custom)|✅ Allowed|
|`80`|TCP|HTTP|✅ Allowed|
|`443`|TCP|HTTPS|✅ Allowed|
|All others|Any|—|🚫 Denied|

---

## Step 5 — Fail2Ban

Automatically bans IPs that show brute-force behavior.

### Install

```bash
sudo apt install fail2ban -y
```

### Configure `/etc/fail2ban/jail.local`

```ini
[sshd]
enabled  = true
port     = 52
maxretry = 5
bantime  = 1h
findtime = 10m
```

### Enable and start

```bash
sudo systemctl enable --now fail2ban
```

### Useful commands

```bash
sudo fail2ban-client status sshd     # Check banned IPs
sudo fail2ban-client unban <ip>      # Unban an IP manually
```

---

## Step 6 — Automatic Security Updates

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Step 7 — User & Privilege Hardening

### Lock the root account

```bash
sudo passwd -l root
```

### Monitor sudo usage

```bash
sudo cat /var/log/auth.log | grep sudo
```

---

## Step 8 — Intrusion Detection

### Rootkit Hunter

```bash
sudo apt install rkhunter -y
sudo rkhunter --check
```

### AIDE — File Integrity Monitoring

```bash
sudo apt install aide -y
sudo aideinit
```

---

## Step 9 — Monitoring & Logging

### Logwatch

```bash
sudo apt install logwatch -y
sudo logwatch --detail high --mailto your@email.com --range today
```

### Useful monitoring commands

|Command|Purpose|
|---|---|
|`ss -tulnp`|Show open ports and listening services|
|`who`|Currently logged-in users|
|`last`|Recent login history|
|`sudo lynis audit system`|Full system security audit|
|`sudo ufw status verbose`|Check firewall rules|
|`sudo fail2ban-client status sshd`|Check Fail2Ban / banned IPs|
|`sudo rkhunter --check`|Run rootkit scan|

---

## Security Checklist

- [ ] 🔴 Create non-root sudo user
- [ ] 🔴 Change SSH port to `52`
- [ ] 🔴 Disable root SSH login
- [ ] 🔴 Enable SSH key authentication only
- [ ] 🔴 Enable UFW firewall
- [ ] 🟠 Install and configure Fail2Ban
- [ ] 🟠 Enable automatic security updates
- [ ] 🟡 Lock root account password
- [ ] 🟡 Install rkhunter / AIDE
- [ ] 🟡 Enable AppArmor (`sudo systemctl enable apparmor`)
- [ ] 🟢 Set up Logwatch email alerts
- [ ] 🟢 Enable 2FA for SSH (`sudo apt install libpam-google-authenticator`)

---

## Quick Reference

### Connect to your VPS

```bash
ssh -p 52 youruser@your-vps-ip
```

### Key file locations

|Path|Purpose|
|---|---|
|`/etc/ssh/sshd_config`|SSH daemon configuration|
|`/etc/fail2ban/jail.local`|Fail2Ban jail config|
|`/etc/ufw/`|UFW firewall rules|
|`/var/log/auth.log`|Authentication & sudo logs|
|`/var/log/fail2ban.log`|Fail2Ban ban events|
|`~/.ssh/authorized_keys`|Authorized public keys|

### AppArmor (optional extra hardening)

```bash
sudo systemctl enable apparmor
sudo systemctl start apparmor
sudo aa-status
```

### 2FA for SSH (optional)

```bash
sudo apt install libpam-google-authenticator -y
google-authenticator
```

---

> [!tip] Periodic audit Run `sudo lynis audit system` regularly to get a security score and recommendations.

> [!note] Keep this updated Update this note whenever you make changes to the server configuration.