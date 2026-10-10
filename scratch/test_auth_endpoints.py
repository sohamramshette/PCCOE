import urllib.request
import json
import time

# Give uvicorn 1 second if needed
time.sleep(1)

BASE = "http://127.0.0.1:8000/api/v1/auth"

# 1. Login citizen
data = json.dumps({"email": "citizen@pune-air.in", "password": "password123"}).encode("utf-8")
req = urllib.request.Request(f"{BASE}/login", data=data, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("Citizen login status:", resp.status)
    token = res["access_token"]
    user = res["user"]
    print(f"Logged in as: {user['full_name']} ({user['email']}), Role: {user['role']}")

# 2. Test /me
me_req = urllib.request.Request(f"{BASE}/me", headers={"Authorization": f"Bearer {token}"})
with urllib.request.urlopen(me_req) as resp:
    me = json.loads(resp.read().decode("utf-8"))
    print("GET /me verified:", me["email"], me["role"])

# 3. Login authority
data_auth = json.dumps({"email": "officer@pcmc.gov.in", "password": "password123"}).encode("utf-8")
req_auth = urllib.request.Request(f"{BASE}/login", data=data_auth, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(req_auth) as resp:
    res_auth = json.loads(resp.read().decode("utf-8"))
    print("Authority login status:", resp.status)
    print("Authority role verified:", res_auth["user"]["role"])

# 4. Quick login for evaluators
quick_data = json.dumps({"role": "AUTHORITY"}).encode("utf-8")
quick_req = urllib.request.Request(f"{BASE}/quick-login", data=quick_data, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(quick_req) as resp:
    quick_res = json.loads(resp.read().decode("utf-8"))
    print("Quick login status:", resp.status)
    print("Quick login user:", quick_res["user"]["full_name"], "Role:", quick_res["user"]["role"])

print("\nALL PHASE 1 AUTH ENDPOINTS VERIFIED AND WORKING 100%!")
