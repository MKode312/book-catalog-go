import { NextRequest, NextResponse } from 'next/server'

interface BookMetadata {
  coverUrl?: string
  description?: string
  contentSummary?: string
  fullTextUrl?: string
  fullTextLabel?: string
}

interface SearchDoc {
  key?: string
  title?: string
  author_name?: string[]
  cover_i?: number
  cover_edition_key?: string
  first_sentence?: string[]
  subject?: string[]
  ia?: string[]
  has_fulltext?: boolean
}

interface Work {
  description?: string | { value?: string }
  subjects?: string[]
  excerpts?: Array<{ excerpt?: string }>
}

interface Editions {
  entries?: Array<{
    covers?: number[]
    ia?: string[]
   ocaid?: string
  }>
}

const OPEN_LIBRARY_URL = 'https://openlibrary.org'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim() || ''
  const author = request.nextUrl.searchParams.get('author')?.trim() || ''
  const genre = request.nextUrl.searchParams.get('genre')?.trim() || ''

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const metadata = await lookupMetadata(title, author, genre)
  return NextResponse.json(metadata)
}

async function lookupMetadata(title: string, author: string, genre: string): Promise<BookMetadata> {
  const docs = await search(title, author)
  const doc = chooseDoc(docs)

  const metadata: BookMetadata = {
    description: fallbackDescription(title, author, genre),
    contentSummary: fallbackSummary(title, author, genre),
    fullTextUrl: internetArchiveSearchUrl(title, author),
    fullTextLabel: 'Найти полный текст',
  }

  if (!doc) {
    return metadata
  }

  metadata.coverUrl = coverUrl(doc.cover_i, doc.cover_edition_key)
  metadata.description = doc.first_sentence?.[0] || metadata.description
  metadata.contentSummary = summaryFromSubjects(doc.subject) || metadata.contentSummary

  const directTextUrl = directFullTextUrl(doc.ia?.[0])
  if (directTextUrl) {
    metadata.fullTextUrl = directTextUrl
    metadata.fullTextLabel = 'Открыть полный текст'
  }

  if (doc.key) {
    const [work, editions] = await Promise.all([fetchWork(doc.key), fetchEditions(doc.key)])

    metadata.description = descriptionText(work?.description) || metadata.description
    metadata.contentSummary = work?.excerpts?.[0]?.excerpt || summaryFromSubjects(work?.subjects) || metadata.contentSummary

    const edition = editions?.entries?.find(entry => entry.covers?.[0] || entry.ia?.[0] || entry.ocaid)
    metadata.coverUrl = metadata.coverUrl || coverUrl(edition?.covers?.[0])

    const editionTextUrl = directFullTextUrl(edition?.ia?.[0] || edition?.ocaid)
    if (editionTextUrl) {
      metadata.fullTextUrl = editionTextUrl
      metadata.fullTextLabel = 'Открыть полный текст'
    }
  }

  return metadata
}

async function search(title: string, author: string) {
  const queries = [
    new URLSearchParams({ title, author, limit: '8' }),
    new URLSearchParams({ q: `${title} ${author}`.trim(), limit: '8' }),
    new URLSearchParams({ title, limit: '8' }),
  ]

  for (const params of queries) {
    const response = await fetch(`${OPEN_LIBRARY_URL}/search.json?${params.toString()}`, {
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) {
      continue
    }

    const data = (await response.json()) as { docs?: SearchDoc[] }
    if (data.docs?.length) {
      return data.docs
    }
  }

  return []
}

function chooseDoc(docs: SearchDoc[]) {
  return docs.find(doc => doc.cover_i && (doc.first_sentence?.length || doc.ia?.length)) || docs.find(doc => doc.cover_i) || docs[0]
}

async function fetchWork(key: string) {
  const response = await fetch(`${OPEN_LIBRARY_URL}${key}.json`, {
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    return undefined
  }

  return (await response.json()) as Work
}

async function fetchEditions(key: string) {
  const response = await fetch(`${OPEN_LIBRARY_URL}${key}/editions.json?limit=10`, {
    next: { revalidate: 60 * 60 * 24 },
  })

  if (!response.ok) {
    return undefined
  }

  return (await response.json()) as Editions
}

function coverUrl(coverId?: number, editionKey?: string) {
  if (coverId) {
    return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
  }

  if (editionKey) {
    return `https://covers.openlibrary.org/b/olid/${editionKey}-L.jpg`
  }

  return undefined
}

function descriptionText(description: Work['description']) {
  if (typeof description === 'string') {
    return description
  }

  return description?.value
}

function summaryFromSubjects(subjects?: string[]) {
  if (!subjects?.length) {
    return undefined
  }

  return `Темы и содержание: ${subjects.slice(0, 8).join(', ')}.`
}

function directFullTextUrl(identifier?: string) {
  return identifier ? `https://archive.org/details/${identifier}` : undefined
}

function internetArchiveSearchUrl(title: string, author: string) {
  return `https://archive.org/search?query=${encodeURIComponent(`${title} ${author}`.trim())}`
}

function fallbackDescription(title: string, author: string, genre: string) {
  const byAuthor = author ? ` автора ${author}` : ''
  const inGenre = genre ? ` в жанре «${genre}»` : ''
  return `«${title}»${byAuthor}${inGenre}. Подробное описание из открытых источников пока не найдено.`
}

function fallbackSummary(title: string, author: string, genre: string) {
  const parts = [`Книга «${title}»`]
  if (author) parts.push(`автора ${author}`)
  if (genre) parts.push(`отнесена в каталоге к жанру «${genre}»`)
  return `${parts.join(' ')}. Подробное содержание можно уточнить по ссылке на поиск полного текста.`
}
