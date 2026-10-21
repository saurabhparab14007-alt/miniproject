from fastapi import APIRouter, Query
from typing import Optional
from backend.database import get_db_connection

router = APIRouter(prefix="/api/pharmacies", tags=["Nearby Medical Stores & Pharmacies"])

@router.get("")
def list_nearby_pharmacies(
    medicine: Optional[str] = Query(None, description="Search by specific medicine e.g. Inhaler, Insulin, Paracetamol"),
    only_24h: bool = Query(False, description="Filter for 24-hour pharmacies only")
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM pharmacies WHERE 1=1"
    params = []

    if only_24h:
        query += " AND is_24_hours = 1"

    if medicine:
        query += " AND emergency_medicines LIKE ?"
        params.append(f"%{medicine.strip()}%")

    query += " ORDER BY distance_km ASC"

    cursor.execute(query, params)
    stores = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total": len(stores),
        "pharmacies": stores,
        "emergency_helpline": "108 (National Emergency Ambulance) / 102 (Free Health Line)"
    }
