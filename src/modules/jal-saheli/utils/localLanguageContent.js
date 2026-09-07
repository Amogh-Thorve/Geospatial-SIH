/**
 * localLanguageContent.js
 * Multi-language verification outcome texts (no fabricated default scores).
 */

function confidenceText(score, enLabel, mrLabel, hiLabel, lang) {
  if (score == null || Number.isNaN(score)) {
    if (lang === 'mr') return `${mrLabel}: उपलब्ध नाही`;
    if (lang === 'hi') return `${hiLabel}: उपलब्ध नहीं`;
    return `${enLabel}: unavailable`;
  }
  if (lang === 'mr') return `${mrLabel}: ${score}%`;
  if (lang === 'hi') return `${hiLabel}: ${score}%`;
  return `${enLabel}: ${score}%`;
}

export const LOCALIZED_CONTENT = {
  en: {
    langId: 'en',
    langLabel: 'English',
    nativeLabel: 'English',
    title: 'Observation analyzed',
    hasCheckInTitle: false,
    detection: 'Backend analysis complete.',
    aiLabel: (score) => confidenceText(score, 'AI confidence', 'AI विश्वास', 'AI विश्वास', 'en'),
    satelliteLabel: (score) =>
      confidenceText(score, 'Satellite confidence', 'उपग्रह पडताळणी', 'उपग्रह सत्यापन', 'en'),
    rewardText: (amt) =>
      amt != null && amt > 0 ? `You earned ₹${amt}.` : null,
    voiceText: (scoreAi, scoreSat, amt) => {
      const ai =
        scoreAi == null ? 'AI confidence unavailable' : `AI confidence ${scoreAi} percent`;
      const sat =
        scoreSat == null
          ? 'Satellite confidence unavailable'
          : `Satellite confidence ${scoreSat} percent`;
      const pay =
        amt != null && amt > 0 ? `You earned ${amt} rupees.` : 'No DBT reward recorded.';
      return `Observation analyzed. ${ai}. ${sat}. ${pay}`;
    },
    listenPrompt: 'Listen narration',
    speakingText: 'Playing audio…',
    dbtBadge: 'DBT only when backend records a reward',
    verifiedStamp: 'Analysis stored',
    subText: 'Results from unified backend Geo AI and local satellite grid lookup.',
    providerLabel: (provider) => provider || 'Unified backend',
    sourceLabel: 'Local satellite grid',
    ndviNdwiLine: (ndvi, ndwi) => {
      const n = ndvi == null ? 'unavailable' : ndvi;
      const w = ndwi == null ? 'unavailable' : ndwi;
      return `NDVI ${n}, NDWI ${w} (grid lookup).`;
    },
  },
  mr: {
    langId: 'mr',
    langLabel: 'Marathi',
    nativeLabel: 'मराठी',
    title: '✓ निरीक्षण विश्लेषण पूर्ण',
    hasCheckInTitle: true,
    detection: 'बॅकएंड विश्लेषण पूर्ण झाले.',
    aiLabel: (score) => confidenceText(score, 'AI confidence', 'AI विश्वास', 'AI विश्वास', 'mr'),
    satelliteLabel: (score) =>
      confidenceText(score, 'Satellite confidence', 'उपग्रह पडताळणी', 'उपग्रह सत्यापन', 'mr'),
    rewardText: (amt) =>
      amt != null && amt > 0 ? `तुमच्या निरीक्षणासाठी ₹${amt} कमाई मिळाली आहे.` : null,
    voiceText: (scoreAi, scoreSat, amt) => {
      const ai =
        scoreAi == null ? 'AI विश्वास उपलब्ध नाही' : `AI विश्वास ${scoreAi} टक्के`;
      const sat =
        scoreSat == null ? 'उपग्रह पडताळणी उपलब्ध नाही' : `उपग्रह पडताळणी ${scoreSat} टक्के`;
      const pay =
        amt != null && amt > 0
          ? `तुमच्या निरीक्षणासाठी ${amt} रुपये कमाई मिळाली आहे.`
          : 'बॅकएंडकडून कोणतेही DBT बक्षीस नोंदवले नाही.';
      return `निरीक्षण विश्लेषण पूर्ण. ${ai}. ${sat}. ${pay}`;
    },
    listenPrompt: 'आवाज ऐका',
    speakingText: 'ऑडिओ चालू आहे…',
    dbtBadge: 'बॅकएंड बक्षीस नोंदवल्यावरच DBT',
    verifiedStamp: 'विश्लेषण जतन',
    subText: 'एकीकृत बॅकएंड Geo AI आणि स्थानिक उपग्रह ग्रिड पडताळणी.',
    providerLabel: (provider) => provider || 'एकीकृत बॅकएंड',
    sourceLabel: 'स्थानिक उपग्रह ग्रिड',
    ndviNdwiLine: (ndvi, ndwi) => {
      const n = ndvi == null ? 'उपलब्ध नाही' : ndvi;
      const w = ndwi == null ? 'उपलब्ध नाही' : ndwi;
      return `NDVI ${n}, NDWI ${w} (ग्रिड लुकअप).`;
    },
  },
  hi: {
    langId: 'hi',
    langLabel: 'Hindi',
    nativeLabel: 'हिंदी',
    title: '✓ अवलोकन विश्लेषण पूर्ण',
    hasCheckInTitle: true,
    detection: 'बैकएंड विश्लेषण पूर्ण।',
    aiLabel: (score) => confidenceText(score, 'AI confidence', 'AI विश्वास', 'AI विश्वास', 'hi'),
    satelliteLabel: (score) =>
      confidenceText(score, 'Satellite confidence', 'उपग्रह पडताळणी', 'उपग्रह सत्यापन', 'hi'),
    rewardText: (amt) =>
      amt != null && amt > 0 ? `आपने ₹${amt} कमाए हैं।` : null,
    voiceText: (scoreAi, scoreSat, amt) => {
      const ai =
        scoreAi == null ? 'AI विश्वास उपलब्ध नहीं' : `AI विश्वास ${scoreAi} प्रतिशत`;
      const sat =
        scoreSat == null ? 'उपग्रह सत्यापन उपलब्ध नहीं' : `उपग्रह सत्यापन ${scoreSat} प्रतिशत`;
      const pay =
        amt != null && amt > 0
          ? `आपने ${amt} रुपये कमाए हैं।`
          : 'बैकएंड से कोई DBT इनाम दर्ज नहीं।';
      return `अवलोकन विश्लेषण पूर्ण. ${ai}. ${sat}. ${pay}`;
    },
    listenPrompt: 'आवाज़ सुनें',
    speakingText: 'ऑडियो चल रहा है…',
    dbtBadge: 'DBT केवल जब बैकएंड इनाम दर्ज करे',
    verifiedStamp: 'विश्लेषण संग्रहीत',
    subText: 'एकीकृत बैकएंड Geo AI और स्थानीय उपग्रह ग्रिड लुकअप।',
    providerLabel: (provider) => provider || 'एकीकृत बैकएंड',
    sourceLabel: 'स्थानीय उपग्रह ग्रिड',
    ndviNdwiLine: (ndvi, ndwi) => {
      const n = ndvi == null ? 'उपलब्ध नहीं' : ndvi;
      const w = ndwi == null ? 'उपलब्ध नहीं' : ndwi;
      return `NDVI ${n}, NDWI ${w} (ग्रिड लुकअप).`;
    },
  },
};
