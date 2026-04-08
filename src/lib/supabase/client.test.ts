import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateBrowserClient = vi.fn().mockReturnValue({ auth: {} })

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

describe('browser supabase client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54421')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'test-anon-key')
    mockCreateBrowserClient.mockClear()
  })

  it('calls createBrowserClient with env vars', async () => {
    const { createClient } = await import('./client')
    const client = createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'http://localhost:54421',
      'test-anon-key'
    )
    expect(client).toBeDefined()
  })

  it('returns a supabase client instance', async () => {
    const { createClient } = await import('./client')
    const client = createClient()

    expect(client).toHaveProperty('auth')
  })
})
