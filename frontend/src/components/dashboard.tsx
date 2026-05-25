'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, Book } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { BookCard } from './book-card'
import { AddBookDialog } from './add-book-dialog'
import { LogOut, Search, Plus } from 'lucide-react'

export function Dashboard() {
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [filterType, setFilterType] = useState<'title' | 'author' | 'genre'>('title')

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const email = localStorage.getItem('userEmail')
    const admin = localStorage.getItem('isAdmin') === 'true'

    if (!token) {
      router.push('/')
      return
    }

    setIsAdmin(admin)
    setUserEmail(email || '')
    loadBooks(token)
  }, [router])

  async function loadBooks(token: string) {
    setLoading(true)
    setError('')

    try {
      const response = await api.getBooks(token)
      setBooks(response.books || [])
      setFilteredBooks(response.books || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке книг')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      setFilteredBooks(books)
      return
    }

    setError('')
    setFilteredBooks(
      books.filter(book => {
        const value = book[filterType] || ''
        return value.toLowerCase().includes(query)
      }),
    )
  }

  function handleLogout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isAdmin')
    router.push('/')
  }

  async function handleBookAdded() {
    const token = localStorage.getItem('authToken')
    if (token) {
      await loadBooks(token)
    }
  }

  async function handleDeleteBook(id: string) {
    const token = localStorage.getItem('authToken')
    if (!token) return

    try {
      await api.deleteBook(id, token)
      setBooks(books.filter(b => b.id !== id))
      setFilteredBooks(filteredBooks.filter(b => b.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении книги')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-amber-700 to-orange-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">📚 Каталог книг</h1>
            <p className="text-amber-100 mt-1 font-medium">Всего в каталоге: {books.length} книг</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{userEmail}</p>
              {isAdmin && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                  <p className="text-xs text-yellow-200 font-bold">Администратор</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              title="Выход"
              className="text-white hover:bg-orange-600">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="bg-white/80 backdrop-blur-sm border-2 border-amber-200 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-amber-950 mb-4">🔍 Найдите свою книгу</h2>

          <div className="space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'title' ? 'default' : 'outline'}
                size="sm"
                className={
                  filterType === 'title'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-semibold'
                    : 'border-amber-200 text-amber-800 hover:bg-amber-50'
                }
                onClick={() => setFilterType('title')}>
                По названию
              </Button>
              <Button
                variant={filterType === 'author' ? 'default' : 'outline'}
                size="sm"
                className={
                  filterType === 'author'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-semibold'
                    : 'border-amber-200 text-amber-800 hover:bg-amber-50'
                }
                onClick={() => setFilterType('author')}>
                По автору
              </Button>
              <Button
                variant={filterType === 'genre' ? 'default' : 'outline'}
                size="sm"
                className={
                  filterType === 'genre'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-semibold'
                    : 'border-amber-200 text-amber-800 hover:bg-amber-50'
                }
                onClick={() => setFilterType('genre')}>
                По жанру
              </Button>
              {isAdmin && (
                <div className="ml-auto">
                  <AddBookDialog onBookAdded={handleBookAdded} />
                </div>
              )}
            </div>

            {/* Search input */}
            <div className="flex gap-2">
              <Input
                placeholder={
                  filterType === 'author'
                    ? 'Введите автора...'
                    : filterType === 'genre'
                      ? 'Введите жанр...'
                      : 'Введите название...'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSearch()}
                className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              />
              <Button
                onClick={handleSearch}
                className="bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-semibold hover:from-amber-500 hover:to-orange-500 gap-2">
                <Search className="w-4 h-4" />
                Поиск
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setFilteredBooks(books)
                }}
                className="border-amber-200 text-amber-800 hover:bg-amber-50">
                Очистить
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-300">
            <AlertTitle className="text-red-900">Ошибка</AlertTitle>
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Books Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/80 rounded-xl p-6 animate-pulse border border-amber-200">
                <div className="h-8 bg-amber-200 rounded mb-4"></div>
                <div className="h-4 bg-amber-100 rounded mb-2"></div>
                <div className="h-4 bg-amber-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm border-2 border-amber-200 rounded-xl shadow-lg p-12 text-center">
            <p className="text-amber-900 text-lg mb-4 font-medium">📖 Книги не найдены</p>
            {isAdmin && <AddBookDialog onBookAdded={handleBookAdded} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <BookCard key={book.id} book={book} isAdmin={isAdmin} onDelete={() => handleDeleteBook(book.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
