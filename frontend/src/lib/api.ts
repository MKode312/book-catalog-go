export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  message?: string
  token?: string
  is_admin?: boolean
  isAdmin?: boolean
}

export interface Book {
  id: string
  title: string
  author: string
  genre: string
  description?: string
  isbn?: string
  created_at?: string
  updated_at?: string
}

export interface User {
  id: string
  email: string
  is_admin: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
}

export interface BookPayload {
  title: string
  author: string
  genre: string
  description?: string
  isbn?: string
}

const API_BASE_URL = '/api'

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text()
  let data: any = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(response.ok ? fallbackMessage : `${fallbackMessage}: сервер вернул не JSON`)
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage)
  }

  return data as T
}

export const api = {
  async login(payload: LoginPayload): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse<ApiResponse<User>>(response, 'Ошибка при входе')
  },

  async register(payload: RegisterPayload & { is_admin?: boolean; admin_secret?: string }): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse<ApiResponse<User>>(response, 'Ошибка при регистрации')
  },

  async registerAsAdmin(payload: RegisterPayload & { admin_secret: string }): Promise<ApiResponse<User>> {
    const response = await fetch(`${API_BASE_URL}/register/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return parseResponse<ApiResponse<User>>(response, 'Ошибка при регистрации администратора')
  },

  async getBooks(token?: string): Promise<{ books: Book[] }> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/books/all`, { headers })
    return parseResponse<{ books: Book[] }>(response, 'Ошибка при загрузке книг')
  },

  async getBookById(id: string, token?: string): Promise<{ book: Book }> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/bookById/${id}`, { headers })
    return parseResponse<{ book: Book }>(response, 'Ошибка при загрузке книги')
  },

  async getBooksByAuthor(author: string, token?: string): Promise<{ books: Book[] }> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/books/author?author=${encodeURIComponent(author)}`, { headers })
    return parseResponse<{ books: Book[] }>(response, 'Ошибка при загрузке книг автора')
  },

  async getBooksByGenre(genre: string, token?: string): Promise<{ books: Book[] }> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/books/genre?genre=${encodeURIComponent(genre)}`, { headers })
    return parseResponse<{ books: Book[] }>(response, 'Ошибка при загрузке книг жанра')
  },

  async getBooksByTitle(title: string, token?: string): Promise<{ books: Book[] }> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE_URL}/book?title=${encodeURIComponent(title)}`, { headers })
    const data = await parseResponse<{ book?: Book }>(response, 'Ошибка при загрузке книг')
    return { books: data.book ? [data.book] : [] }
  },

  async saveBook(payload: BookPayload, token: string): Promise<{ id: string }> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const response = await fetch(`${API_BASE_URL}/book/save`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const data = await parseResponse<{ id?: string; ID?: string }>(response, 'Ошибка при сохранении книги')
    return { id: data.id || data.ID || '' }
  },

  async deleteBook(id: string, token: string): Promise<void> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const response = await fetch(`${API_BASE_URL}/book/${id}`, {
      method: 'DELETE',
      headers,
    })
    await parseResponse(response, 'Ошибка при удалении книги')
  },
}
