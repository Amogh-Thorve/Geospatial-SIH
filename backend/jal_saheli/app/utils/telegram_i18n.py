"""
app/utils/telegram_i18n.py
Multi-language translations and message formatters for the Jal Saheli Telegram Bot.
Supports: English ('en'), Hindi ('hi'), Marathi ('mr').
"""
from __future__ import annotations

from typing import Any

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "हिंदी (Hindi)",
    "mr": "मराठी (Marathi)",
}

DEFAULT_LANGUAGE = "en"


MESSAGES: dict[str, dict[str, str]] = {
    "welcome_choose_language": {
        "en": (
            "Namaste! 🙏 Welcome to Jal Saheli Ground Observation Bot.\n\n"
            "Please select your preferred language:\n"
            "• Send /lang_en for English\n"
            "• Send /lang_hi for हिंदी (Hindi)\n"
            "• Send /lang_mr for मराठी (Marathi)"
        ),
        "hi": (
            "नमस्ते! 🙏 जल सहेली ग्राउंड ऑब्जर्वेशन बॉट में आपका स्वागत है।\n\n"
            "कृपया अपनी भाषा चुनें:\n"
            "• English के लिए /lang_en भेजें\n"
            "• हिंदी के लिए /lang_hi भेजें\n"
            "• मराठी के लिए /lang_mr भेजें"
        ),
        "mr": (
            "नमस्ते! 🙏 जल सहेली ग्राउंड ऑब्झर्व्हेशन बॉटमध्ये आपले स्वागत आहे.\n\n"
            "कृपया आपली पसंतीची भाषा निवडा:\n"
            "• English साठी /lang_en पाठवा\n"
            "• हिंदी साठी /lang_hi पाठवा\n"
            "• मराठी साठी /lang_mr पाठवा"
        ),
    },
    "language_selected": {
        "en": "Language set to English ✅\n\nNow, please send a clear photo of the water body, check dam, farm pond, or borewell.",
        "hi": "भाषा हिंदी सेट की गई ✅\n\nअब, कृपया जल स्रोत, चेक डैम, खेत तालाब या बोरवेल की स्पष्ट तस्वीर (फोटो) भेजें।",
        "mr": "भाषा मराठी सेट केली गेली ✅\n\nआता, कृपया जलसाठा, चेक डॅम, शेततळे किंवा बोअरवेलचा स्पष्ट फोटो पाठवा.",
    },
    "send_photo_prompt": {
        "en": "📷 Please send a photo of the water structure you are observing.",
        "hi": "📷 कृपया उस जल संरचना का फोटो भेजें जिसका आप अवलोकन कर रहे हैं।",
        "mr": "📷 कृपया आपण निरीक्षण करत असलेल्या जलरचनेचा फोटो पाठवा.",
    },
    "photo_received_send_location": {
        "en": "Photo received! 📷 Now please share your GPS location using Telegram's location button.",
        "hi": "फोटो प्राप्त हुआ! 📷 अब कृपया टेलीग्राम लोकेशन बटन दबाकर अपना जीपीएस स्थान (Location) साझा करें।",
        "mr": "फोटो प्राप्त झाला! 📷 आता कृपया टेलिग्रामचे लोकेशन बटण वापरून आपले जीपीएस स्थान (Location) शेअर करा.",
    },
    "invalid_photo": {
        "en": "⚠️ Unsupported image. Please send a valid JPEG, PNG, or WebP photo.",
        "hi": "⚠️ अमान्य तस्वीर। कृपया एक वैध JPEG, PNG या WebP फोटो भेजें।",
        "mr": "⚠️ अमान्य फोटो. कृपया वैध JPEG, PNG किंवा WebP फोटो पाठवा.",
    },
    "location_received_send_notes": {
        "en": (
            "Location recorded! 📍\n\n"
            "Optionally, send a short note or type of water body (e.g. 'check dam', 'farm pond', 'borewell', 'water quality').\n"
            "Or send /skip to submit directly."
        ),
        "hi": (
            "स्थान दर्ज किया गया! 📍\n\n"
            "वैकल्पिक रूप से, एक संक्षिप्त विवरण या जल स्रोत का प्रकार लिखें (उदा. 'चेक डैम', 'खेत तालाब', 'बोरवेल')।\n"
            "या सीधे सबमिट करने के लिए /skip भेजें।"
        ),
        "mr": (
            "स्थान नोंदवले गेले! 📍\n\n"
            "पर्यायीरित्या, लहान वर्णन किंवा पाण्याचा प्रकार लिहा (उदा. 'चेक डॅम', 'शेततळे', 'बोअरवेल').\n"
            "किंवा थेट सबमिट करण्यासाठी /skip पाठवा."
        ),
    },
    "invalid_location": {
        "en": "⚠️ Invalid coordinates received. Please share your live GPS location.",
        "hi": "⚠️ अमान्य निर्देशांक। कृपया अपना लाइव जीपीएस स्थान साझा करें।",
        "mr": "⚠️ अमान्य निर्देशांक. कृपया आपले थेट जीपीएस स्थान शेअर करा.",
    },
    "processing_observation": {
        "en": "⏳ Observation received! Submitting to backend and running dual-engine AI & Satellite verification...",
        "hi": "⏳ अवलोकन प्राप्त हुआ! बैकएंड पर भेजा जा रहा है और एआई तथा उपग्रह सत्यापन किया जा रहा है...",
        "mr": "⏳ निरीक्षण मिळाले! बॅकएंडवर पाठवून एआय आणि उपग्रह पडताळणी केली जात आहे...",
    },
    "cancelled": {
        "en": "Submission cancelled. Send /start to begin a new observation.",
        "hi": "सबमिशन रद्द किया गया। नया अवलोकन शुरू करने के लिए /start भेजें।",
        "mr": "सबमिशन रद्द केले. नवीन निरीक्षण सुरू करण्यासाठी /start पाठवा.",
    },
    "notif_submission_received": {
        "en": "📥 *Submission Received*\nID: `{sub_id}`\nType: {type_label}\nYour observation has been received and queued for analysis.",
        "hi": "📥 *अवलोकन प्राप्त हुआ*\nआईडी: `{sub_id}`\nप्रकार: {type_label}\nआपका अवलोकन प्राप्त हो गया है और विश्लेषण के लिए कतारबद्ध है।",
        "mr": "📥 *निरीक्षण प्राप्त झाले*\nआयडी: `{sub_id}`\nप्रकार: {type_label}\nआपले निरीक्षण प्राप्त झाले असून विश्लेषणासाठी रांगेत आहे.",
    },
    "notif_processing_started": {
        "en": "⚙️ *Verification In Progress*\nID: `{sub_id}`\nAnalyzing photo with GeoBrain-v3 AI and checking Sentinel-2 satellite imagery...",
        "hi": "⚙️ *सत्यापन प्रक्रियाधीन*\nआईडी: `{sub_id}`\nGeoBrain-v3 AI से फोटो और Sentinel-2 उपग्रह इमेजरी का विश्लेषण किया जा रहा है...",
        "mr": "⚙️ *पडताळणी प्रक्रियेत आहे*\nआयडी: `{sub_id}`\nGeoBrain-v3 AI द्वारे फोटो आणि Sentinel-2 उपग्रह चित्रांचे विश्लेषण केले जात आहे...",
    },
    "notif_submission_pending": {
        "en": "⏳ *Submission Pending Review*\nID: `{sub_id}`\nStatus: PENDING\nReason: {reason}\nRequires manual review. No incentive credited yet.",
        "hi": "⏳ *अवलोकन समीक्षाधीन*\nआईडी: `{sub_id}`\nस्थिति: लंबित (PENDING)\nकारण: {reason}\nमानवीय समीक्षा आवश्यक है। अभी कोई प्रोत्साहन राशि जमा नहीं हुई है।",
        "mr": "⏳ *निरीक्षण पुनरावलोकनासाठी प्रलंबित*\nआयडी: `{sub_id}`\nस्थिती: प्रलंबित (PENDING)\nकारण: {reason}\nमानवी पुनरावलोकन आवश्यक आहे. अद्याप कोणतीही प्रोत्साहन रक्कम जमा नाही.",
    },
    "notif_submission_rejected": {
        "en": "❌ *Submission Rejected*\nID: `{sub_id}`\nStatus: REJECTED\nReason: {reason}\nEarnings: ₹0",
        "hi": "❌ *अवलोकन अस्वीकृत*\nआईडी: `{sub_id}`\nस्थिति: अस्वीकृत (REJECTED)\nकारण: {reason}\nकमाई: ₹0",
        "mr": "❌ *निरीक्षण नाकारले गेले*\nआयडी: `{sub_id}`\nस्थिती: नाकारले (REJECTED)\nकारण: {reason}\nकमाई: ₹0",
    },
    "notif_earning_recorded": {
        "en": "💰 *DBT Incentive Credited!*\nID: `{sub_id}`\nAmount: ₹{amount}\nTransaction: `{txn_id}`\nCredited directly to your Jan Dhan / UPI account. Thank you for protecting water resources!",
        "hi": "💰 *डीबीटी प्रोत्साहन राशि जमा!*\nआईडी: `{sub_id}`\nराशि: ₹{amount}\nलेनदेन: `{txn_id}`\nआपके जन धन / यूपीआई खाते में सीधे जमा कर दी गई है। जल संरक्षण में योगदान के लिए धन्यवाद!",
        "mr": "💰 *डीबीटी प्रोत्साहन रक्कम जमा!*\nआयडी: `{sub_id}`\nरक्कम: ₹{amount}\nव्यवहार: `{txn_id}`\nतुमच्या जन धन / यूपीआय खात्यात थेट जमा केली आहे. जलसंधारणातील योगदानाबद्दल धन्यवाद!",
    },
    "help_message": {
        "en": (
            "📖 *Jal Saheli Bot Commands:*\n"
            "/start - Start observation submission\n"
            "/status - Check your submissions & credited earnings\n"
            "/lang - Change preferred language\n"
            "/cancel - Cancel current submission\n"
            "/help - Instructions"
        ),
        "hi": (
            "📖 *जल सहेली बॉट कमांड्स:*\n"
            "/start - नया अवलोकन शुरू करें\n"
            "/status - अपने सबमिशन और कमाई की स्थिति देखें\n"
            "/lang - भाषा बदलें\n"
            "/cancel - वर्तमान सबमिशन रद्द करें\n"
            "/help - सहायता निर्देश"
        ),
        "mr": (
            "📖 *जल सहेली बॉट आज्ञा (Commands):*\n"
            "/start - नवीन निरीक्षण सुरू करा\n"
            "/status - तुमचे सबमिशन आणि मिळालेली कमाई तपासा\n"
            "/lang - भाषा बदला\n"
            "/cancel - चालू सबमिशन रद्द करा\n"
            "/help - मदत आणि सूचना"
        ),
    },
}


def get_msg(key: str, lang: str = "en") -> str:
    """Retrieve message string for a given key and language code."""
    lang_code = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    return MESSAGES.get(key, {}).get(lang_code, MESSAGES.get(key, {}).get(DEFAULT_LANGUAGE, ""))


def format_verification_reply(
    sub_id: str,
    type_label: str,
    status: str,
    ai_score: float,
    sat_score: float,
    final_score: float,
    reward_amount: int,
    rejection_reason: str | None = None,
    lang: str = "en",
) -> str:
    """
    Format localized dual-engine verification outcome.
    Credited earnings message is included ONLY when status is 'verified' and reward > 0.
    """
    lang_code = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE

    if status.lower() == "verified":
        if lang_code == "mr":
            lines = [
                "✅ *निरीक्षण सत्यापित झाले*",
                f"आयडी: `{sub_id}`",
                f"प्रकार: {type_label}",
                f"AI विश्वास: {ai_score:.0f}%",
                f"उपग्रह पडताळणी: {sat_score:.0f}%",
                f"अंतिम विश्वास: {final_score:.0f}%",
                "स्थिती: सत्यापित (VERIFIED)",
                f"💰 *तुमच्या निरीक्षणासाठी ₹{reward_amount} कमाई जन धन खात्यात थेट जमा झाली आहे.*",
            ]
        elif lang_code == "hi":
            lines = [
                "✅ *अवलोकन सत्यापित हुआ*",
                f"आईडी: `{sub_id}`",
                f"प्रकार: {type_label}",
                f"AI विश्वास: {ai_score:.0f}%",
                f"उपग्रह सत्यापन: {sat_score:.0f}%",
                f"अंतिम विश्वास: {final_score:.0f}%",
                "स्थिति: सत्यापित (VERIFIED)",
                f"💰 *आपने ₹{reward_amount} कमाए हैं (जन धन खाते में सीधे हस्तांतरित)।*",
            ]
        else:
            lines = [
                "✅ *Observation Verified*",
                f"ID: `{sub_id}`",
                f"Type: {type_label}",
                f"AI Confidence: {ai_score:.0f}%",
                f"Satellite Confidence: {sat_score:.0f}%",
                f"Consensus Score: {final_score:.0f}%",
                "Status: VERIFIED",
                f"💰 *You earned ₹{reward_amount} (DBT Credited to Jan Dhan).* ",
            ]
        return "\n".join(lines)

    elif status.lower() == "rejected":
        reason = rejection_reason or "Consensus threshold not met"
        if lang_code == "mr":
            lines = [
                "❌ *निरीक्षण नाकारले गेले*",
                f"आयडी: `{sub_id}`",
                f"कारण: {reason}",
                f"अंतिम विश्वास: {final_score:.0f}%",
                "स्थिती: REJECTED",
                "कमाई: ₹0",
            ]
        elif lang_code == "hi":
            lines = [
                "❌ *अवलोकन अस्वीकृत हुआ*",
                f"आईडी: `{sub_id}`",
                f"कारण: {reason}",
                f"अंतिम विश्वास: {final_score:.0f}%",
                "स्थिति: REJECTED",
                "कमाई: ₹0",
            ]
        else:
            lines = [
                "❌ *Observation Rejected*",
                f"ID: `{sub_id}`",
                f"Reason: {reason}",
                f"Consensus Score: {final_score:.0f}%",
                "Status: REJECTED",
                "Earnings: ₹0",
            ]
        return "\n".join(lines)

    else:
        # PROCESSING / PENDING
        if lang_code == "mr":
            lines = [
                "⏳ *निरीक्षण प्रक्रिया चालू आहे*",
                f"आयडी: `{sub_id}`",
                "स्थिती: मानवी पुनरावलोकनासाठी प्रलंबित (PROCESSING)",
                "पडताळणी पूर्ण झाल्यावर निकाल पाठवला जाईल.",
                "कमाई: अद्याप जमा नाही (₹0)",
            ]
        elif lang_code == "hi":
            lines = [
                "⏳ *अवलोकन प्रक्रियाधीन है*",
                f"आईडी: `{sub_id}`",
                "स्थिति: समीक्षा के लिए लंबित (PROCESSING)",
                "सत्यापन पूरा होने पर आपको सूचित किया जाएगा।",
                "कमाई: अभी जमा नहीं हुई (₹0)",
            ]
        else:
            lines = [
                "⏳ *Observation Under Review*",
                f"ID: `{sub_id}`",
                "Status: PROCESSING / PENDING",
                "You will be notified once dual-engine consensus completes.",
                "Earnings: None credited yet (₹0)",
            ]
        return "\n".join(lines)


def format_status_reply(
    cadre_name: str,
    total: int,
    verified: int,
    pending: int,
    accuracy: float | None,
    total_earnings: int,
    lang: str = "en",
) -> str:
    """Format real database status and actual credited earnings."""
    lang_code = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
    acc_display = f"{accuracy:.0f}%" if accuracy is not None else "N/A"

    if lang_code == "mr":
        return (
            f"📊 *जल सहेली सद्यस्थिती अहवाल*\n"
            f"नाव: {cadre_name}\n"
            f"एकूण निरीक्षणे: {total}\n"
            f"सत्यापित: {verified} ✅\n"
            f"प्रलंबित: {pending} ⏳\n"
            f"अचूकता दर: {acc_display}\n"
            f"जमा झालेली एकूण कमाई: ₹{total_earnings} 💰"
        )
    elif lang_code == "hi":
        return (
            f"📊 *जल सहेली स्थिति रिपोर्ट*\n"
            f"नाम: {cadre_name}\n"
            f"कुल अवलोकन: {total}\n"
            f"सत्यापित: {verified} ✅\n"
            f"लंबित: {pending} ⏳\n"
            f"सटीकता दर: {acc_display}\n"
            f"कुल जमा कमाई: ₹{total_earnings} 💰"
        )
    else:
        return (
            f"📊 *Jal Saheli Status Report*\n"
            f"Cadre: {cadre_name}\n"
            f"Total Observations: {total}\n"
            f"Verified: {verified} ✅\n"
            f"Pending Review: {pending} ⏳\n"
            f"Accuracy Rate: {acc_display}\n"
            f"Total Credited Earnings: ₹{total_earnings} 💰"
        )


def format_notification(
    event_key: str,
    lang: str = "en",
    sub_id: str = "",
    type_label: str = "",
    amount: int = 0,
    txn_id: str = "",
    reason: str = "",
) -> str:
    """Format notification message with context parameters populated."""
    raw_template = get_msg(event_key, lang)
    if not raw_template:
        return ""
    try:
        return raw_template.format(
            sub_id=sub_id,
            type_label=type_label,
            amount=amount,
            txn_id=txn_id,
            reason=reason,
        )
    except KeyError:
        return raw_template
