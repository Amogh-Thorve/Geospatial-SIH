export const AI_SUBMISSION_ANALYSIS = {
  classification: {
    label: "Check Dam",
    confidence: 91
  },

  ndvi: {
    change: "+18%",
    interpretation: "Healthy vegetation response"
  },

  ndwi: {
    change: "+0.32",
    interpretation: "Increase in surface water presence"
  },

  satelliteMatch: {
    status: "MATCH",
    confidence: 91,
    statusText: "verified"
  },

  xaiReasons: [
    {
      id: 1,
      title: "Construction Signature Detected",
      description:
        "Computer vision detected masonry stone work and a spillway structure consistent with a check dam.",
      weight: "High Impact"
    },
    {
      id: 2,
      title: "Satellite Evidence Consistent",
      description:
        "Sentinel-2 spectral reflectance changes are consistent with the reported intervention.",
      weight: "High Impact"
    },
    {
      id: 3,
      title: "Location Within Intervention Zone",
      description:
        "The submission coordinates fall within the designated intervention area.",
      weight: "Medium Impact"
    }
  ],

  technicalMetrics: [
    { label: "Catchment Area", value: "14.2 ha" },
    { label: "Storage Capacity", value: "4,500 m³" },
    { label: "Precipitation Index", value: "+1.2 (Moderate Rain)" },
    { label: "Soil Type", value: "Clay Loam (Class C)" }
  ]
};
