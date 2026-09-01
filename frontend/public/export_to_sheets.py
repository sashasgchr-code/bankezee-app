"""
BankEzee Production DB → Excel Export (one sheet per collection)
Upload the .xlsx to Google Sheets when done.

USAGE:
  pip install pymongo dnspython openpyxl
  python export_to_sheets.py
"""

import pymongo, openpyxl, json, sys
from datetime import datetime
from bson import ObjectId

MONGO_URI = "mongodb+srv://finance-dash-166:d64p1c4lqs2c73a525pg@customer-apps.j2s0aq.mongodb.net/?appName=lead-gen-platform-13&retryWrites=true&w=majority&serverSelectionTimeoutMS=30000"

COLLECTIONS = ["files", "leads", "users", "agents", "bank_policies", "commissions"]

# Fields to SKIP (too large / binary for a spreadsheet)
SKIP_FIELDS = {"_id", "content"}  # 'content' = base64 file blobs


def flatten(obj, prefix=""):
    """Flatten nested dicts/lists into dot-notation keys."""
    out = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            key = f"{prefix}.{k}" if prefix else k
            if key.replace(prefix + ".", "") in SKIP_FIELDS or k in SKIP_FIELDS:
                continue
            if isinstance(v, dict):
                out.update(flatten(v, key))
            elif isinstance(v, list):
                if len(v) > 0 and isinstance(v[0], dict):
                    out[key] = json.dumps(v, default=str)[:32000]
                else:
                    out[key] = ", ".join(str(x) for x in v)[:32000]
            elif isinstance(v, ObjectId):
                out[key] = str(v)
            elif isinstance(v, datetime):
                out[key] = v.isoformat()
            else:
                val = str(v) if v is not None else ""
                out[key] = val[:32000]  # Excel cell limit
    return out


def export():
    print("Connecting to production MongoDB...")
    client = pymongo.MongoClient(MONGO_URI)

    # Auto-detect database name (skip system dbs)
    db_name = None
    for name in client.list_database_names():
        if name not in ("admin", "config", "local"):
            db_name = name
            break
    if not db_name:
        print("ERROR: No application database found!")
        sys.exit(1)

    db = client[db_name]
    print(f"Database: {db_name}\n")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # remove default sheet

    for coll_name in COLLECTIONS:
        count = db[coll_name].count_documents({})
        print(f"Exporting {coll_name}: {count} documents...")

        docs = list(db[coll_name].find({}))
        if not docs:
            ws = wb.create_sheet(title=coll_name)
            ws.append(["(empty collection)"])
            continue

        # Flatten all docs and collect all unique headers
        flat_docs = [flatten(d) for d in docs]
        all_keys = []
        seen = set()
        for fd in flat_docs:
            for k in fd:
                if k not in seen:
                    all_keys.append(k)
                    seen.add(k)

        # Prioritize common fields first
        priority = ["id", "full_name", "name", "email", "phone", "mobile", "role",
                     "status", "is_approved", "bank_name", "city", "requirement",
                     "created_at", "updated_at"]
        ordered = [k for k in priority if k in seen]
        ordered += [k for k in all_keys if k not in ordered]

        ws = wb.create_sheet(title=coll_name)

        # Header row (bold)
        for col, key in enumerate(ordered, 1):
            cell = ws.cell(row=1, column=col, value=key)
            cell.font = openpyxl.styles.Font(bold=True)

        # Data rows
        for row_idx, fd in enumerate(flat_docs, 2):
            for col, key in enumerate(ordered, 1):
                val = fd.get(key, "")
                # Truncate very long values
                if isinstance(val, str) and len(val) > 32000:
                    val = val[:32000] + "...(truncated)"
                ws.cell(row=row_idx, column=col, value=val)

        # Auto-width (approximate)
        for col_idx, key in enumerate(ordered, 1):
            ws.column_dimensions[openpyxl.utils.get_column_letter(col_idx)].width = min(40, max(12, len(key) + 4))

        print(f"  → {count} rows, {len(ordered)} columns")

    filename = f"bankezee_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    wb.save(filename)
    client.close()

    print(f"\n✅ Export complete: {filename}")
    print(f"\nTo open in Google Sheets:")
    print(f"  1. Go to sheets.google.com")
    print(f"  2. File → Import → Upload → select {filename}")
    print(f"  3. Choose 'Replace spreadsheet' → Import")


if __name__ == "__main__":
    export()
