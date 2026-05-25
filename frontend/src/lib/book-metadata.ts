import { Book } from '@/lib/api'

export interface BookMetadata {
  coverUrl?: string
  description?: string
  contentSummary?: string
  fullTextUrl?: string
  fullTextLabel?: string
}

export async function fetchBookMetadata(book: Book): Promise<BookMetadata> {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    genre: book.genre,
  })

  const response = await fetch(`/metadata/book?${params.toString()}`)
  if (!response.ok) {
    return {}
  }

  return response.json()
}
