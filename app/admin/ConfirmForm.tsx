'use client'

export function ConfirmForm({
  action,
  message,
  buttonLabel,
  buttonClass,
}: {
  action: (formData: FormData) => Promise<void>
  message: string
  buttonLabel: string
  buttonClass: string
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault()
      }}
    >
      <button type="submit" className={buttonClass}>
        {buttonLabel}
      </button>
    </form>
  )
}
