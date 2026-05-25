'use client'

import { useEffect, useState } from 'react'
import { Book } from '@/lib/api'
import { BookMetadata, fetchBookMetadata } from '@/lib/book-metadata'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExternalLink, Loader2, Trash2, BookOpen } from 'lucide-react'

interface BookCardProps {
  book: Book
  isAdmin: boolean
  onDelete: () => void
}

export function BookCard({ book, isAdmin, onDelete }: BookCardProps) {
  const [open, setOpen] = useState(false)
  const [metadata, setMetadata] = useState<BookMetadata>({})
  const [loadingMetadata, setLoadingMetadata] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadCover() {
      const data = await fetchBookMetadata(book)
      if (!ignore) {
        setMetadata(data)
      }
    }

    loadCover().catch(() => undefined)

    return () => {
      ignore = true
    }
  }, [book])

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen || metadata.description || loadingMetadata) {
      return
    }

    setLoadingMetadata(true)
    try {
      setMetadata(await fetchBookMetadata(book))
    } catch {
      setMetadata({})
    } finally {
      setLoadingMetadata(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className="book-card-3d group h-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleOpenChange(true)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleOpenChange(true)
            }
          }}
          className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-100 via-orange-100 to-red-100 shadow-lg transition-all duration-300 hover:border-amber-400 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber-500">
          <div className="absolute left-0 top-0 bottom-0 w-1 book-spine" />

          <div className="relative ml-1 aspect-[4/3] overflow-hidden bg-amber-200">
            {metadata.coverUrl ? (
              <img
                src={metadata.coverUrl}
                alt={`Обложка книги ${book.title}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-amber-300 to-orange-300 px-5 text-center">
                <BookOpen className="mb-3 h-12 w-12 text-amber-950/50" />
                <span className="line-clamp-3 text-lg font-bold leading-tight text-amber-950">{book.title}</span>
                <span className="mt-2 line-clamp-1 text-xs font-semibold text-amber-900">{book.author}</span>
              </div>
            )}
          </div>

          <div className="flex h-full flex-col p-6">
            <h3 className="mb-2 line-clamp-2 text-xl font-bold text-amber-950 transition-colors group-hover:text-orange-900">
              {book.title}
            </h3>

            <p className="mb-3 line-clamp-1 text-sm font-semibold text-amber-800">{book.author}</p>

            <div className="mb-4">
              <Badge className="border-0 bg-gradient-to-r from-amber-400 to-orange-400 font-medium text-amber-950 hover:from-amber-500 hover:to-orange-500">
                {book.genre}
              </Badge>
            </div>

            <p className="mb-4 line-clamp-3 flex-grow text-xs leading-relaxed text-amber-900">
              {metadata.description || book.description || 'Нажмите, чтобы открыть описание и ссылку на книгу.'}
            </p>

            {book.isbn && (
              <div className="mb-3 border-t border-amber-200 pb-3">
                <p className="text-xs font-medium text-amber-700">
                  <span className="text-amber-950">ISBN:</span> {book.isbn}
                </p>
              </div>
            )}

            {book.created_at && (
              <p className="mb-4 text-xs text-amber-600">
                {new Date(book.created_at).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}

            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                className="mt-auto w-full gap-2 bg-red-500 font-medium text-white transition-all hover:bg-red-600"
                onClick={event => {
                  event.stopPropagation()
                  onDelete()
                }}>
                <Trash2 className="h-4 w-4" />
                Удалить
              </Button>
            )}
          </div>

          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-10" />
        </div>
      </div>

      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <DialogHeader>
          <DialogTitle className="pr-8 text-3xl text-amber-950">{book.title}</DialogTitle>
          <DialogDescription className="text-amber-800">{book.author}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="overflow-hidden rounded-lg border border-amber-200 bg-amber-100 shadow-md">
            {metadata.coverUrl ? (
              <img src={metadata.coverUrl} alt={`Обложка книги ${book.title}`} className="aspect-[2/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[2/3] flex-col items-center justify-center bg-gradient-to-br from-amber-300 to-orange-300 px-5 text-center">
                <BookOpen className="mb-4 h-14 w-14 text-amber-950/50" />
                <span className="text-xl font-bold leading-tight text-amber-950">{book.title}</span>
                <span className="mt-3 text-sm font-semibold text-amber-900">{book.author}</span>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <Badge className="w-fit border-0 bg-gradient-to-r from-amber-400 to-orange-400 font-medium text-amber-950">
              {book.genre}
            </Badge>

            {loadingMetadata ? (
              <div className="flex items-center gap-2 text-sm text-amber-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаю описание...
              </div>
            ) : (
              <>
                <section>
                  <h4 className="mb-2 text-base font-bold text-amber-950">Краткое описание</h4>
                  <p className="text-sm leading-6 text-amber-900">
                    {metadata.description || book.description || 'Описание для этой книги пока не найдено.'}
                  </p>
                </section>

                <section>
                  <h4 className="mb-2 text-base font-bold text-amber-950">Содержание</h4>
                  <p className="text-sm leading-6 text-amber-900">
                    {metadata.contentSummary || 'Краткое содержание для этой книги пока не найдено.'}
                  </p>
                </section>
              </>
            )}

            {metadata.fullTextUrl ? (
              <Button asChild className="gap-2 bg-gradient-to-r from-amber-400 to-orange-400 font-bold text-amber-950 hover:from-amber-500 hover:to-orange-500">
                <a href={metadata.fullTextUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {metadata.fullTextLabel || 'Открыть полный текст'}
                </a>
              </Button>
            ) : (
              <p className="text-sm text-amber-800">Ссылка на полный текст пока не найдена.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
