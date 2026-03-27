// Detect nation from UK postcode prefix
export function detectNation(postcode) {
  if (!postcode) return 'England'
  const clean = postcode.trim().toUpperCase()
  const prefix = clean.replace(/[^A-Z]/g, '').slice(0, 4)

  const scottishPrefixes = ['AB','DD','DG','EH','FK','G','HS','IV','KA','KW','KY','ML','PA','PH','TD','ZE','KT'] 
  const welshPrefixes = ['CF','CH4','CH5','CH6','CH7','CH8','LD','LL','NP','SA','SY','HR']

  // Check Welsh first (some CH postcodes are Welsh)
  for (const w of welshPrefixes) {
    if (clean.startsWith(w)) return 'Wales'
  }
  for (const s of scottishPrefixes) {
    if (prefix.startsWith(s) || clean.startsWith(s)) return 'Scotland'
  }
  return 'England'
}

export const NATION_LABELS = {
  England: { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#003090', bg: '#e8edf8' },
  Scotland: { flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#005EB8', bg: '#e0ecf8' },
  Wales:    { flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', color: '#C8102E', bg: '#fce8ec' },
}

// First-time landlord checklist - nation aware
export function getChecklist(nation) {
  const items = {
    before_let: {
      title: 'Before you let',
      icon: '🏠',
      items: [
        { id: 'gas_cert',      label: 'Get a Gas Safety Certificate from a Gas Safe registered engineer', required: true },
        { id: 'eicr',          label: 'Get an Electrical Installation Condition Report (EICR)', required: true },
        { id: 'epc',           label: 'Get an Energy Performance Certificate (EPC) - minimum rating E (C from 2028)', required: true },
        { id: 'smoke_alarms',  label: 'Fit working smoke alarms on every floor', required: true },
        { id: 'co_alarm',      label: 'Fit a CO alarm in every room with a combustion appliance', required: true },
        { id: 'consent_let',   label: 'Get consent to let from your mortgage lender (if mortgaged)', required: false },
        ...(nation === 'Scotland' ? [
          { id: 'landlord_reg', label: 'Register as a landlord with your local council (mandatory in Scotland)', required: true },
        ] : []),
        ...(nation === 'Wales' ? [
          { id: 'rent_smart',   label: 'Register and licence with Rent Smart Wales', required: true },
        ] : []),
      ]
    },
    financial: {
      title: 'Financial and legal setup',
      icon: '💰',
      items: [
        { id: 'landlord_ins',  label: 'Take out landlord insurance (not home insurance - different product)', required: true },
        { id: 'self_assess',   label: 'Register for Self Assessment with HMRC to declare rental income', required: true },
        { id: 's24_aware',     label: 'Understand Section 24 - mortgage interest tax relief has changed for personal ownership', required: false },
        { id: 'records',       label: 'Set up a system to keep income and expense records (required for tax)', required: true },
        ...(nation === 'England' ? [
          { id: 'prs_db',      label: 'Register on the PRS Database when it launches (required before serving any notice from 2026)', required: true },
        ] : []),
      ]
    },
    tenancy_setup: {
      title: 'When tenant moves in',
      icon: '🔑',
      items: [
        { id: 'right_to_rent', label: nation === 'Scotland' ? 'Verify tenant identity (Right to Rent checks apply in England only - but good practice)' : 'Carry out Right to Rent checks on all adult occupants (legal requirement in England)', required: nation === 'England' },
        { id: 'tenancy_agmt',  label: nation === 'Wales' ? 'Use a Written Statement / Occupation Contract (required under Renting Homes Wales Act)' : nation === 'Scotland' ? 'Provide written Private Residential Tenancy agreement and Tenancy Information Pack' : 'Provide a written tenancy agreement and the How to Rent guide', required: true },
        { id: 'deposit_prot',  label: 'Protect the deposit in a government-approved scheme within 30 days', required: true },
        { id: 'prescribed',    label: 'Serve Prescribed Information about the deposit scheme on the tenant within 30 days', required: true },
        { id: 'give_gas',      label: 'Give tenant a copy of the Gas Safety Certificate', required: true },
        { id: 'give_epc',      label: 'Give tenant a copy of the EPC', required: true },
        { id: 'give_eicr',     label: 'Give tenant a copy of the EICR', required: true },
        ...(nation === 'England' ? [
          { id: 'how_to_rent', label: 'Give tenant the current How to Rent guide (check gov.uk for latest version)', required: true },
        ] : []),
        ...(nation === 'Wales' ? [
          { id: 'wales_guide', label: 'Give tenant "A Home in the Private Rented Sector - A Guide for Tenants in Wales"', required: true },
        ] : []),
      ]
    },
    ongoing: {
      title: 'Ongoing obligations',
      icon: '🔄',
      items: [
        { id: 'annual_gas',    label: 'Renew Gas Safety Certificate every year (book 4-6 weeks before expiry)', required: true },
        { id: 'eicr_5yr',      label: 'Renew EICR every 5 years (book 3 months before anniversary)', required: true },
        { id: 'ins_renewal',   label: 'Renew landlord insurance annually and check cover is adequate', required: true },
        { id: 'legionella',    label: 'Carry out a Legionella risk assessment (not annual test - documented risk assessment)', required: true },
        ...(nation === 'Scotland' ? [
          { id: 'repairing',   label: 'Maintain the Repairing Standard throughout the tenancy', required: true },
        ] : []),
        ...(nation === 'Wales' ? [
          { id: 'fitness_29',  label: 'Maintain all 29 fitness standards under the Renting Homes (Wales) Act throughout tenancy', required: true },
        ] : []),
        ...(nation === 'England' ? [
          { id: 'awaab',       label: "Respond to damp and mould reports within 14 days (Awaab's Law from 2026)", required: true },
        ] : []),
      ]
    }
  }
  return items
}
