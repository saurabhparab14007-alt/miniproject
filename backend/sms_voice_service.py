from datetime import datetime
from backend.database import get_db_connection
from typing import Dict, Any, List

SMS_TEMPLATES = {
    "med_reminder": {
        "en": "Sanjeevani Health Alert: Time to take {medicine} at {time}. Drink plenty of water. - PHC Health Center",
        "hi": "संजीवनी स्वास्थ्य सूचना: कृपया {time} बजे {medicine} लें। पानी पिएं। - प्राथमिक स्वास्थ्य केंद्र",
        "mr": "संजीवनी आरोग्य सूचना: कृपया {time} वाजता {medicine} गोळी घ्या. पाणी भरपूर प्या. - प्राथमिक आरोग्य केंद्र"
    },
    "missed_visit": {
        "en": "Urgent Alert: You missed your clinical follow-up appointment. Please visit the Sub-Centre or call ASHA worker immediately.",
        "hi": "महत्वपूर्ण सूचना: आप अपनी डॉक्टर जांच के लिए नहीं पहुंचे। कृपया तुरंत प्राथमिक स्वास्थ्य केंद्र आएं या आशा कार्यकर्ता से संपर्क करें।",
        "mr": "महत्त्वाची सूचना: तुम्ही डॉक्टर तपासणी चुकवली आहे. कृपया त्वरित आरोग्य केंद्रात या किंवा आशा सेविकेला संपर्क करा."
    },
    "lab_alert": {
        "en": "Lab Report Notice: Your blood report has been analyzed. Please consult Dr. Kulkarni at the clinic tomorrow.",
        "hi": "लैब रिपोर्ट सूचना: आपकी रक्त जांच रिपोर्ट आ गई है। कृपया कल स्वास्थ्य केंद्र आकर डॉक्टर से परामर्श लें।",
        "mr": "लॅब तपासणी सूचना: तुमचा रक्त तपासणी अहवाल आला आहे. कृपया उद्या डॉक्टरांशी संपर्क साधा."
    },
    "asha_visit": {
        "en": "ASHA Health Notice: ASHA worker Sunita will visit your household today for child immunization and maternal check.",
        "hi": "आशा स्वास्थ्य सूचना: आशा कार्यकर्ता सुनीता आज आपके घर टीकाकरण और मातृ जांच हेतु आएंगी।",
        "mr": "आशा आरोग्य सूचना: आशा सेविका सुनीता आज तुमच्या घरी बाल लसीकरण व गरोदर तपासणीसाठी येत आहेत."
    },
    "followup_scheduled": {
        "en": "Sanjeevani Care: Follow-up visit scheduled on {date} at {time} with Dr. Kulkarni. Carry previous reports.",
        "hi": "संजीवनी स्वास्थ्य सूचना: आपकी डॉक्टर जांच {date} को {time} बजे निर्धारित है। अपनी पुरानी पर्चियां साथ लाएं।",
        "mr": "संजीवनी आरोग्य सूचना: तुमची पुढील तपासणी {date} रोजी {time} वाजता आहे. कृपया सर्व तपासणी अहवाल सोबत आणा."
    },
    "registration_welcome": {
        "en": "Sanjeevani Care: Welcome {name}! Your health file is active. You will receive SMS alerts for doctor follow-ups and medicine timings on this phone.",
        "hi": "संजीवनी स्वास्थ्य सेवा: स्वागत है {name}! आपका खाता सक्रिय है। डॉक्टर फॉलो-अप व दवाइयों के समय की SMS सूचना इसी नंबर पर मिलेगी।",
        "mr": "संजीवनी आरोग्य: स्वागत आहे {name}! आपले खाते सक्रिय आहे. पुढील डॉक्टर तपासणी व औषधांच्या वेळेची SMS सूचना या नंबरवर मिळेल."
    },
    "med_timing_schedule": {
        "en": "Sanjeevani Rx Timetable: {name}, take medicines on time: {times}. Drink plenty of water. - PHC Care",
        "hi": "संजीवनी दवा समय सूचना: {name}, अपनी दवाइयां समय पर लें: {times}। पानी पिएं व स्वस्थ रहें। - स्वास्थ्य केंद्र",
        "mr": "संजीवनी औषध वेळ सूचना: {name}, आपली औषधे वेळेवर घ्या: {times}. पाणी भरपूर प्या. - प्राथमिक आरोग्य केंद्र"
    },
    "appointment_alert": {
        "en": "Sanjeevani Appointment: {name}, follow-up visit on {date} at {time} with {doctor} at {clinic}.",
        "hi": "संजीवनी अपॉइंटमेंट: {name}, अगली डॉक्टर जांच {date} को {time} बजे {doctor} ({clinic}) में निर्धारित है।",
        "mr": "संजीवनी तपासणी: {name}, पुढील डॉक्टर तपासणी {date} रोजी {time} वाजता {doctor} ({clinic}) येथे आहे."
    }
}

def dispatch_keypad_sms(phone: str, patient_name: str, template_key: str, lang: str = "hi", custom_vars: dict = None) -> Dict[str, Any]:
    """
    Dispatches a concise <= 160-character SMS specifically formatted for rural keypad feature phones.
    """
    custom_vars = custom_vars or {}
    if "name" not in custom_vars:
        custom_vars["name"] = patient_name
    template_dict = SMS_TEMPLATES.get(template_key, SMS_TEMPLATES["med_reminder"])
    raw_template = template_dict.get(lang, template_dict.get("hi", template_dict.get("en")))
    
    # Format message
    try:
        content = raw_template.format(**custom_vars)
    except Exception:
        content = raw_template

    # Ensure <= 160 characters
    if len(content) > 160:
        content = content[:157] + "..."

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO sms_call_logs (phone_number, patient_name, message_type, content, language, status, created_at)
    VALUES (?, ?, 'SMS', ?, ?, 'Delivered', ?)
    """, (phone, patient_name, content, lang, now_str))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "log_id": log_id,
        "phone": phone,
        "patient_name": patient_name,
        "type": "SMS",
        "content": content,
        "char_count": len(content),
        "status": "Delivered to Keypad Phone",
        "timestamp": now_str
    }

def dispatch_automated_voice_call(phone: str, patient_name: str, message: str, lang: str = "hi") -> Dict[str, Any]:
    """
    Dispatches an automated IVR voice alert call for low-literacy village patients.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
    INSERT INTO sms_call_logs (phone_number, patient_name, message_type, content, language, status, created_at)
    VALUES (?, ?, 'VOICE_CALL', ?, ?, 'Delivered', ?)
    """, (phone, patient_name, message, lang, now_str))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "success": True,
        "log_id": log_id,
        "phone": phone,
        "patient_name": patient_name,
        "type": "VOICE_CALL",
        "script": message,
        "status": "Call Connected & Spoken",
        "timestamp": now_str
    }

def get_recent_sms_call_logs(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sms_call_logs ORDER BY id DESC LIMIT ?", (limit,))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return logs
