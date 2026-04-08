import { type NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null })
const mockCreateServerClient = vi.fn().mockReturnValue({
  auth: { getUser: mockGetUser },
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

// Mock NextResponse
const mockResponseCookiesSet = vi.fn()
const mockNextResponse = {
  cookies: { set: mockResponseCookiesSet },
}

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn().mockReturnValue(mockNextResponse),
  },
}))

function createMockRequest(url: string) {
  const cookies: { name: string; value: string }[] = []
  return {
    url,
    cookies: {
      getAll: vi.fn().mockReturnValue(cookies),
      set: vi.fn(),
    },
  }
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54421')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'test-anon-key')
    mockCreateServerClient.mockClear()
    mockGetUser.mockClear()
    mockResponseCookiesSet.mockClear()
  })

  it('creates a supabase client with request cookie accessors', async () => {
    const { middleware } = await import('./middleware')
    const request = createMockRequest('http://localhost:3000/')

    await middleware(request as unknown as NextRequest)

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

  it('calls supabase.auth.getUser() to refresh the session', async () => {
    const { middleware } = await import('./middleware')
    const request = createMockRequest('http://localhost:3000/')

    await middleware(request as unknown as NextRequest)

    expect(mockGetUser).toHaveBeenCalled()
  })

  it('returns a NextResponse', async () => {
    const { middleware } = await import('./middleware')
    const request = createMockRequest('http://localhost:3000/')

    const response = await middleware(request as unknown as NextRequest)

    expect(response).toBeDefined()
  })

  it('exports a matcher config that excludes static assets', async () => {
    const { config } = await import('./middleware')

    expect(config.matcher).toBeDefined()
    expect(config.matcher.length).toBeGreaterThan(0)

    const pattern = config.matcher[0]

    // Matcher should use a negative lookahead to exclude these paths
    expect(pattern).toContain('_next/static')
    expect(pattern).toContain('_next/image')
    expect(pattern).toContain('favicon.ico')
    expect(pattern).toContain('svg')
    expect(pattern).toContain('png')
    expect(pattern).toContain('jpg')
    expect(pattern).toContain('jpeg')
    expect(pattern).toContain('gif')
    expect(pattern).toContain('webp')
  })

  it('getAll reads cookies from the request', async () => {
    const { middleware } = await import('./middleware')
    const request = createMockRequest('http://localhost:3000/')

    await middleware(request as unknown as NextRequest)

    const cookieConfig = mockCreateServerClient.mock.calls[0][2]
    cookieConfig.cookies.getAll()

    expect(request.cookies.getAll).toHaveBeenCalled()
  })

  it('setAll writes cookies to both request and response', async () => {
    const { NextResponse } = await import('next/server')
    const { middleware } = await import('./middleware')
    const request = createMockRequest('http://localhost:3000/')

    await middleware(request as unknown as NextRequest)

    const cookieConfig = mockCreateServerClient.mock.calls[0][2]
    cookieConfig.cookies.setAll([
      { name: 'sb-token', value: 'refreshed', options: { path: '/' } },
    ])

    expect(request.cookies.set).toHaveBeenCalledWith('sb-token', 'refreshed')
    expect(NextResponse.next).toHaveBeenCalled()
    expect(mockResponseCookiesSet).toHaveBeenCalledWith('sb-token', 'refreshed', { path: '/' })
  })
})
