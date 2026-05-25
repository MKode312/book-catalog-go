'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { Plus, AlertCircle } from 'lucide-react'

interface AddBookDialogProps {
  onBookAdded: () => void
}

export function AddBookDialog({ onBookAdded }: AddBookDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      title: '',
      author: '',
      genre: '',
      description: '',
      isbn: '',
    },
  })

  async function onSubmit(values: any) {
    setError('')
    setLoading(true)

    const token = localStorage.getItem('authToken')
    if (!token) {
      setError('Вы не авторизированы')
      setLoading(false)
      return
    }

    try {
      await api.saveBook(
        {
          title: values.title,
          author: values.author,
          genre: values.genre,
          description: values.description || undefined,
          isbn: values.isbn || undefined,
        },
        token,
      )

      form.reset()
      setOpen(false)
      onBookAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении книги')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-green-400 to-emerald-400 text-green-950 hover:from-green-500 hover:to-emerald-500 font-semibold">
          <Plus className="w-4 h-4" />➕ Добавить книгу
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-amber-200">
        <DialogHeader>
          <DialogTitle className="text-amber-950">📖 Добавить новую книгу</DialogTitle>
          <DialogDescription className="text-amber-800">Заполните информацию о книге в каталоге</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ошибка</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="title"
              rules={{ required: 'Название обязательно' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название книги" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              rules={{ required: 'Автор обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Автор</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите автора" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genre"
              rules={{ required: 'Жанр обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Жанр</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите жанр" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isbn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ISBN (опционально)</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите ISBN" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (опционально)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Введите описание" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 hover:from-amber-500 hover:to-orange-500 font-bold"
              disabled={loading}>
              {loading ? 'Добавление...' : 'Добавить книгу'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
