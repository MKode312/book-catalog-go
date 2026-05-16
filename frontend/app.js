// API Configuration
const API_BASE_URL = '/api'
let authToken = localStorage.getItem('authToken')
let userEmail = localStorage.getItem('userEmail')
let userID = localStorage.getItem('userID')
let isAdmin = localStorage.getItem('isAdmin') === 'true'
let currentBooks = []
let allBooks = []
let currentTab = 'all'

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  if (authToken && userEmail) {
    userID = userID || parseJwt(authToken).uid || ''
    setAuthCookie(authToken)
    showMainApp()
    loadAllBooks({ showLoader: false })
  } else {
    showAuthSection()
  }

  // Setup event listeners
  document.getElementById('loginForm').addEventListener('submit', handleLogin)
  document.getElementById('registerForm').addEventListener('submit', handleRegister)
  document.getElementById('addBookForm').addEventListener('submit', handleAddBook)
  document.getElementById('registerAsAdmin').addEventListener('change', toggleAdminSecret)
})

// ============ Authentication Functions ============

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm')
  const registerForm = document.getElementById('registerForm')
  const loginTab = document.getElementById('loginTabBtn')
  const registerTab = document.getElementById('registerTabBtn')

  if (tab === 'login') {
    loginForm.classList.add('active')
    registerForm.classList.remove('active')
    loginTab.classList.add('active')
    registerTab.classList.remove('active')
  } else {
    loginForm.classList.remove('active')
    registerForm.classList.add('active')
    loginTab.classList.remove('active')
    registerTab.classList.add('active')
  }
  clearErrors()
}

async function handleLogin(e) {
  e.preventDefault()
  const email = document.getElementById('loginEmail').value.trim()
  const password = document.getElementById('loginPassword').value
  const errorDiv = document.getElementById('loginError')

  try {
    const response = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (response.ok && data.token) {
      authToken = data.token
      userEmail = email
      localStorage.setItem('authToken', authToken)
      localStorage.setItem('userEmail', userEmail)
      setAuthCookie(authToken)

      const claims = parseJwt(authToken)
      userID = claims.uid || ''
      isAdmin = Boolean(data.isAdmin || data.is_admin || claims.is_admin)
      localStorage.setItem('userID', userID)
      localStorage.setItem('isAdmin', isAdmin)

      errorDiv.textContent = ''
      document.getElementById('loginEmail').value = ''
      document.getElementById('loginPassword').value = ''
      showMainApp()
      loadAllBooks({ showLoader: false })
    } else {
      showError(errorDiv, getApiError(data, 'Не удалось войти'))
    }
  } catch (error) {
    showError(errorDiv, 'Нет соединения с сервером. Попробуйте ещё раз.')
    console.error('Login error:', error)
  }
}

async function handleRegister(e) {
  e.preventDefault()
  const email = document.getElementById('registerEmail').value.trim()
  const password = document.getElementById('registerPassword').value
  const confirmPassword = document.getElementById('registerConfirmPassword').value
  const asAdmin = document.getElementById('registerAsAdmin').checked
  const adminSecret = document.getElementById('adminSecret').value
  const errorDiv = document.getElementById('registerError')

  if (password !== confirmPassword) {
    showError(errorDiv, 'Пароли не совпадают')
    return
  }

  if (asAdmin && !adminSecret.trim()) {
    showError(errorDiv, 'Введите секретный ключ администратора')
    return
  }

  try {
    const path = asAdmin ? '/register/admin' : '/register'
    const body = asAdmin ? { email, password, admin_secret: adminSecret } : { email, password }
    const response = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (response.ok) {
      errorDiv.textContent = ''
      errorDiv.classList.remove('show')
      document.getElementById('registerEmail').value = ''
      document.getElementById('registerPassword').value = ''
      document.getElementById('registerConfirmPassword').value = ''
      document.getElementById('registerAsAdmin').checked = false
      document.getElementById('adminSecret').value = ''
      toggleAdminSecret()

      switchAuthTab('login')
      const loginError = document.getElementById('loginError')
      loginError.textContent = 'Регистрация прошла успешно. Теперь войдите.'
      loginError.classList.add('show')
      loginError.style.color = '#16a34a'
    } else {
      showError(errorDiv, getApiError(data, 'Не удалось зарегистрироваться'))
    }
  } catch (error) {
    showError(errorDiv, 'Нет соединения с сервером. Попробуйте ещё раз.')
    console.error('Register error:', error)
  }
}

function logout() {
  authToken = null
  userEmail = null
  userID = null
  isAdmin = false
  localStorage.removeItem('authToken')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userID')
  localStorage.removeItem('isAdmin')
  clearAuthCookie()
  showAuthSection()
  clearErrors()
}

async function deleteCurrentUser() {
  const id = userID || parseJwt(authToken || '').uid

  if (!id) {
    alert('Не удалось определить пользователя')
    return
  }

  if (!confirm('Удалить аккаунт? Это действие нельзя отменить.')) {
    return
  }

  try {
    const response = await apiFetch('/deleteUser', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    })

    if (response.ok) {
      logout()
      return
    }

    handleAuthError(response)

    if (response.status !== 401 && response.status !== 403) {
      alert('Не удалось удалить пользователя')
    }
  } catch (error) {
    console.error('Delete user error:', error)
    alert('Нет соединения с сервером. Попробуйте ещё раз.')
  }
}

// ============ UI Display Functions ============

function showAuthSection() {
  document.getElementById('authSection').style.display = 'flex'
  document.getElementById('mainSection').style.display = 'none'
}

function showMainApp() {
  document.getElementById('authSection').style.display = 'none'
  document.getElementById('mainSection').style.display = 'block'
  document.getElementById('userEmail').textContent = userEmail

  const adminBtn = document.getElementById('adminBtn')
  if (isAdmin) {
    adminBtn.style.display = 'inline-block'
  } else {
    adminBtn.style.display = 'none'
  }
}

function showError(errorDiv, message) {
  errorDiv.textContent = message
  errorDiv.classList.add('show')
}

function clearErrors() {
  document.getElementById('loginError').textContent = ''
  document.getElementById('loginError').classList.remove('show')
  document.getElementById('loginError').style.color = '#dc2626'
  document.getElementById('registerError').textContent = ''
  document.getElementById('registerError').classList.remove('show')
}

function toggleAdminSecret() {
  const group = document.getElementById('adminSecretGroup')
  const input = document.getElementById('adminSecret')
  const enabled = document.getElementById('registerAsAdmin').checked

  group.classList.toggle('hidden', !enabled)
  input.required = enabled
}

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (response.redirected && isLoginRedirect(response.url)) {
    logout()
    return new Response(JSON.stringify({ error: 'User is not authorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return response
}

function isLoginRedirect(url) {
  const redirectUrl = new URL(url, window.location.origin)
  return redirectUrl.origin === window.location.origin && redirectUrl.pathname === '/'
}

function getApiError(data, fallback) {
  return data?.error || data?.message || fallback
}

function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch (error) {
    return {}
  }
}

function setAuthCookie(token) {
  document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; SameSite=Lax`
}

function clearAuthCookie() {
  document.cookie = 'auth_token=; path=/; Max-Age=0; SameSite=Lax'
}

// ============ Book Management Functions ============

async function loadAllBooks({ showLoader } = {}) {
  try {
    console.log('📚 Loading books...')
    if (showLoader) {
      showLoading('Загрузка книг...')
    }
    const response = await apiFetch('/books/all')
    console.log('📡 API Response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('📥 Raw data from API:', data)
      allBooks = normalizeBooks(data)
      currentBooks = allBooks
      console.log('✅ Books loaded successfully:', allBooks.length, 'books')
      displayBooks(currentBooks)
    } else if (response.status === 409) {
      allBooks = []
      currentBooks = []
      console.log('⚠️ No books in database (409 status)')
      displayBooks([])
    } else {
      handleAuthError(response)
      console.log('❌ API error:', response.status)
    }
  } catch (error) {
    console.error('💥 Load books error:', error)
    allBooks = []
    currentBooks = []
    displayBooks([])
  }
}

async function searchByTitle() {
  if (allBooks.length === 0) await loadAllBooks({ showLoader: false })
  const query = document.getElementById('searchInput').value.trim()
  applyLocalFilter('byTitle', query)
}

async function searchByAuthor(author) {
  if (allBooks.length === 0) await loadAllBooks({ showLoader: false })
  applyLocalFilter('byAuthor', author)
}

async function searchByGenre(genre) {
  if (allBooks.length === 0) await loadAllBooks({ showLoader: false })
  applyLocalFilter('byGenre', genre)
}

async function performSearch() {
  if (allBooks.length === 0) await loadAllBooks({ showLoader: false })
  const searchInput = document.getElementById('searchInput').value.trim()
  applyLocalFilter(currentTab, searchInput)
}

async function filterByTab(tab) {
  if (allBooks.length === 0) await loadAllBooks({ showLoader: false })
  currentTab = tab

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab)
  })

  const searchInput = document.getElementById('searchInput').value.trim()
  applyLocalFilter(tab, searchInput)
}

function applyLocalFilter(tab, query) {
  console.log('🔍 Applying filter:', { tab, query, allBooksCount: allBooks.length })
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    currentBooks = allBooks
    displayBooks(currentBooks)
    console.log('✅ No query - showing all books:', currentBooks.length)
    return
  }

  const fieldByTab = {
    byTitle: 'title',
    byAuthor: 'author',
    byGenre: 'genre',
  }

  currentBooks = allBooks.filter(book => {
    if (tab === 'all') {
      return [book.title, book.author, book.genre].some(value => value.toLowerCase().includes(normalizedQuery))
    }

    const field = fieldByTab[tab] || 'title'
    return book[field].toLowerCase().includes(normalizedQuery)
  })

  console.log('🔎 Search results:', { tab, query, foundCount: currentBooks.length, results: currentBooks })
  displayBooks(currentBooks, normalizedQuery)
}

function displayBooks(books, query = '') {
  const grid = document.getElementById('booksGrid')

  if (!books || books.length === 0) {
    const text = query ? 'По этому запросу ничего не найдено.' : 'В каталоге пока нет книг.'
    grid.innerHTML = `<div class="empty-state"><strong>${text}</strong><span>Попробуйте другой поиск или добавьте книгу в админ-панели.</span></div>`
    return
  }

  grid.innerHTML = books
    .map(
      book => `
        <div class="book-card">
            <div class="book-cover">${getBookEmoji(book.genre)}</div>
            <div class="book-content">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">${escapeHtml(book.author)}</p>
                <span class="book-genre">${escapeHtml(book.genre)}</span>
                <div class="book-actions">
                    <button class="btn btn-primary btn-small" onclick="showBookDetails('${escapeAttr(book.id)}', '${escapeAttr(book.title)}', '${escapeAttr(book.author)}', '${escapeAttr(book.genre)}')">Открыть</button>
                    ${isAdmin ? `<button class="btn btn-danger btn-small" onclick="deleteBook('${escapeAttr(book.id)}')">Удалить</button>` : ''}
                </div>
            </div>
        </div>
    `,
    )
    .join('')
}

function displayError(message) {
  const grid = document.getElementById('booksGrid')
  grid.innerHTML = `<div class="empty-state" style="color: #dc2626;">${escapeHtml(message)}</div>`
}

function showLoading(message) {
  document.getElementById('booksGrid').innerHTML = `<div class="loading">${escapeHtml(message)}</div>`
}

function getBookEmoji(genre) {
  const genreMap = {
    fiction: '📖',
    mystery: '🔍',
    romance: '💕',
    science: '🔬',
    fantasy: '🧙',
    history: '📜',
    biography: '👤',
    thriller: '😱',
    horror: '👻',
    adventure: '⛰️',
    poetry: '✍️',
    drama: '🎭',
  }

  const lowerGenre = String(genre || '').toLowerCase()
  for (const [key, emoji] of Object.entries(genreMap)) {
    if (lowerGenre.includes(key)) {
      return emoji
    }
  }
  return '📚'
}

function showBookDetails(bookId, title, author, genre) {
  const modal = document.getElementById('bookDetailsModal')
  const content = document.getElementById('bookDetailsContent')

  content.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Название</div>
            <div class="detail-value">${escapeHtml(title)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Автор</div>
            <div class="detail-value">${escapeHtml(author)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Жанр</div>
            <div class="detail-value">${escapeHtml(genre)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">ID книги</div>
            <div class="detail-value">${escapeHtml(bookId)}</div>
        </div>
        <div style="margin-top: 24px; display: flex; gap: 8px;">
            <button class="btn btn-primary" onclick="closeBookDetails()">Закрыть</button>
            ${isAdmin ? `<button class="btn btn-danger" onclick="deleteBook('${escapeAttr(bookId)}')">Удалить</button>` : ''}
        </div>
    `

  modal.classList.add('show')
  modal.style.display = 'flex'
}

function closeBookDetails() {
  const modal = document.getElementById('bookDetailsModal')
  modal.classList.remove('show')
  modal.style.display = 'none'
}

// ============ Admin Functions ============

async function handleAddBook(e) {
  e.preventDefault()
  const title = document.getElementById('bookTitle').value.trim()
  const author = document.getElementById('bookAuthor').value.trim()
  const genre = document.getElementById('bookGenre').value.trim()
  const errorDiv = document.getElementById('addBookError')

  if (!title || !author || !genre) {
    showError(errorDiv, 'Заполните все поля')
    return
  }

  try {
    const response = await apiFetch('/book/save', {
      method: 'POST',
      body: JSON.stringify({ title, author, genre }),
    })

    if (response.ok) {
      errorDiv.textContent = ''
      errorDiv.classList.remove('show')
      document.getElementById('bookTitle').value = ''
      document.getElementById('bookAuthor').value = ''
      document.getElementById('bookGenre').value = ''

      await loadAllBooks({ showLoader: false })
      loadAdminBooks()

      // Сбросить поле поиска и показать все книги
      document.getElementById('searchInput').value = ''
      currentTab = 'all'
      currentBooks = allBooks
      displayBooks(currentBooks)
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'all')
      })

      showSuccess('Книга добавлена')
    } else {
      const data = await response.json()
      showError(errorDiv, getApiError(data, 'Не удалось добавить книгу'))
    }
  } catch (error) {
    showError(errorDiv, 'Нет соединения с сервером. Попробуйте ещё раз.')
    console.error('Add book error:', error)
  }
}

async function deleteBook(bookId) {
  if (!confirm('Удалить эту книгу?')) {
    return
  }

  try {
    const response = await apiFetch(`/book/${bookId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await loadAllBooks({ showLoader: false })
      loadAdminBooks()
      closeBookDetails()

      // Сбросить поле поиска и показать все книги
      document.getElementById('searchInput').value = ''
      currentTab = 'all'
      currentBooks = allBooks
      displayBooks(currentBooks)
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'all')
      })

      showSuccess('Книга удалена')
    } else {
      handleAuthError(response)
    }
  } catch (error) {
    console.error('Delete error:', error)
    displayError('Не удалось удалить книгу')
  }
}

function showAdminPanel() {
  const modal = document.getElementById('adminPanel')
  modal.classList.add('show')
  modal.style.display = 'flex'
  loadAdminBooks()
}

function closeAdminPanel() {
  const modal = document.getElementById('adminPanel')
  modal.classList.remove('show')
  modal.style.display = 'none'
}

async function loadAdminBooks() {
  try {
    const response = await apiFetch('/books/all')

    if (response.ok) {
      const data = await response.json()
      displayAdminBooks(normalizeBooks(data))
    } else if (response.status === 409) {
      displayAdminBooks([])
    } else {
      handleAuthError(response)
    }
  } catch (error) {
    console.error('Load admin books error:', error)
  }
}

function displayAdminBooks(books) {
  const table = document.getElementById('booksTable')

  if (!books || books.length === 0) {
    table.innerHTML = '<div class="empty-state">В каталоге пока нет книг</div>'
    return
  }

  table.innerHTML = `
        <div class="books-list">
            ${books
              .map(
                book => `
                <div class="book-row">
                    <div class="book-row-info">
                        <div class="book-row-title">${escapeHtml(book.title)}</div>
                        <div class="book-row-meta">
                            <strong>Автор:</strong> ${escapeHtml(book.author)} | 
                            <strong>Жанр:</strong> ${escapeHtml(book.genre)}
                        </div>
                    </div>
                    <div class="book-row-actions">
                        <button class="btn btn-danger btn-small" onclick="deleteBook('${escapeAttr(book.id)}')">Удалить</button>
                    </div>
                </div>
            `,
              )
              .join('')}
        </div>
    `
}

// ============ Utility Functions ============

function normalizeBooks(data) {
  const rawBooks = Array.isArray(data) ? data : data?.books || data?.Books || []
  const normalized = rawBooks.map(normalizeBook).filter(book => book.id && book.title)
  console.log('Raw books from API:', rawBooks)
  console.log('Normalized books:', normalized)
  return normalized
}

function normalizeBook(book) {
  return {
    id: String(book?.id || book?.ID || book?.Id || ''),
    title: String(book?.title || book?.Title || ''),
    author: String(book?.author || book?.Author || ''),
    genre: String(book?.genre || book?.Genre || ''),
  }
}

function handleAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    logout()
  }
}

function showSuccess(message) {
  // Show success toast or message
  const div = document.createElement('div')
  div.className = 'success-message show'
  div.textContent = message
  div.style.position = 'fixed'
  div.style.top = '20px'
  div.style.right = '20px'
  div.style.zIndex = '2000'
  div.style.maxWidth = '400px'
  document.body.appendChild(div)

  setTimeout(() => {
    div.remove()
  }, 3000)
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeAttr(text) {
  if (!text) return ''
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')
}

// Close modals when clicking outside
window.onclick = function (event) {
  const adminPanel = document.getElementById('adminPanel')
  const bookDetailsModal = document.getElementById('bookDetailsModal')

  if (event.target === adminPanel) {
    closeAdminPanel()
  }
  if (event.target === bookDetailsModal) {
    closeBookDetails()
  }
}

// Search on Enter key
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput')
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        performSearch()
      }
    })
  }
})
