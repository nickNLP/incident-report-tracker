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
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 text-sm">✦</span>
        <div>
          <h2 className="text-base font-semibold text-gray-900">AI Assistant</h2>
          <p className="text-xs text-gray-400">Ask about incident history or what to prioritize — analyzes all logs.</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-96 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Try a question:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="text-left text-sm border border-gray-200 hover:border-brand-600 hover:bg-brand-50 text-gray-700 rounded-lg px-3 py-2 transition-colors"
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
                    ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 text-white px-4 py-2.5 text-sm whitespace-pre-wrap'
                    : 'max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-100 text-gray-900 px-4 py-2.5 text-sm whitespace-pre-wrap'
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
        className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the incident history…"
          disabled={busy}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy ? '…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
