import urllib.request
import urllib.parse
import json
from collections import Counter

# Query 1.5km radius around Shivajinagar station (18.5301, 73.8496)
query = """
[out:json][timeout:25];
(
  way(around:1500, 18.5301, 73.8496)["highway"~"motorway|trunk|primary|secondary|tertiary|residential"];
);
out body;
>;
out skel qt;
"""

urls = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]

data = urllib.parse.urlencode({"data": query}).encode("utf-8")
headers = {"User-Agent": "PCCOE-DigitalTwin-Research/1.0 (academic open data acquisition)"}

for url in urls:
    print(f"Trying {url}...")
    try:
        req = urllib.request.Request(url, data=data, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            elements = res.get("elements", [])
            ways = [e for e in elements if e.get("type") == "way"]
            nodes = [e for e in elements if e.get("type") == "node"]
            print(f"SUCCESS on {url}! Retrieved {len(elements):,} elements: {len(ways):,} road segments, {len(nodes):,} nodes.")
            hw_counts = Counter(w.get("tags", {}).get("highway") for w in ways)
            print("Highway distribution around Shivajinagar:", dict(hw_counts))
            break
    except Exception as e:
        print(f"Failed on {url}: {e}")
