'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

export default function TestInputsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="mx-auto max-w-2xl p-8 space-y-12">
      <h1 className="text-2xl font-bold">Input Component</h1>

      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">Floating-label input with the <code>label</code> prop</p>
        <div className="space-y-3">
          <Input id="email" type="email" label="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <Input id="password" type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <Input id="disabled" type="text" label="Disabled field" value="" onChange={() => {}} disabled />
        </div>
      </section>
    </div>
  )
}
