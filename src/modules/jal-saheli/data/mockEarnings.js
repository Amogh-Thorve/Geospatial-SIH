/**
 * mockEarnings.js
 * In-memory ledger & incentive payout calculations for the Jal Saheli cadre.
 *
 * In production:
 *   GET /api/jal-saheli/earnings
 *   GET /api/jal-saheli/earnings/summary
 *
 * Starts with an empty transaction ledger (`[]`) and zero credited balance.
 * Updated automatically whenever an observation is verified in-session.
 */

// Per-type reward schedule (INR)
export const REWARD_SCHEDULE = {
  water_body: 25,
  check_dam: 20,
  farm_pond: 25,
  contour_trench: 20,
  gully_plug: 15,
  percolation_tank: 25,
  groundwater: 20,
  irrigation: 20,
  water_quality: 25,
  other: 15,
};

// Individual credited transactions ledger — starts empty
export const MOCK_EARNINGS_LEDGER = [];

// Aggregate earnings summary derived from ledger — starts at 0
export const MOCK_EARNINGS_SUMMARY = {
  totalCredited: 0,
  totalCreditedDisplay: '₹0',
  transactionCount: 0,
  thisMonthAmount: 0,
  thisMonthDisplay: '₹0',
  pendingAmount: 0,
  pendingDisplay: '₹0',
  byType: [],
};
