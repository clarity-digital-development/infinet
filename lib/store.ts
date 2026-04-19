import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Citation {
  title: string
  url: string
  date?: string
  content?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type?: 'text' | 'image'
  images?: string[] // Array of base64 or URLs
  citations?: Citation[]
  metadata?: {
    prompt?: string
    model?: string
    style?: string
    fileName?: string
    fileSize?: number
    fileType?: string
  }
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  projectId?: string
}

export interface Project {
  id: string
  name: string
  color?: string
  createdAt: Date
}

interface ChatStore {
  chats: Chat[]
  projects: Project[]
  currentChatId: string | null
  isGenerating: boolean

  createChat: (title?: string) => string
  deleteChat: (id: string) => void
  updateChatTitle: (id: string, title: string) => void
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  deleteMessage: (chatId: string, messageId: string) => void
  truncateFromMessage: (chatId: string, messageId: string) => void
  setCurrentChat: (id: string | null) => void
  getCurrentChat: () => Chat | undefined
  setIsGenerating: (generating: boolean) => void

  createProject: (name: string, color?: string) => void
  deleteProject: (id: string) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  assignChatToProject: (chatId: string, projectId: string | undefined) => void

  searchChats: (query: string) => Chat[]
  clearAllData: () => void
}

// Get user-specific storage key
const getStorageKey = () => {
  if (typeof window === 'undefined') return 'infinet-chat-store'

  // Try to get user ID from Clerk's client-side session
  const userId = (window as any).__clerk_user_id ||
                 localStorage.getItem('clerk-user-id') ||
                 'anonymous'

  return `infinet-chat-store-${userId}`
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      projects: [],
      currentChatId: null,
      isGenerating: false,

      createChat: (title) => {
        const newChat: Chat = {
          id: crypto.randomUUID(),
          title: title || 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: newChat.id,
        }))
        return newChat.id
      },

      deleteChat: (id) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
        }))
      },

      updateChatTitle: (id, title) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id
              ? { ...chat, title, updatedAt: new Date() }
              : chat
          ),
        }))
      },

      addMessage: (chatId, message) => {
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        }

        set((state) => {
          const updatedChats = state.chats.map((chat) => {
            if (chat.id === chatId) {
              const updatedChat = {
                ...chat,
                messages: [...chat.messages, newMessage],
                updatedAt: new Date(),
              }

              // Auto-generate title from first user message
              if (chat.messages.length === 0 && message.role === 'user' && chat.title === 'New Chat') {
                updatedChat.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
              }

              return updatedChat
            }
            return chat
          })

          return { chats: updatedChats }
        })
      },

      deleteMessage: (chatId, messageId) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: chat.messages.filter(m => m.id !== messageId), updatedAt: new Date() }
              : chat
          ),
        }))
      },

      truncateFromMessage: (chatId, messageId) => {
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id !== chatId) return chat
            const idx = chat.messages.findIndex(m => m.id === messageId)
            if (idx === -1) return chat
            return { ...chat, messages: chat.messages.slice(0, idx), updatedAt: new Date() }
          }),
        }))
      },

      setCurrentChat: (id) => {
        set({ currentChatId: id })
      },

      getCurrentChat: () => {
        const state = get()
        return state.chats.find((chat) => chat.id === state.currentChatId)
      },

      setIsGenerating: (generating) => {
        set({ isGenerating: generating })
      },

      createProject: (name, color) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name,
          color,
          createdAt: new Date(),
        }
        set((state) => ({
          projects: [...state.projects, newProject],
        }))
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          chats: state.chats.map((chat) =>
            chat.projectId === id ? { ...chat, projectId: undefined } : chat
          ),
        }))
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project
          ),
        }))
      },

      assignChatToProject: (chatId, projectId) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, projectId, updatedAt: new Date() }
              : chat
          ),
        }))
      },

      searchChats: (query) => {
        const state = get()
        const lowerQuery = query.toLowerCase()
        return state.chats.filter(
          (chat) =>
            chat.title.toLowerCase().includes(lowerQuery) ||
            chat.messages.some((msg) =>
              msg.content.toLowerCase().includes(lowerQuery)
            )
        )
      },

      clearAllData: () => {
        set({
          chats: [],
          projects: [],
          currentChatId: null,
          isGenerating: false,
        })
      },
    }),
    {
      name: getStorageKey(),
      version: 1,
    }
  )
)