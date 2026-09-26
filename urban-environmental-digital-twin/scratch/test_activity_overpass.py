import urllib.request
import urllib.parse
import json
from collections import Counter

# Test querying industrial zones, construction sites, and land use around Bhosari and Shivajinagar
query = """
[out:json][timeout:35];
(
  // Industrial polygons and points
  way(around:2500, 18.6401, 73.8490)["landuse"="industrial"];
  node(around:2500, 18.6401, 73.8490)["industrial"];
  node(around:2500, 18.6401, 73.8490)["man_made"="works"];
  
  // Construction sites
  way(around:2500, 18.5301, 73.8496)["landuse"="construction"];
  way(around:2500, 18.5301, 73.8496)["highway"="construction"];
  
  // Commercial & institutional landuse around Shivajinagar
  way(around:2500, 18.5301, 73.8496)["landuse"~"commercial|residential|institutional"];
);
out tags center;
"""

url = "https://overpass-api.de/api/interpreter"
data = urllib.parse.urlencode({"data": query}).encode("utf-8")
headers = {"User-Agent": "PCCOE-DigitalTwin-Research/1.0 (academic urban environmental research)"}

print("Testing Overpass API for activity/industrial/construction data in Pune...")
try:
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=40) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        elements = res.get("elements", [])
        print(f"SUCCESS! Retrieved {len(elements):,} elements.")
        
        # Breakdown by tag
        types = []
        for e in elements:
            tags = e.get("tags", {})
            if "landuse" in tags:
                types.append(f"landuse:{tags['landuse']}")
            elif "industrial" in tags:
                types.append(f"industrial:{tags['industrial']}")
            elif "highway" in tags:
                types.append(f"highway:{tags['highway']}")
            elif "man_made" in tags:
                types.append(f"man_made:{tags['man_made']}")
        print("Summary of activity elements:", dict(Counter(types)))
except Exception as e:
    print("Error:", e)
