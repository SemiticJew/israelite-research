import os, json, hashlib, xml.etree.ElementTree as ET

KML_PATHS = [
    os.path.join("data","all.kml"),
    os.path.join(os.path.expanduser("~"),"Downloads","all.kml")
]

NS = {"k":"http://www.opengis.net/kml/2.2"}

def find_kml():
    for p in KML_PATHS:
        if os.path.exists(p):
            return p
    raise SystemExit("all.kml not found. Place it at data/all.kml or ~/Downloads/all.kml")

def parse_coords(text):
    if not text: return []
    pts = []
    for tok in text.strip().replace("\n"," ").split():
        parts = tok.split(",")
        if len(parts) >= 2:
            try:
                lon = float(parts[0]); lat = float(parts[1])
                pts.append([lon, lat])
            except ValueError:
                continue
    return pts

def md6(s):
    return hashlib.md5(s.encode("utf-8")).hexdigest()[:6]

def ensure_dir(p):
    os.makedirs(os.path.dirname(p), exist_ok=True)

def write_point(gid, coords):
    path = os.path.join("data","geometry", f"{gid}.lonlats.json")
    ensure_dir(path)
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"id": gid, "type":"point", "lonlats":[coords[0]]}, f, indent=2)
    return path

def write_line(gid, coords):
    path = os.path.join("data","geometry", f"{gid}.geometry.geojson")
    ensure_dir(path)
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"type":"LineString","coordinates":coords}, f, indent=2)
    return path

def write_polygon(gid, rings):
    # rings: list of rings; we use first as outer
    outer = rings[0] if rings else []
    # Close ring if not closed
    if outer and outer[0] != outer[-1]:
        outer = outer + [outer[0]]
    path = os.path.join("data","geometry", f"{gid}.simplified.geojson")
    ensure_dir(path)
    with open(path,"w",encoding="utf-8") as f:
        json.dump({"type":"Polygon","coordinates":[outer]}, f, indent=2)
    return path

def collect_placemarks(root):
    # returns list of (name, description, list_of_geoms)
    # geom dict: {"kind":"point|line|polygon", "coords": [...]} for point/line
    #            or {"kind":"polygon","rings":[[...]]} for polygon
    out = []
    for pm in root.findall(".//k:Placemark", NS):
        name = (pm.findtext("k:name", default="", namespaces=NS) or "").strip()
        desc = (pm.findtext("k:description", default="", namespaces=NS) or "").strip()

        geoms = []

        # Point
        for pt in pm.findall(".//k:Point", NS):
            coords = parse_coords(pt.findtext("k:coordinates", namespaces=NS))
            if coords:
                geoms.append({"kind":"point","coords":[coords[0]]})

        # LineString
        for ln in pm.findall(".//k:LineString", NS):
            coords = parse_coords(ln.findtext("k:coordinates", namespaces=NS))
            if len(coords) >= 2:
                geoms.append({"kind":"line","coords":coords})

        # Polygon (outerBoundaryIs/LinearRing)
        for poly in pm.findall(".//k:Polygon", NS):
            rings = []
            outer = poly.find(".//k:outerBoundaryIs/k:LinearRing/k:coordinates", NS)
            if outer is not None:
                coords = parse_coords(outer.text)
                if len(coords) >= 3:
                    rings.append(coords)
            # we ignore inner rings for simplicity here; can be added if needed
            if rings:
                geoms.append({"kind":"polygon","rings":rings})

        if geoms:
            out.append((name, desc, geoms))
    return out

def main():
    kml_path = find_kml()
    print(f"Reading {kml_path}")
    tree = ET.parse(kml_path)
    root = tree.getroot()

    placemarks = collect_placemarks(root)
    print(f"Placemarks with geometry: {len(placemarks)}")

    index = []
    seen_gids = set()
    count = 0

    for name, desc, geoms in placemarks:
        if not name:
            name = "Unnamed"
        # If multiple geoms in one placemark, suffix numbers
        for i, g in enumerate(geoms, start=1):
            base = f"{name}|{g['kind']}"
            if g["kind"] == "point":
                base += f"|{g['coords'][0][0]:.5f},{g['coords'][0][1]:.5f}"
            elif g["kind"] == "line" and g["coords"]:
                base += f"|{g['coords'][0][0]:.5f},{g['coords'][0][1]:.5f}"
            elif g["kind"] == "polygon" and g["rings"] and g["rings"][0]:
                base += f"|{g['rings'][0][0][0]:.5f},{g['rings'][0][0][1]:.5f}"
            gid = "g" + md6(base + (f"#{i}" if len(geoms)>1 else ""))

            # Ensure unique gid in case of collisions
            step = 0
            unique_gid = gid
            while unique_gid in seen_gids:
                step += 1
                unique_gid = gid[:-1] + "abcdef0123456789"[step % 16]
            gid = unique_gid
            seen_gids.add(gid)

            # Write geometry file
            if g["kind"] == "point":
                write_point(gid, g["coords"])
                type_hint = "city"
            elif g["kind"] == "line":
                write_line(gid, g["coords"])
                type_hint = "route"
            else:
                write_polygon(gid, g["rings"])
                type_hint = "region"

            # Create record
            rid = "a" + md6(name + gid)
            rec = {
                "id": rid,
                "title": name,
                "type": type_hint,
                "period": "",
                "geometry_id": gid,
                "blurb": desc.strip()
            }
            index.append(rec)
            count += 1

    # Write index
    with open(os.path.join("data","ancient.index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2)

    print(f"Wrote data/ancient.index.json with {len(index)} records.")
    print("Geometry files written under data/geometry/")
    print("Done.")

if __name__ == "__main__":
    main()
