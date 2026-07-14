# Oracle Cloud Free Tier - Face Backend Setup Guide

## 1. Create Oracle Cloud Account

1. Go to https://cloud.oracle.com
2. Click **Start for Free**
3. Fill in your details (name, email, country)
4. Verify your email address
5. Add a credit/debit card (charged $1, auto-refunded in 1-3 days)
6. Select **Home Region** (pick closest to your users, e.g. `ap-mumbai-1` for India)
7. Complete signup and log in

---

## 2. Create VM Instance

1. On Dashboard, click **Create a VM** (or hamburger menu → Compute → Instances → Create)
2. Fill in:
   - **Name**: `sucesskart-face-backend`
   - **Image**: Canonical Ubuntu 24.04 (ARM-based)
   - **Shape**: VM.Standard.A1.Flex
   - **OCPU count**: 4
   - **Memory**: 24 GB
3. **SSH Keys**:
   - Click "Generate SSH key pair"
   - Download both the private key (.key) and public key (.pub)
   - Save them somewhere safe on your laptop
4. Click **Create** → wait 2-3 minutes for the VM to boot
5. Note down the **Public IP address** shown on the instance page

---

## 3. Open Port 5000 (Firewall)

1. Go to your VM instance page
2. Click the **Virtual Cloud Network** link (VCN name)
3. Click **Security Lists** (under Resources)
4. Click **Default Security List** → **Add Ingress Rule**
5. Fill in:
   - **Source CIDR**: `0.0.0.0/0`
   - **Destination Port**: `5000`
6. Click **Add Ingress Rule**

---

## 4. Connect to VM

Open PowerShell/Terminal on your laptop and run:

```bash
ssh -i "C:\path\to\your-private-key.key" ubuntu@<YOUR-PUBLIC-IP>
```

Replace:
- `C:\path\to\your-private-key.key` → path to the downloaded .key file
- `<YOUR-PUBLIC-IP>` → the IP address from step 2

Example:
```bash
ssh -i "C:\Users\kotth\Downloads\ssh-key-2026.key" ubuntu@129.154.xx.xx
```

---

## 5. Install Dependencies on VM

Once connected via SSH, run these commands one by one:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv build-essential cmake git
```

This installs:
- Python 3 and pip
- C++ build tools (needed for dlib compilation)
- CMake (needed for dlib)
- Git

---

## 6. Clone the Repository

```bash
git clone https://github.com/sainani-1/SucessKart.git
cd SucessKart/face-backend
```

---

## 7. Create Virtual Environment & Install

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

**Note**: dlib compilation takes 3-5 minutes. This is normal. Don't cancel it.

---

## 8. Create Environment File

```bash
nano .env
```

Paste these lines (replace with your actual values):

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=5000
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## 9. Test the Server

```bash
python app.py
```

You should see:
```
* Running on http://0.0.0.0:5000
```

Open browser and go to: `http://<YOUR-PUBLIC-IP>:5000/api/health`

If you see `{"status":"ok","dlib":true,...}` — it's working!

Press `Ctrl+C` to stop the test.

---

## 10. Set Up Auto-Restart with systemd

This ensures the server restarts automatically if the VM reboots.

```bash
sudo nano /etc/systemd/system/face-backend.service
```

Paste this (press `i` to enter insert mode first):

```ini
[Unit]
Description=Face Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/SucessKart/face-backend
ExecStart=/home/ubuntu/SucessKart/face-backend/venv/bin/gunicorn app:app --bind 0.0.0.0:5000 --workers 1 --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

Press `Esc`, type `:wq`, press `Enter` to save and exit.

Enable and start:
```bash
sudo systemctl enable face-backend
sudo systemctl start face-backend
```

Check status:
```bash
sudo systemctl status face-backend
```

Should show `active (running)` in green.

---

## 11. Update Vercel Environment Variable

1. Go to Vercel Dashboard → your project → Settings → Environment Variables
2. Find or add: `VITE_FACE_BACKEND_URL`
3. Set value to: `http://<YOUR-PUBLIC-IP>:5000`
4. Save → redeploy your frontend

---

## 12. Re-register Your Face

After deployment, open your app on laptop and register your face again.
Then test login on both laptop AND mobile.

---

## Useful Commands (for future reference)

### Check server logs
```bash
sudo journalctl -u face-backend -f
```

### Restart server
```bash
sudo systemctl restart face-backend
```

### Stop server
```bash
sudo systemctl stop face-backend
```

### Update code after git push
```bash
cd ~/SucessKart
git pull
sudo systemctl restart face-backend
```

### Check dlib status
```bash
curl http://localhost:5000/api/health
```

---

## Cost

**$0/month** — Oracle Cloud free tier includes:
- 4 OCPUs ARM (A1.Flex)
- 24 GB RAM
- 200 GB storage
- Always free (no expiry)
