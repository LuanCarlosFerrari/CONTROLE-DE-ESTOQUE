import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock do módulo supabase ──────────────────────────────────────────────────
const mockInvoke = vi.fn()
const mockGetSession = vi.fn()

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    functions: { invoke: mockInvoke },
  },
}))

// Importa após o mock estar configurado
const { notifyTelegram } = await import('./notify')

// ── Helpers ──────────────────────────────────────────────────────────────────
const SESSION_OK = {
  data: {
    session: {
      access_token: 'token-abc123',
      user: { id: 'user-uuid-1234' },
    },
  },
}

const SESSION_NULL = { data: { session: null } }

// ── Testes ───────────────────────────────────────────────────────────────────

describe('notifyTelegram', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockResolvedValue({ error: null })
  })

  it('não chama invoke se não houver sessão', async () => {
    mockGetSession.mockResolvedValue(SESSION_NULL)
    await notifyTelegram('nova_venda', { total: 100 })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('não chama invoke se access_token estiver ausente', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid' } } },
    })
    await notifyTelegram('nova_venda', { total: 100 })
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('chama invoke com o tipo e payload corretos', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    await notifyTelegram('nova_venda', { total: 250, cliente_nome: 'Ana' })

    expect(mockInvoke).toHaveBeenCalledOnce()
    expect(mockInvoke).toHaveBeenCalledWith('telegram-notify', {
      body: {
        type: 'nova_venda',
        payload: { total: 250, cliente_nome: 'Ana' },
        user_id: 'user-uuid-1234',
      },
      headers: { Authorization: 'Bearer token-abc123' },
    })
  })

  it('usa payload vazio como default quando não passado', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    await notifyTelegram('caixa_aberto')

    expect(mockInvoke).toHaveBeenCalledWith('telegram-notify', {
      body: expect.objectContaining({ payload: {} }),
      headers: expect.any(Object),
    })
  })

  it('inclui o user_id da sessão no body', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    await notifyTelegram('caixa_fechado', {})

    const [, options] = mockInvoke.mock.calls[0]
    expect(options.body.user_id).toBe('user-uuid-1234')
  })

  it('envia o Bearer token correto no header', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    await notifyTelegram('novo_produto', {})

    const [, options] = mockInvoke.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer token-abc123')
  })

  it('não lança exceção quando invoke retorna erro', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    mockInvoke.mockResolvedValue({ error: new Error('500 Internal Server Error') })

    await expect(notifyTelegram('nova_os', {})).resolves.toBeUndefined()
  })

  it('não lança exceção quando getSession lança erro inesperado', async () => {
    mockGetSession.mockRejectedValue(new Error('network error'))
    await expect(notifyTelegram('nova_venda', {})).resolves.toBeUndefined()
  })

  it('aceita qualquer string como tipo de evento', async () => {
    mockGetSession.mockResolvedValue(SESSION_OK)
    await notifyTelegram('tipo_inexistente', { foo: 'bar' })

    expect(mockInvoke).toHaveBeenCalledWith('telegram-notify', expect.objectContaining({
      body: expect.objectContaining({ type: 'tipo_inexistente' }),
    }))
  })
})
