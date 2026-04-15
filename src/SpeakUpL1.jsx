import { useState, useRef, useEffect } from 'react'

const SYSTEM_PROMPT = `You are Alex, a friendly and encouraging English conversation partner for university EFL students at A2-B1 level in Mexico. 

This is a speaking practice activity for English 4, Unit 2, Lesson 1: "Describing Places & Giving Directions."

Your role:
- Have a natural conversation about describing places and giving directions in a city or campus
- Ask the student questions about a place they know well (their campus, city, neighborhood)
- Help them practice vocabulary: landmarks, prepositions of place, direction phrases (turn left, go straight, next to, across from, etc.)
- Keep your messages SHORT (2-3 sentences max) to encourage the student to write more
- If the student makes a grammar error, gently correct it by using the correct form naturally in your response (don't just say "wrong")
- Be warm, patient, and encouraging
- After 6-8 exchanges, offer brief feedback on their language use

Start by greeting the student and asking them to describe a place they know well on their campus or in their city.`

const RUBRIC = [
  { id: 'vocabulary', label: 'Vocabulario', desc: 'Uso de palabras y frases de la lección', max: 25 },
  { id: 'grammar', label: 'Gramática', desc: 'Preposiciones, estructuras de dirección', max: 25 },
  { id: 'fluency', label: 'Fluidez', desc: 'Respuestas completas y coherentes', max: 25 },
  { id: 'interaction', label: 'Interacción', desc: 'Participación activa en la conversación', max: 25 },
]

const FEEDBACK_PROMPT = (transcript) => `Based on this conversation transcript, evaluate the student's English performance for an A2-B1 level EFL course. 

Transcript:
${transcript}

Respond ONLY with a JSON object (no markdown, no extra text) in this exact format:
{
  "scores": {
    "vocabulary": <number 0-25>,
    "grammar": <number 0-25>,
    "fluency": <number 0-25>,
    "interaction": <number 0-25>
  },
  "strengths": "<2-3 sentences in Spanish about what the student did well>",
  "improvements": "<2-3 sentences in Spanish with specific suggestions>",
  "encouragement": "<1 encouraging sentence in Spanish>"
}`

export default function SpeakUpL1() {
  const [screen, setScreen] = useState('welcome') // welcome | chat | feedback
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [error, setError] = useState('')
  const conversationRef = useRef([])
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startChat = async () => {
    setScreen('chat')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: 'Hello!' }],
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || 'Hi! Ready to practice?'
      const firstMsg = { role: 'assistant', content: text }
      setMessages([firstMsg])
      conversationRef.current = [{ role: 'user', content: 'Hello!' }, firstMsg]
    } catch {
      setError('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const newHistory = [...conversationRef.current, userMsg]
    conversationRef.current = newHistory
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newHistory,
        }),
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '...'
      const assistantMsg = { role: 'assistant', content: text }
      conversationRef.current = [...newHistory, assistantMsg]
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setError('Error al enviar. Intenta de nuevo.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const getFeedback = async () => {
    setFeedbackLoading(true)
    setScreen('feedback')
    const transcript = conversationRef.current
      .map(m => `${m.role === 'user' ? 'Student' : 'Alex'}: ${m.content}`)
      .join('\n')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: FEEDBACK_PROMPT(transcript) }],
        }),
      })
      const data = await res.json()
      const raw = data.content?.[0]?.text || '{}'
      const clean = raw.replace(/```json|```/g, '').trim()
      setFeedback(JSON.parse(clean))
    } catch {
      setFeedback(null)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const totalScore = feedback
    ? Object.values(feedback.scores).reduce((a, b) => a + b, 0)
    : 0

  const getGrade = (score) => {
    if (score >= 90) return { letter: 'A', color: '#22c55e' }
    if (score >= 80) return { letter: 'B', color: '#84cc16' }
    if (score >= 70) return { letter: 'C', color: '#eab308' }
    if (score >= 60) return { letter: 'D', color: '#f97316' }
    return { letter: 'F', color: '#ef4444' }
  }

  return (
    <div style={styles.root}>
      {/* WELCOME SCREEN */}
      {screen === 'welcome' && (
        <div style={styles.welcomeWrap}>
          <div style={styles.card}>
            <div style={styles.badge}>English 4 · Unit 2 · Lesson 1</div>
            <h1 style={styles.title}>SpeakUp</h1>
            <p style={styles.subtitle}>Describing Places &amp; Giving Directions</p>
            <div style={styles.divider} />
            <div style={styles.infoBox}>
              <p style={styles.infoTitle}>📋 Instrucciones</p>
              <ul style={styles.infoList}>
                <li>Conversa en inglés con <strong>Alex</strong>, tu compañero de práctica virtual.</li>
                <li>El tema es describir lugares y dar direcciones.</li>
                <li>Escribe al menos <strong>6 intercambios</strong> antes de pedir retroalimentación.</li>
                <li>Cuando termines, presiona <em>"Ver Retroalimentación"</em> para obtener tu puntuación.</li>
              </ul>
            </div>
            <div style={styles.rubricGrid}>
              {RUBRIC.map(r => (
                <div key={r.id} style={styles.rubricItem}>
                  <span style={styles.rubricLabel}>{r.label}</span>
                  <span style={styles.rubricPts}>{r.max} pts</span>
                </div>
              ))}
            </div>
            <button style={styles.btnPrimary} onClick={startChat}>
              Comenzar práctica →
            </button>
          </div>
        </div>
      )}

      {/* CHAT SCREEN */}
      {screen === 'chat' && (
        <div style={styles.chatWrap}>
          <div style={styles.chatHeader}>
            <div style={styles.alexAvatar}>A</div>
            <div>
              <div style={styles.alexName}>Alex</div>
              <div style={styles.alexRole}>AI Conversation Partner</div>
            </div>
            <div style={{ flex: 1 }} />
            <button style={styles.btnFeedback} onClick={getFeedback} disabled={messages.length < 4}>
              Ver Retroalimentación
            </button>
          </div>

          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? styles.msgUser : styles.msgAlex}>
                {m.role === 'assistant' && <div style={styles.msgAvatar}>A</div>}
                <div style={m.role === 'user' ? styles.bubbleUser : styles.bubbleAlex}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.msgAlex}>
                <div style={styles.msgAvatar}>A</div>
                <div style={styles.bubbleTyping}>
                  <span style={styles.dot1}>●</span>
                  <span style={styles.dot2}>●</span>
                  <span style={styles.dot3}>●</span>
                </div>
              </div>
            )}
            {error && <div style={styles.errorMsg}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div style={styles.inputRow}>
            <input
              ref={inputRef}
              style={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message in English..."
              disabled={loading}
            />
            <button style={styles.btnSend} onClick={sendMessage} disabled={loading || !input.trim()}>
              ↑
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK SCREEN */}
      {screen === 'feedback' && (
        <div style={styles.feedbackWrap}>
          <div style={styles.feedbackCard}>
            <div style={styles.badge}>Retroalimentación</div>
            <h2 style={styles.feedbackTitle}>Tu desempeño</h2>

            {feedbackLoading && (
              <div style={styles.loadingFeedback}>
                <div style={styles.spinner} />
                <p>Analizando tu conversación...</p>
              </div>
            )}

            {!feedbackLoading && feedback && (
              <>
                <div style={styles.scoreCircle}>
                  <span style={{ ...styles.scoreBig, color: getGrade(totalScore).color }}>
                    {totalScore}
                  </span>
                  <span style={styles.scoreMax}>/100</span>
                </div>

                <div style={styles.rubricResults}>
                  {RUBRIC.map(r => (
                    <div key={r.id} style={styles.rubricRow}>
                      <span style={styles.rubricRowLabel}>{r.label}</span>
                      <div style={styles.barTrack}>
                        <div style={{
                          ...styles.barFill,
                          width: `${(feedback.scores[r.id] / r.max) * 100}%`,
                          background: feedback.scores[r.id] >= 20 ? '#22c55e' : feedback.scores[r.id] >= 15 ? '#eab308' : '#ef4444'
                        }} />
                      </div>
                      <span style={styles.rubricRowScore}>{feedback.scores[r.id]}/{r.max}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.feedbackSection}>
                  <p style={styles.feedbackSectionTitle}>✅ Fortalezas</p>
                  <p style={styles.feedbackText}>{feedback.strengths}</p>
                </div>
                <div style={styles.feedbackSection}>
                  <p style={styles.feedbackSectionTitle}>📈 Áreas de mejora</p>
                  <p style={styles.feedbackText}>{feedback.improvements}</p>
                </div>
                <div style={{ ...styles.feedbackSection, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <p style={styles.feedbackText}>💬 {feedback.encouragement}</p>
                </div>

                <button style={styles.btnPrimary} onClick={() => {
                  setScreen('welcome')
                  setMessages([])
                  conversationRef.current = []
                  setFeedback(null)
                  setInput('')
                }}>
                  Intentar de nuevo
                </button>
              </>
            )}

            {!feedbackLoading && !feedback && (
              <div style={styles.errorMsg}>
                No se pudo generar la retroalimentación. 
                <button style={styles.btnLink} onClick={getFeedback}>Reintentar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  // WELCOME
  welcomeWrap: { width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center' },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: '2.5rem 2rem',
    width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(139,92,246,0.3)',
    border: '1px solid rgba(139,92,246,0.5)',
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: '1.25rem',
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '3rem',
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 0.25rem',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  subtitle: { color: '#94a3b8', fontSize: '1rem', margin: '0 0 1.5rem' },
  divider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '1.5rem 0' },
  infoBox: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '1rem 1.25rem',
    marginBottom: '1.25rem',
  },
  infoTitle: { color: '#e2e8f0', fontWeight: 600, margin: '0 0 0.5rem', fontSize: 14 },
  infoList: { color: '#94a3b8', fontSize: 13, margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8 },
  rubricGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: '1.5rem',
  },
  rubricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '6px 12px',
  },
  rubricLabel: { color: '#cbd5e1', fontSize: 12 },
  rubricPts: { color: '#7c3aed', fontSize: 12, fontWeight: 700 },
  btnPrimary: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
    transition: 'opacity 0.2s',
  },
  // CHAT
  chatWrap: {
    width: '100%',
    maxWidth: 600,
    height: '100vh',
    maxHeight: 700,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    overflow: 'hidden',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '1rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
  },
  alexAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 16,
    fontFamily: "'Syne', sans-serif",
    flexShrink: 0,
  },
  alexName: { color: '#f1f5f9', fontWeight: 600, fontSize: 14 },
  alexRole: { color: '#64748b', fontSize: 11 },
  btnFeedback: {
    padding: '8px 14px',
    background: 'rgba(139,92,246,0.2)',
    border: '1px solid rgba(139,92,246,0.4)',
    color: '#c4b5fd',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  msgAlex: { display: 'flex', gap: 8, alignItems: 'flex-end' },
  msgUser: { display: 'flex', justifyContent: 'flex-end' },
  msgAvatar: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
    fontFamily: "'Syne', sans-serif",
  },
  bubbleAlex: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    padding: '10px 14px',
    borderRadius: '4px 16px 16px 16px',
    maxWidth: '80%',
    fontSize: 14,
    lineHeight: 1.6,
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '16px 16px 4px 16px',
    maxWidth: '80%',
    fontSize: 14,
    lineHeight: 1.6,
  },
  bubbleTyping: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '12px 16px',
    borderRadius: '4px 16px 16px 16px',
    display: 'flex', gap: 4, alignItems: 'center',
  },
  dot1: { color: '#7c3aed', fontSize: 10, animation: 'pulse 1s infinite 0s' },
  dot2: { color: '#7c3aed', fontSize: 10, animation: 'pulse 1s infinite 0.2s' },
  dot3: { color: '#7c3aed', fontSize: 10, animation: 'pulse 1s infinite 0.4s' },
  errorMsg: { color: '#f87171', fontSize: 13, textAlign: 'center', padding: '0.5rem' },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
  },
  btnSend: {
    width: 42, height: 42,
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  // FEEDBACK
  feedbackWrap: { width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'center' },
  feedbackCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: '2.5rem 2rem',
    width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  feedbackTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: '2rem',
    fontWeight: 800,
    color: '#fff',
    margin: '0.5rem 0 1.5rem',
  },
  loadingFeedback: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    padding: '2rem', color: '#94a3b8', fontSize: 14,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid rgba(124,58,237,0.3)',
    borderTop: '3px solid #7c3aed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  scoreCircle: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'center',
    gap: 4, marginBottom: '1.5rem',
  },
  scoreBig: { fontSize: '4rem', fontWeight: 800, fontFamily: "'Syne', sans-serif", lineHeight: 1 },
  scoreMax: { color: '#64748b', fontSize: '1.25rem', fontWeight: 600 },
  rubricResults: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' },
  rubricRow: { display: 'flex', alignItems: 'center', gap: 8 },
  rubricRowLabel: { color: '#cbd5e1', fontSize: 12, width: 80, flexShrink: 0 },
  barTrack: {
    flex: 1, height: 6, background: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s ease' },
  rubricRowScore: { color: '#94a3b8', fontSize: 12, width: 36, textAlign: 'right', flexShrink: 0 },
  feedbackSection: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '1rem',
    marginBottom: '0.75rem',
  },
  feedbackSectionTitle: { color: '#e2e8f0', fontWeight: 600, fontSize: 13, margin: '0 0 0.4rem' },
  feedbackText: { color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: 0 },
  btnLink: {
    background: 'none', border: 'none', color: '#818cf8',
    cursor: 'pointer', fontSize: 13, marginLeft: 8, textDecoration: 'underline',
  },
}
