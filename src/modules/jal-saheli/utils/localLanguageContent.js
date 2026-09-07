/**
 * localLanguageContent.js
 * Multi-language verification outcome texts and audio narration generators
 * for English, Marathi (मराठी), and Hindi (हिंदी).
 *
 * Exact text specifications:
 *
 * English:
 *   Observation Verified
 *   Water body detected.
 *   AI Confidence: 92%
 *   Satellite Confidence: 96%
 *   You earned ₹25.
 *
 * Marathi:
 *   ✓ निरीक्षण सत्यापित झाले
 *   पाण्याचे क्षेत्र आढळले आहे.
 *   AI विश्वास: 92%
 *   उपग्रह पडताळणी: 96%
 *   तुमच्या निरीक्षणासाठी ₹25 कमाई मिळाली आहे.
 *
 * Hindi:
 *   ✓ अवलोकन सत्यापित हुआ
 *   जल क्षेत्र की पुष्टि हुई है।
 *   AI विश्वास: 92%
 *   उपग्रह सत्यापन: 96%
 *   आपने ₹25 कमाए हैं।
 */

export const LOCALIZED_CONTENT = {
  en: {
    langId: 'en',
    langLabel: 'English',
    nativeLabel: 'English',
    title: 'Observation Verified',
    hasCheckInTitle: false,
    detection: 'Water body detected.',
    aiLabel: (score = 92) => `AI Confidence: ${score}%`,
    satelliteLabel: (score = 96) => `Satellite Confidence: ${score}%`,
    rewardText: (amt = 25) => `You earned ₹${amt}.`,
    voiceText: (scoreAi = 92, scoreSat = 96, amt = 25) =>
      `Observation Verified. Water body detected. AI Confidence: ${scoreAi} percent. Satellite Confidence: ${scoreSat} percent. You earned ${amt} rupees.`,
    listenPrompt: 'Listen Narration',
    speakingText: 'Playing audio…',
    dbtBadge: 'DBT Credited to Jan Dhan',
    verifiedStamp: 'Verified Decision',
    subText: 'Dual-engine consensus reached via GeoBrain-v3 and Sentinel-2 satellite audit.',
  },
  mr: {
    langId: 'mr',
    langLabel: 'Marathi',
    nativeLabel: 'मराठी',
    title: '✓ निरीक्षण सत्यापित झाले',
    hasCheckInTitle: true,
    detection: 'पाण्याचे क्षेत्र आढळले आहे.',
    aiLabel: (score = 92) => `AI विश्वास: ${score}%`,
    satelliteLabel: (score = 96) => `उपग्रह पडताळणी: ${score}%`,
    rewardText: (amt = 25) => `तुमच्या निरीक्षणासाठी ₹${amt} कमाई मिळाली आहे.`,
    voiceText: (scoreAi = 92, scoreSat = 96, amt = 25) =>
      `निरीक्षण सत्यापित झाले. पाण्याचे क्षेत्र आढळले आहे. AI विश्वास: ${scoreAi} टक्के. उपग्रह पडताळणी: ${scoreSat} टक्के. तुमच्या निरीक्षणासाठी ${amt} रुपये कमाई मिळाली आहे.`,
    listenPrompt: 'आवाज ऐका (Listen Audio)',
    speakingText: 'ऑडिओ चालू आहे… (Speaking…)',
    dbtBadge: 'जन धन खात्यात थेट जमा',
    verifiedStamp: 'सत्यापित निकाल',
    subText: 'जियोब्रेन-v3 एआय आणि सेंटिनेल-२ उपग्रह द्वारे दुहेरी पडताळणी पूर्ण.',
  },
  hi: {
    langId: 'hi',
    langLabel: 'Hindi',
    nativeLabel: 'हिंदी',
    title: '✓ अवलोकन सत्यापित हुआ',
    hasCheckInTitle: true,
    detection: 'जल क्षेत्र की पुष्टि हुई है।',
    aiLabel: (score = 92) => `AI विश्वास: ${score}%`,
    satelliteLabel: (score = 96) => `उपग्रह सत्यापन: ${score}%`,
    rewardText: (amt = 25) => `आपने ₹${amt} कमाए हैं।`,
    voiceText: (scoreAi = 92, scoreSat = 96, amt = 25) =>
      `अवलोकन सत्यापित हुआ. जल क्षेत्र की पुष्टि हुई है. AI विश्वास: ${scoreAi} प्रतिशत. उपग्रह सत्यापन: ${scoreSat} प्रतिशत. आपने ${amt} रुपये कमाए हैं.`,
    listenPrompt: 'आवाज़ सुनें (Listen Audio)',
    speakingText: 'ऑडियो चल रहा है… (Speaking…)',
    dbtBadge: 'जन धन खाते में सीधे हस्तांतरित',
    verifiedStamp: 'सत्यापित निर्णय',
    subText: 'जियोब्रेन-v3 एआई और सेंटिनल-2 उपग्रह द्वारा दोहरा सत्यापन सफल।',
  },
};
