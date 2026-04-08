import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateServerClient = vi.fn().mockReturnValue({ auth: {} })

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([{ name: 'sb-token', value: 'abc' }]),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

describe('server supabase client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54421')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'test-anon-key')
    mockCreateServerClient.mockClear()
    mockCookieStore.getAll.mockClear()
    mockCookieStore.set.mockClear()
  })

  it('calls createServerClient with env vars and cookie handlers', async () => {
    const { createClient } = await import('./server')
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'http://localhost:54421',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('getAll reads from the cookie store', async () => {
    const { createClient } = await import('./server')
    await createClient()

    const cookieConfig = mockCreateServerClient.mock.calls[0][2]
    const result = cookieConfig.cookies.getAll()

    expect(mockCookieStore.getAll).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('setAll writes cookies to the cookie store', async () => {
    const { createClient } = await import('./server')
    await createClient()

    const cookieConfig = mockCreateServerClient.mock.calls[0][2]
    cookieConfig.cookies.setAll([
      { name: 'sb-token', value: 'xyz', options: { path: '/' } },
    ])

    expect(mockCookieStore.set).toHaveBeenCalledWith('sb-token', 'xyz', { path: '/' })
  })

  it('setAll swallows errors from read-only Server Component context', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cookies are read-only')
    })

    const { createClient } = await import('./server')
    await createClient()

    const cookieConfig = mockCreateServerClient.mock.calls[0][2]

    expect(() =>
      cookieConfig.cookies.setAll([{ name: 'sb-token', value: 'xyz', options: {} }])
    ).not.toThrow()
  })
})
