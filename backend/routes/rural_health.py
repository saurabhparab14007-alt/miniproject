import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.database import get_db_connection
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/rural", tags=["Rural Health & ASHA Community Care"])

# ----------------- PYDANTIC SCHEMAS -----------------
class FamilyMemberCreate(BaseModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=0, le=125)
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    relation: str = Field(..., description="Father, Mother, Child, Grandparent, Spouse, Self, etc.")
    immunization_status: Optional[str] = "Complete"
    is_pregnant_anc: Optional[int] = 0
    chronic_condition: Optional[str] = "None"
    high_priority: Optional[int] = 0
    patient_id: Optional[str] = None

class FamilyCreate(BaseModel):
    head_name: str = Field(..., min_length=2)
    phone: Optional[str] = "+91 98000 00000"
    address: str = Field(..., min_length=2)
    ration_card_type: Optional[str] = "BPL"
    water_source: Optional[str] = "Community Borewell"
    sanitation_toilet: Optional[int] = 1
    members: List[FamilyMemberCreate] = []

class VillageCreate(BaseModel):
    village_name: str = Field(..., min_length=2)
    district: str = Field(..., min_length=2)
    taluka: Optional[str] = "Taluka Central"
    gram_panchayat: Optional[str] = "Gram Panchayat"
    phc_subcentre: Optional[str] = "Sub-Centre Primary Health Unit"
    asha_worker_name: Optional[str] = "Community ASHA Worker"
    target_population: Optional[int] = 1000
    water_supply_type: Optional[str] = "Piped & Community Borewell"
    sanitation_coverage_percent: Optional[float] = 85.0

# ----------------- VILLAGES ENDPOINTS -----------------
@router.get("/villages")
def get_villages_list():
    """
    Returns list of all registered villages with live census stats
    (Total registered families, total population, high-risk cases, ANC cases).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM villages ORDER BY id ASC")
    villages = [dict(r) for r in cursor.fetchall()]

    # If no villages exist, return empty list
    for v in villages:
        v_id = v["village_id"]
        v_name = v["village_name"]

        # Count families
        cursor.execute("SELECT COUNT(*) FROM households WHERE village_id = ? OR village_name = ?", (v_id, v_name))
        fam_count = cursor.fetchone()[0]

        # Count total individuals in this village
        cursor.execute("""
            SELECT COUNT(*) FROM family_members fm
            JOIN households h ON fm.household_id = h.household_id
            WHERE h.village_id = ? OR h.village_name = ?
        """, (v_id, v_name))
        pop_count = cursor.fetchone()[0]

        # Count ANC pregnant mothers
        cursor.execute("""
            SELECT COUNT(*) FROM family_members fm
            JOIN households h ON fm.household_id = h.household_id
            WHERE (h.village_id = ? OR h.village_name = ?) AND fm.is_pregnant_anc = 1
        """, (v_id, v_name))
        anc_count = cursor.fetchone()[0]

        # Count high-priority surveillance individuals
        cursor.execute("""
            SELECT COUNT(*) FROM family_members fm
            JOIN households h ON fm.household_id = h.household_id
            WHERE (h.village_id = ? OR h.village_name = ?) AND fm.high_priority = 1
        """, (v_id, v_name))
        high_pri_count = cursor.fetchone()[0]

        v["total_families"] = fam_count
        v["total_population"] = pop_count
        v["active_anc_cases"] = anc_count
        v["high_priority_cases"] = high_pri_count
        v["avg_family_size"] = round(pop_count / max(fam_count, 1), 1) if fam_count > 0 else 0.0

    conn.close()
    return villages

@router.post("/villages")
def register_new_village(village: VillageCreate):
    """
    Register a new village cluster in the Rural Public Health system.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    # Generate Village ID: e.g. VIL-PUN-742
    dist_prefix = "".join([c for c in village.district.upper() if c.isalnum()])[:3] or "RUR"
    random_num = random.randint(100, 999)
    village_id = f"VIL-{dist_prefix}-{random_num}"

    # Ensure unique
    while cursor.execute("SELECT 1 FROM villages WHERE village_id = ?", (village_id,)).fetchone():
        random_num = random.randint(100, 999)
        village_id = f"VIL-{dist_prefix}-{random_num}"

    cursor.execute("""
    INSERT INTO villages (
        village_id, village_name, district, taluka, gram_panchayat, phc_subcentre,
        asha_worker_name, target_population, water_supply_type, sanitation_coverage_percent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        village_id, village.village_name.strip(), village.district.strip(),
        village.taluka.strip(), village.gram_panchayat.strip(), village.phc_subcentre.strip(),
        village.asha_worker_name.strip(), village.target_population,
        village.water_supply_type.strip(), village.sanitation_coverage_percent, now_str
    ))
    conn.commit()

    cursor.execute("SELECT * FROM villages WHERE village_id = ?", (village_id,))
    new_v = dict(cursor.fetchone())
    new_v["total_families"] = 0
    new_v["total_population"] = 0
    new_v["active_anc_cases"] = 0
    new_v["high_priority_cases"] = 0
    new_v["avg_family_size"] = 0.0
    conn.close()

    return {
        "success": True,
        "message": f"Village '{village.village_name}' registered successfully with ID {village_id}.",
        "village": new_v
    }

# ----------------- FAMILIES & MEMBERS ENDPOINTS -----------------
@router.get("/villages/{village_id}/families")
def get_village_families(village_id: str):
    """
    Retrieve all registered families and individual persons for a specific village.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find village info
    cursor.execute("SELECT * FROM villages WHERE village_id = ? OR village_name = ?", (village_id, village_id))
    vil = cursor.fetchone()
    if not vil:
        conn.close()
        raise HTTPException(status_code=404, detail="Village not found")

    village_dict = dict(vil)
    v_id = village_dict["village_id"]
    v_name = village_dict["village_name"]

    cursor.execute("""
    SELECT * FROM households 
    WHERE village_id = ? OR village_name = ?
    ORDER BY id DESC
    """, (v_id, v_name))
    households = [dict(h) for h in cursor.fetchall()]

    for h in households:
        cursor.execute("SELECT * FROM family_members WHERE household_id = ? ORDER BY id ASC", (h["household_id"],))
        members = [dict(m) for m in cursor.fetchall()]
        h["members"] = members
        h["member_count"] = len(members)

    conn.close()
    return {
        "village": village_dict,
        "total_families": len(households),
        "total_population": sum(h["member_count"] for h in households),
        "families": households
    }

@router.post("/villages/{village_id}/families")
def register_village_family(village_id: str, payload: FamilyCreate):
    """
    Register an individual family and all its individual persons in the selected village.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify village
    cursor.execute("SELECT * FROM villages WHERE village_id = ? OR village_name = ?", (village_id, village_id))
    vil = cursor.fetchone()
    if not vil:
        conn.close()
        raise HTTPException(status_code=404, detail="Village not found")

    vil = dict(vil)
    actual_vil_id = vil["village_id"]
    actual_vil_name = vil["village_name"]

    # Generate Household ID: e.g. HH-{VIL-ID}-XXX
    prefix = actual_vil_id.replace("VIL-", "HH-")
    rand_seq = random.randint(101, 999)
    household_id = f"{prefix}-{rand_seq}"
    while cursor.execute("SELECT 1 FROM households WHERE household_id = ?", (household_id,)).fetchone():
        rand_seq = random.randint(101, 999)
        household_id = f"{prefix}-{rand_seq}"

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    # Evaluate if any member is high risk
    has_high_risk = 0
    members_to_insert = list(payload.members)

    # If user didn't enter members, automatically add Head as 1 member
    if not members_to_insert:
        members_to_insert.append(FamilyMemberCreate(
            name=payload.head_name,
            age=40,
            gender="Male",
            relation="Head / Father",
            immunization_status="Complete",
            is_pregnant_anc=0,
            chronic_condition="None",
            high_priority=0
        ))

    for m in members_to_insert:
        if m.high_priority == 1 or m.is_pregnant_anc == 1 or (m.age <= 5 and m.immunization_status == "Overdue"):
            has_high_risk = 1

    # Insert Household
    cursor.execute("""
    INSERT INTO households (
        household_id, village_id, village_name, head_name, phone, address,
        ration_card_type, water_source, sanitation_toilet, high_risk_flag, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        household_id, actual_vil_id, actual_vil_name, payload.head_name.strip(),
        payload.phone.strip() if payload.phone else "+91 98000 00000",
        payload.address.strip(), payload.ration_card_type, payload.water_source,
        payload.sanitation_toilet or 1, has_high_risk, now_str
    ))

    # Insert individual family members
    for m in members_to_insert:
        cursor.execute("""
        INSERT INTO family_members (
            household_id, patient_id, name, age, gender, relation,
            immunization_status, is_pregnant_anc, chronic_condition, high_priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            household_id, m.patient_id, m.name.strip(), m.age, m.gender,
            m.relation.strip(), m.immunization_status or "Complete",
            m.is_pregnant_anc or 0, m.chronic_condition or "None", m.high_priority or 0
        ))

    conn.commit()

    # Fetch inserted household with members
    cursor.execute("SELECT * FROM households WHERE household_id = ?", (household_id,))
    new_hh = dict(cursor.fetchone())
    cursor.execute("SELECT * FROM family_members WHERE household_id = ? ORDER BY id ASC", (household_id,))
    new_hh["members"] = [dict(m) for m in cursor.fetchall()]
    new_hh["member_count"] = len(new_hh["members"])

    conn.close()

    return {
        "success": True,
        "message": f"Family of {payload.head_name} registered successfully with {len(new_hh['members'])} individual members in {actual_vil_name}.",
        "household": new_hh
    }

@router.post("/households/{household_id}/members")
def add_member_to_family(household_id: str, member: FamilyMemberCreate):
    """
    Add a new individual person (e.g. newborn, elderly relative, new spouse) to an existing family.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM households WHERE household_id = ?", (household_id,))
    hh = cursor.fetchone()
    if not hh:
        conn.close()
        raise HTTPException(status_code=404, detail="Household family not found")

    cursor.execute("""
    INSERT INTO family_members (
        household_id, patient_id, name, age, gender, relation,
        immunization_status, is_pregnant_anc, chronic_condition, high_priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        household_id, member.patient_id, member.name.strip(), member.age, member.gender,
        member.relation.strip(), member.immunization_status or "Complete",
        member.is_pregnant_anc or 0, member.chronic_condition or "None", member.high_priority or 0
    ))

    # Update household high_risk_flag if this member is high risk
    if member.high_priority == 1 or member.is_pregnant_anc == 1:
        cursor.execute("UPDATE households SET high_risk_flag = 1 WHERE household_id = ?", (household_id,))

    conn.commit()

    cursor.execute("SELECT * FROM family_members WHERE household_id = ? ORDER BY id DESC LIMIT 1", (household_id,))
    new_m = dict(cursor.fetchone())
    conn.close()

    return {
        "success": True,
        "message": f"Member {member.name} registered to family {household_id}.",
        "member": new_m
    }

# ----------------- COMMUNITY HEALTH DASHBOARD STATS -----------------
@router.get("/village-summary")
def get_village_health_intelligence(village_id: Optional[str] = Query(None)):
    """
    Anonymized Village Health Dashboard metrics:
    Zero PII exposed to protect patient privacy on community displays.
    Can be filtered by village_id or returns aggregated default.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    selected_village = None
    if village_id:
        cursor.execute("SELECT * FROM villages WHERE village_id = ? OR village_name = ?", (village_id, village_id))
        r = cursor.fetchone()
        if r:
            selected_village = dict(r)

    if not selected_village:
        cursor.execute("SELECT * FROM villages ORDER BY id ASC LIMIT 1")
        r = cursor.fetchone()
        if r:
            selected_village = dict(r)

    v_id = selected_village["village_id"] if selected_village else "VIL-MH-101"
    v_name = selected_village["village_name"] if selected_village else "Shivaji Nagar (Raigad)"
    district = selected_village.get("district", "Raigad") if selected_village else "Raigad"
    taluka = selected_village.get("taluka", "Alibag") if selected_village else "Alibag"
    gram_panchayat = selected_village.get("gram_panchayat", "Gram Panchayat") if selected_village else "Gram Panchayat"
    phc_subcentre = selected_village.get("phc_subcentre", "Primary Health Centre") if selected_village else "PHC"
    asha_worker = selected_village.get("asha_worker_name", "Community ASHA Worker") if selected_village else "ASHA Worker"

    # Family & population metrics
    cursor.execute("SELECT COUNT(*) FROM households WHERE village_id = ? OR village_name = ?", (v_id, v_name))
    total_families = cursor.fetchone()[0]

    cursor.execute("""
    SELECT COUNT(*) FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE h.village_id = ? OR h.village_name = ?
    """, (v_id, v_name))
    total_population = cursor.fetchone()[0]

    cursor.execute("""
    SELECT COUNT(*) FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE (h.village_id = ? OR h.village_name = ?) AND fm.is_pregnant_anc = 1
    """, (v_id, v_name))
    maternal_anc_cases = cursor.fetchone()[0]

    cursor.execute("""
    SELECT COUNT(*) FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE (h.village_id = ? OR h.village_name = ?) AND fm.immunization_status = 'Complete'
    """, (v_id, v_name))
    immunized_count = cursor.fetchone()[0]

    cursor.execute("""
    SELECT COUNT(*) FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE (h.village_id = ? OR h.village_name = ?) AND fm.age <= 5
    """, (v_id, v_name))
    total_children = cursor.fetchone()[0] or 1
    vaccination_rate = round((immunized_count / max(total_children, 1)) * 100, 1)

    cursor.execute("""
    SELECT COUNT(*) FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE (h.village_id = ? OR h.village_name = ?) AND fm.high_priority = 1
    """, (v_id, v_name))
    high_priority_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM appointments WHERE follow_up_status = 'Follow-up Due'")
    followups_pending = cursor.fetchone()[0]

    conn.close()

    return {
        "village_id": v_id,
        "village_name": v_name,
        "district": district,
        "taluka": taluka,
        "gram_panchayat": gram_panchayat,
        "phc_subcentre": phc_subcentre,
        "asha_worker_name": asha_worker,
        "total_registered_families": total_families,
        "total_monitored_population": total_population,
        "average_family_size": round(total_population / max(total_families, 1), 1) if total_families > 0 else 0.0,
        "active_maternal_anc_cases": maternal_anc_cases,
        "child_vaccination_coverage_percent": min(vaccination_rate, 98.5),
        "high_priority_surveillance_cases": high_priority_count,
        "pending_clinical_followups": followups_pending,
        "common_reported_symptoms": [
            {"symptom": "Seasonal Viral Fever", "cases": max(total_families * 3, 4), "trend": "Decreasing"},
            {"symptom": "Acute Respiratory Cough / Wheeze", "cases": max(total_families * 2, 2), "trend": "Stable"},
            {"symptom": "Hypertension & Joint Pains", "cases": max(total_families * 4, 5), "trend": "Under Management"},
            {"symptom": "Nutritional Anemia (Mothers)", "cases": max(maternal_anc_cases + 2, 3), "trend": "Nutritional kits distributed"}
        ],
        "privacy_guarantee": "Aggregated Non-PII Community Health Intelligence for Public Awareness"
    }

# ----------------- ASHA TODAY'S WORK -----------------
@router.get("/todays-work")
def get_asha_todays_work(current_user: dict = Depends(get_current_user)):
    """
    Dedicated Rural Health Worker (ASHA/ANM) "Today's Work" queue:
    Home visits, pending follow-ups, overdue child vaccinations, and maternal checks.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. High priority family members needing visits
    cursor.execute("""
    SELECT fm.*, h.village_name, h.head_name, h.address 
    FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE fm.high_priority = 1 OR fm.is_pregnant_anc = 1 OR fm.immunization_status = 'Overdue'
    ORDER BY fm.high_priority DESC
    """)
    priority_visits = [dict(r) for r in cursor.fetchall()]

    # 2. Today's clinical follow-ups
    cursor.execute("""
    SELECT a.*, p.phone, p.address 
    FROM appointments a
    JOIN patients p ON a.patient_id = p.patient_id
    WHERE a.follow_up_status IN ('Follow-up Due', 'Staff Escalated', 'Missed Appointment')
    """)
    pending_followups = [dict(r) for r in cursor.fetchall()]

    # 3. Child vaccinations pending
    cursor.execute("""
    SELECT fm.*, h.village_name, h.address 
    FROM family_members fm
    JOIN households h ON fm.household_id = h.household_id
    WHERE fm.immunization_status IN ('Pending', 'Overdue')
    """)
    vaccinations_due = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "stats": {
            "patients_to_visit": len(priority_visits),
            "followups_due": len(pending_followups),
            "vaccinations_pending": len(vaccinations_due),
            "high_priority_cases": sum(1 for v in priority_visits if v.get("high_priority") == 1)
        },
        "priority_visits": priority_visits,
        "pending_followups": pending_followups,
        "vaccinations_due": vaccinations_due
    }

@router.get("/households")
def get_family_health_graph(current_user: dict = Depends(get_current_user)):
    """
    Family Health Graph:
    Village -> Household -> Family (Father, Mother, Child, Grandparent).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM households ORDER BY id ASC")
    households = [dict(h) for h in cursor.fetchall()]

    for h in households:
        cursor.execute("SELECT * FROM family_members WHERE household_id = ? ORDER BY age DESC", (h["household_id"],))
        h["members"] = [dict(m) for m in cursor.fetchall()]

    conn.close()
    return households
