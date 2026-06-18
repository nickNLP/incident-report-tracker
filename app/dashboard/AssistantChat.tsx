'use client'

import { useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'What are the most common incident types, and what stands out?',
  'Which root cause drives the most preventable incidents?',
  'Based on the history, what should we prioritize fixing?',
  'Which driver or customer carries the most risk right now?',
]

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return

    const history: Message[] = [...messages, { role: 'user', content: question }]
    // Add the user turn plus an empty assistant turn we'll stream into.
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setBusy(true)
    scrollToBottom()

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok || !res.body) {
        const errText = (await res.text()) || 'Something went wrong.'
        setMessages([...history, { role: 'assistant', content: `⚠️ ${errText}` }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages([...history, { role: 'assistant', content: acc }])
        scrollToBottom()
      }
    } catch {
      setMessages([...history, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }])
    } finally {
      setBusy(false)
      scrollToBottom()
    }
  }

  const lastAssistantEmpty =
    busy && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && messages[messages.length - 1].content === ''

  return (
    <section
      className="rounded-xl overflow-hidden shadow-md text-white"
      style={{ background: 'linear-gradient(135deg, #2D6A4F, #1F4D39)' }}
    >
      <div className="px-5 py-4 border-b border-white/15 flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white text-sm">✦</span>
        <div>
          <h2 className="text-base font-semibold text-white">AI Assistant</h2>
          <p className="text-xs text-white/70">Ask about incident history or what to prioritize. Analyzes all logs.</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-white/80">Try a question:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-sm border border-white/30 hover:bg-white/10 text-white rounded-lg px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-white/15 border border-white/20 text-white px-4 py-2.5 text-sm whitespace-pre-wrap'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-white text-gray-900 shadow-sm px-4 py-2.5 text-sm whitespace-pre-wrap'
                }
              >
                {m.content || (lastAssistantEmpty && i === messages.length - 1 ? <span className="text-gray-400">Analyzing the logs…</span> : m.content)}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex gap-2 px-5 py-4 border-t border-white/15 bg-black/10"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the incident history…"
          disabled={busy}
          className="flex-1 border border-white/30 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-white text-brand-800 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
