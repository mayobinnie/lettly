import { useState } from 'react'

const POUND = String.fromCharCode(163)

const ROSE = '#e07b7b'
const CHARCOAL = '#0d0a0a'
const AMBER = '#f59e0b'
const AMBER_DARK = '#b45309'
const AMBER_BG = '#fef3c7'
const ORANGE = '#ea580c'
const ORANGE_BG = '#ffedd5'
const BORDER = '#2a2424'
const TEXT_DIM = '#9ca3af'
const CARD_BG = '#161313'

const CHECKLIST_ITEMS = [
  { id: 'keys', label: 'Keys returned (all sets)' },
  { id: 'final_inspection', label: 'Final inspection completed' },
  { id: 'inventory_check', label: 'Check-out inventory signed' },
  { id: 'meter_readings', label: 'Meter readings taken (gas, electric, water)' },
  { id: 'council_tax', label: 'Council tax notified of move-out' },
  { id: 'utilities', label: 'Utility providers notified' },
  { id: 'forwarding_address', label: 'Forwarding address obtained' },
  { id: 'deposit_return', label: 'Deposit return initiated with scheme' },
  { id: 'deductions_agreed', label: 'Any deductions agreed in writing' },
  { id: 'cleaning_done', label: 'Property cleaned to standard' },
  { id: 'damage_documented', label: 'Damage (if any) photographed and logged' },
  { id: 'mail_redirect', label: 'Mail redirection arranged by tenant' },
  { id: 'standing_order', label: 'Standing order cancelled' },
  { id: 'final_statement', label: 'Final rent statement sent' }
]

function formatDate(d) {
  if (!d) return ''
  const dt = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dt.getTime())) return ''
  const dd = String(dt.getDate()).padStart(2, '0')
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const yyyy = dt.getFullYear()
  return dd + '/' + mm + '/' + yyyy
}

function todayDDMMYYYY() {
  return formatDate(new Date())
}

function todayInputValue() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return yyyy + '-' + mm + '-' + dd
}

function inputToDDMMYYYY(v) {
  if (!v) return ''
  const parts = v.split('-')
  if (parts.length !== 3) return ''
  return parts[2] + '/' + parts[1] + '/' + parts[0]
}

export function MoveOutButton({ property, onComplete }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [checks, setChecks] = useState({})
  const [notes, setNotes] = useState({})
  const [moveOutDateInput, setMoveOutDateInput] = useState(todayInputValue())

  const hasTenant = property && (property.tenantName || property.tenant_name)
  if (!hasTenant) return null

  const ticked = Object.values(checks).filter(Boolean).length
  const total = CHECKLIST_ITEMS.length
  const pct = Math.round((ticked / total) * 100)

  function toggleCheck(id) {
    setChecks(c => ({ ...c, [id]: !c[id] }))
  }

  function updateNote(id, val) {
    setNotes(n => ({ ...n, [id]: val }))
  }

  function reset() {
    setOpen(false)
    setStep(1)
    setChecks({})
    setNotes({})
    setMoveOutDateInput(todayInputValue())
  }

  function handleConfirm() {
    const moveOutDate = inputToDDMMYYYY(moveOutDateInput) || todayDDMMYYYY()

    const snapshot = {
      id: 'tenancy_' + Date.now(),
      tenantName: property.tenantName || '',
      tenantPhone: property.tenantPhone || '',
      tenantEmail: property.tenantEmail || '',
      rent: property.rent || '',
      tenancyStart: property.tenancyStart || '',
      tenancyEnd: property.tenancyEnd || '',
      depositAmount: property.depositAmount || '',
      depositScheme: property.depositScheme || '',
      moveOutDate: moveOutDate,
      notes: notes,
      checklist: checks,
      checklistNotes: notes,
      archivedAt: new Date().toISOString()
    }

    const existingHistory = Array.isArray(property.tenancyHistory) ? property.tenancyHistory : []

    const updated = {
      ...property,
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      tenancyStart: '',
      tenancyEnd: '',
      depositAmount: '',
      depositScheme: '',
      status: 'vacant',
      vacantSince: moveOutDate,
      tenancyHistory: [snapshot, ...existingHistory]
    }

    onComplete && onComplete(updated)
    reset()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'transparent',
          color: AMBER,
          border: '1px solid ' + AMBER,
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          marginLeft: 8
        }}
      >
        Move out
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
          onClick={reset}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CHARCOAL,
              border: '1px solid ' + BORDER,
              borderRadius: 12,
              maxWidth: 640,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              color: '#fff'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid ' + BORDER,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  {step === 1 ? 'Move-out checklist' : 'Confirm move-out'}
                </div>
                <div style={{ fontSize: 13, color: TEXT_DIM, marginTop: 2 }}>
                  {property.address || property.line1 || 'Property'}
                </div>
              </div>
              <button
                onClick={reset}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: TEXT_DIM,
                  fontSize: 22,
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                {'\u00D7'}
              </button>
            </div>

            {step === 1 && (
              <div style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      marginBottom: 6
                    }}
                  >
                    <span style={{ color: TEXT_DIM }}>Progress</span>
                    <span style={{ color: '#fff' }}>
                      {ticked} of {total} ({pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: BORDER,
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: pct + '%',
                        background: AMBER,
                        transition: 'width 0.2s'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {CHECKLIST_ITEMS.map(item => (
                    <div
                      key={item.id}
                      style={{
                        background: CARD_BG,
                        border: '1px solid ' + BORDER,
                        borderRadius: 8,
                        padding: 12
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!checks[item.id]}
                          onChange={() => toggleCheck(item.id)}
                          style={{
                            marginTop: 2,
                            accentColor: AMBER,
                            width: 16,
                            height: 16,
                            cursor: 'pointer'
                          }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            color: checks[item.id] ? TEXT_DIM : '#fff',
                            textDecoration: checks[item.id] ? 'line-through' : 'none'
                          }}
                        >
                          {item.label}
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="Note (optional)"
                        value={notes[item.id] || ''}
                        onChange={e => updateNote(item.id, e.target.value)}
                        style={{
                          marginTop: 8,
                          width: '100%',
                          background: CHARCOAL,
                          border: '1px solid ' + BORDER,
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#fff',
                          fontSize: 13,
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 20,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <button
                    onClick={reset}
                    style={{
                      background: 'transparent',
                      color: TEXT_DIM,
                      border: '1px solid ' + BORDER,
                      padding: '10px 18px',
                      borderRadius: 6,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      background: AMBER,
                      color: CHARCOAL,
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={{ padding: '20px 24px' }}>
                <div
                  style={{
                    background: AMBER_BG,
                    color: AMBER_DARK,
                    border: '1px solid ' + AMBER,
                    borderRadius: 8,
                    padding: 14,
                    fontSize: 13,
                    marginBottom: 18
                  }}
                >
                  This will archive the current tenancy and mark the property as Vacant.
                  The tenancy record stays in your history and is never deleted.
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 6 }}>
                    Move-out date
                  </div>
                  <input
                    type="date"
                    value={moveOutDateInput}
                    onChange={e => setMoveOutDateInput(e.target.value)}
                    style={{
                      background: CARD_BG,
                      border: '1px solid ' + BORDER,
                      borderRadius: 6,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 14,
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 13, color: TEXT_DIM, marginBottom: 8 }}>
                    Will be archived
                  </div>
                  <div
                    style={{
                      background: CARD_BG,
                      border: '1px solid ' + BORDER,
                      borderRadius: 8,
                      padding: 14,
                      fontSize: 13,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    {property.tenantName && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Tenant: </span>
                        {property.tenantName}
                      </div>
                    )}
                    {property.tenancyStart && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Tenancy: </span>
                        {property.tenancyStart}
                        {property.tenancyEnd ? ' to ' + property.tenancyEnd : ''}
                      </div>
                    )}
                    {property.rent && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Rent: </span>
                        {POUND}
                        {property.rent}
                      </div>
                    )}
                    {property.depositAmount && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Deposit: </span>
                        {POUND}
                        {property.depositAmount}
                        {property.depositScheme ? ' (' + property.depositScheme + ')' : ''}
                      </div>
                    )}
                    <div>
                      <span style={{ color: TEXT_DIM }}>Checklist: </span>
                      {ticked} of {total} items completed
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      background: 'transparent',
                      color: TEXT_DIM,
                      border: '1px solid ' + BORDER,
                      padding: '10px 18px',
                      borderRadius: 6,
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      background: AMBER,
                      color: CHARCOAL,
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: 6,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Confirm move-out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export function VacantBadge({ since }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: ORANGE_BG,
        color: ORANGE,
        border: '1px solid ' + ORANGE,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        marginRight: 6
      }}
    >
      {since ? 'Vacant since ' + since : 'Vacant'}
    </span>
  )
}

export function TenancyHistory({ property }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState({})

  const history = Array.isArray(property && property.tenancyHistory) ? property.tenancyHistory : []
  if (history.length === 0) return null

  function toggle(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  return (
    <div
      style={{
        marginTop: 12,
        borderTop: '1px solid ' + BORDER,
        paddingTop: 12
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent',
          border: 'none',
          color: TEXT_DIM,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 0
        }}
      >
        <span>{open ? '\u25BE' : '\u25B8'}</span>
        <span>
          Tenancy history ({history.length})
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map(h => {
            const isOpen = !!expanded[h.id]
            const checkedCount = h.checklist
              ? Object.values(h.checklist).filter(Boolean).length
              : 0
            return (
              <div
                key={h.id}
                style={{
                  background: CARD_BG,
                  border: '1px solid ' + BORDER,
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => toggle(h.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    padding: 12,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>
                      {h.tenantName || 'Tenant'}
                    </div>
                    <div style={{ color: TEXT_DIM, fontSize: 12, marginTop: 2 }}>
                      {h.tenancyStart || ''}
                      {h.tenancyEnd ? ' to ' + h.tenancyEnd : ''}
                      {h.moveOutDate ? ' \u00B7 moved out ' + h.moveOutDate : ''}
                    </div>
                  </div>
                  <span style={{ color: TEXT_DIM, fontSize: 12 }}>
                    {isOpen ? '\u25BE' : '\u25B8'}
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: 12,
                      borderTop: '1px solid ' + BORDER,
                      fontSize: 13,
                      color: '#e5e5e5',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    {h.tenantPhone && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Phone: </span>
                        {h.tenantPhone}
                      </div>
                    )}
                    {h.tenantEmail && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Email: </span>
                        {h.tenantEmail}
                      </div>
                    )}
                    {h.rent && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Rent: </span>
                        {POUND}
                        {h.rent}
                      </div>
                    )}
                    {h.depositAmount && (
                      <div>
                        <span style={{ color: TEXT_DIM }}>Deposit: </span>
                        {POUND}
                        {h.depositAmount}
                        {h.depositScheme ? ' (' + h.depositScheme + ')' : ''}
                      </div>
                    )}

                    {h.checklist && Object.keys(h.checklist).length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ color: TEXT_DIM, marginBottom: 4 }}>
                          Move-out checklist ({checkedCount} of {CHECKLIST_ITEMS.length})
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3
                          }}
                        >
                          {CHECKLIST_ITEMS.map(item => {
                            const done = !!h.checklist[item.id]
                            const note = h.checklistNotes && h.checklistNotes[item.id]
                            return (
                              <li
                                key={item.id}
                                style={{
                                  color: done ? '#e5e5e5' : TEXT_DIM,
                                  fontSize: 12
                                }}
                              >
                                <span style={{ marginRight: 6 }}>
                                  {done ? '\u2713' : '\u00B7'}
                                </span>
                                {item.label}
                                {note ? ': ' + note : ''}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}