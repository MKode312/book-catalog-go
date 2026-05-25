'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { AlertCircle, BookOpen, Sparkles } from 'lucide-react'

export function AuthTabs() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-red-100">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 opacity-20 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-red-200 to-amber-200 opacity-20 blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 w-full max-w-2xl px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 shadow-xl mb-4">
            <BookOpen className="w-8 h-8 text-amber-950" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-amber-950 tracking-tight mb-3">Book Catalog</h1>
          <p className="text-lg text-amber-800 max-w-xl mx-auto">
            Уютный каталог книг с красивым оформлением, поиском и управлением.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-amber-200 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-wrap gap-2 bg-amber-50 p-4 border-b border-amber-200">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 shadow-lg'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}>
              Вход
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 shadow-lg'
                  : 'text-amber-700 hover:bg-amber-100'
              }`}>
              Регистрация
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'login' && <LoginForm onSuccess={() => router.push('/dashboard')} />}
            {activeTab === 'register' && <RegisterForm onSuccess={() => router.push('/dashboard')} />}
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-amber-900/80">
          <Sparkles className="inline-block w-4 h-4 mr-2 mb-1 text-amber-600" />
          Добро пожаловать в библиотеку вашего приложения.
        </div>
      </div>
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: { email: string; password: string }) {
    setError('')
    setLoading(true)

    try {
      const response = await api.login({
        email: values.email,
        password: values.password,
      })

      if (response.token) {
        localStorage.setItem('authToken', response.token)
        localStorage.setItem('userEmail', values.email)
        localStorage.setItem('isAdmin', String(response.isAdmin || response.is_admin || false))
        onSuccess()
      } else {
        setError('Не удалось войти')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-amber-950">Войти в аккаунт</CardTitle>
        <CardDescription className="text-amber-800">Введите ваши учетные данные</CardDescription>
      </CardHeader>
      <CardContent>
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
              name="email"
              rules={{ required: 'Email обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{ required: 'Пароль обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-bold"
              disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      password_confirm: '',
      admin_secret: '',
    },
  })

  async function onSubmit(values: any) {
    setError('')

    if (values.password !== values.password_confirm) {
      setError('Пароли не совпадают')
      return
    }

    setLoading(true)

    try {
      if (isAdmin) {
        await api.registerAsAdmin({
          email: values.email,
          password: values.password,
          admin_secret: values.admin_secret,
        })
      } else {
        await api.register({
          email: values.email,
          password: values.password,
        })
      }

      const loginResponse = await api.login({
        email: values.email,
        password: values.password,
      })

      if (loginResponse.token) {
        localStorage.setItem('authToken', loginResponse.token)
        localStorage.setItem('userEmail', values.email)
        localStorage.setItem('isAdmin', String(isAdmin))
        onSuccess()
      } else {
        setError('Не удалось зарегистрироваться')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-amber-950">Создать аккаунт</CardTitle>
        <CardDescription className="text-amber-800">Заполните форму для регистрации</CardDescription>
      </CardHeader>
      <CardContent>
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
              name="email"
              rules={{ required: 'Email обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{ required: 'Пароль обязателен' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password_confirm"
              rules={{ required: 'Подтверждение обязательно' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Подтвердите пароль</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={e => setIsAdmin(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Зарегистрировать администратора</span>
              </label>
            </div>

            {isAdmin && (
              <FormField
                control={form.control}
                name="admin_secret"
                rules={{ required: 'Секрет администратора обязателен' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Секрет администратора</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Введите секрет" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-bold"
              disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
