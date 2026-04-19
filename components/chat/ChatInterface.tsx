'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { MessageList } from './MessageList'
import { ShareDialog } from './ShareDialog'
import { FileUploader } from './FileUploader'
import { UpgradePrompt } from './UpgradePrompt'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, StopCircle, Share2, Paperclip, ChevronDown, Sparkles, Globe, Mic, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cycleLoadingMessages } from '@/lib/loading-messages'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface AvailableModel {
  id: string
  label: string
  description: string
  supportsVision: boolean
  supportsReasoning: boolean
}

export function ChatInterface() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [fileUploaderOpen, setFileUploaderOpen] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{ tier?: string; limit?: number; used?: number }>({})
  const [loadingMessage, setLoadingMessage] = useState('')
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [userTier, setUserTier] = useState<string>('free')
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size < 1024) {
          toast({ title: 'Recording too short', description: 'Hold the mic for longer.', variant: 'destructive' })
          setIsTranscribing(false)
          return
        }
        setIsTranscribing(true)
        try {
          const form = new FormData()
          form.append('file', blob, 'recording.webm')
          const res = await fetch('/api/voice/stt', { method: 'POST', body: form })
          const data = await res.json()
          if (data.text) {
            setInput(prev => prev ? `${prev} ${data.text}` : data.text)
            textareaRef.current?.focus()
          } else {
            toast({ title: 'Transcription failed', description: data.error || 'Please try again', variant: 'destructive' })
          }
        } catch (error) {
          console.error('Transcription error:', error)
          toast({ title: 'Transcription failed', variant: 'destructive' })
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Mic access denied:', error)
      toast({ title: 'Microphone access denied', description: 'Allow mic access in your browser settings.', variant: 'destructive' })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  // Drag-and-drop file uploads
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounterRef.current = 0

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const file = files[0]
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      handleFileUploaded(file, content)
    }
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file)
    } else {
      reader.readAsText(file)
    }
  }
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()

  // Fetch available models for the user's tier
  useEffect(() => {
    fetch('/api/user/models')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setAvailableModels(data.models)
          setUserTier(data.tier)
          if (!selectedModel && data.models.length > 0) {
            setSelectedModel(data.models[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  const {
    getCurrentChat,
    addMessage,
    createChat,
    currentChatId,
    isGenerating,
    setIsGenerating,
    updateChatTitle,
  } = useChatStore()

  const currentChat = getCurrentChat()

  // Effect to cycle through loading messages
  useEffect(() => {
    if (isGenerating || isLoading) {
      const messageGenerator = cycleLoadingMessages()
      setLoadingMessage(messageGenerator.next().value || '')

      const interval = setInterval(() => {
        setLoadingMessage(messageGenerator.next().value || '')
      }, 1000) // Change message every 1 second

      return () => clearInterval(interval)
    } else {
      setLoadingMessage('')
    }
  }, [isGenerating, isLoading])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    setIsLoading(true)
    setIsGenerating(true)

    // Create new chat if needed
    let chatId = currentChatId
    const wasNewChat = !chatId || (currentChat?.messages.length === 0)
    if (!chatId) {
      chatId = createChat()
    }

    // Add user message
    addMessage(chatId, {
      role: 'user',
      content: userMessage,
    })

    // Auto-generate a title from the first message (fire-and-forget)
    if (wasNewChat) {
      const titleChatId = chatId
      fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.title) updateChatTitle(titleChatId, data.title)
        })
        .catch(() => {})
    }

    // Create temporary message for streaming
    const tempMessageId = crypto.randomUUID()
    addMessage(chatId, {
      role: 'assistant',
      content: '',
    })

    const controller = new AbortController()
    setAbortController(controller)

    // Convert stored messages into Venice's content format.
    // If a message has images attached, send as multimodal content-parts.
    const messagesForApi = (currentChat?.messages.filter(m => m.content || (m.images && m.images.length)) || []).map(m => {
      if (m.images && m.images.length > 0) {
        return {
          role: m.role,
          content: [
            ...(m.content ? [{ type: 'text', text: m.content }] : []),
            ...m.images.map(img => ({
              type: 'image_url',
              image_url: { url: img }, // Already a data: URL or http URL
            })),
          ],
        }
      }
      return { role: m.role, content: m.content }
    })
    messagesForApi.push({ role: 'user', content: userMessage })

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForApi,
          streaming: true,
          model: selectedModel,
          webSearch: webSearchEnabled,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 402 || response.status === 429) {
          // Payment required or rate limit - user has hit their token limit
          const errorData = await response.json()

          // Remove the last empty assistant message we added
          const store = useChatStore.getState()
          const chat = store.chats.find(c => c.id === chatId)
          if (chat && chat.messages.length > 0) {
            const lastMessage = chat.messages[chat.messages.length - 1]
            if (lastMessage.role === 'assistant' && !lastMessage.content) {
              store.chats = store.chats.map(c =>
                c.id === chatId
                  ? { ...c, messages: c.messages.slice(0, -1) }
                  : c
              )
            }
          }

          // Show upgrade prompt in the chat
          setShowUpgradePrompt(true)
          setTokenInfo({
            tier: errorData.subscription?.tier || 'free',
            limit: errorData.subscription?.tokenLimit || 500,
            used: errorData.subscription?.tokenLimit || 500
          })

          setIsLoading(false)
          setIsGenerating(false)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep the last incomplete line in the buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                break
              }
              if (!data) continue

              try {
                const parsed = JSON.parse(data)

                // Capture citations from web search (arrives in first chunk)
                if (parsed.citations && Array.isArray(parsed.citations)) {
                  const store = useChatStore.getState()
                  store.chats = store.chats.map(c =>
                    c.id === chatId
                      ? {
                          ...c,
                          messages: c.messages.map((m, idx) =>
                            idx === c.messages.length - 1
                              ? { ...m, citations: parsed.citations }
                              : m
                          )
                        }
                      : c
                  )
                }

                if (parsed.content) {
                  accumulatedContent += parsed.content
                  // Update the last assistant message with smoother streaming
                  const store = useChatStore.getState()
                  const chat = store.chats.find(c => c.id === chatId)
                  if (chat && chat.messages.length > 0) {
                    const lastMessage = chat.messages[chat.messages.length - 1]
                    if (lastMessage.role === 'assistant') {
                      // Use requestAnimationFrame for smoother updates
                      requestAnimationFrame(() => {
                        store.chats = store.chats.map(c =>
                          c.id === chatId
                            ? {
                                ...c,
                                messages: c.messages.map((m, idx) =>
                                  idx === c.messages.length - 1
                                    ? { ...m, content: accumulatedContent }
                                    : m
                                )
                              }
                            : c
                        )
                      })
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, 'Data:', data)
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({
          title: 'Generation stopped',
          description: 'The message generation was stopped.',
        })
      } else {
        console.error('Chat error:', error)
        toast({
          title: 'Error',
          description: 'Failed to get response. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      setAbortController(null)
    }
  }

  const handleStop = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileUploaded = (file: File, content: string) => {
    // Create new chat if needed
    let chatId = currentChatId
    if (!chatId) {
      chatId = createChat()
    }

    // Determine file type and prepare message
    const fileType = file.type.startsWith('image/') ? 'image' : 'file'
    const fileName = file.name

    // Add message with file attachment
    addMessage(chatId, {
      role: 'user',
      content: `[Attached file: ${fileName}]\n\n${fileType === 'image' ? 'Please analyze this image.' : 'Please analyze this file.'}`,
      type: fileType === 'image' ? 'image' : 'text',
      images: fileType === 'image' ? [content] : undefined,
      metadata: {
        fileName,
        fileSize: file.size,
        fileType: file.type,
      },
    })

    toast({
      title: 'File Attached',
      description: `${fileName} has been added to the conversation`,
    })
  }

  useEffect(() => {
    textareaRef.current?.focus()
  }, [currentChatId])

  // Handle loading state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !currentChat) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Select or create a chat to get started</p>
          <Button
            onClick={() => createChat()}
            className="mt-4"
          >
            Start New Chat
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex h-full flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-background border border-primary rounded-lg p-6 shadow-lg">
            <Paperclip className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">Drop file to attach</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between border-b px-2 sm:px-4 py-2 gap-2">
        <h2 className="font-semibold text-sm sm:text-base truncate flex-shrink min-w-0">{currentChat.title}</h2>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {availableModels.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs sm:text-sm"
                  title="Switch model"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {availableModels.find(m => m.id === selectedModel)?.label || 'Model'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {availableModels.map(m => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer py-2"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium">{m.label}</span>
                      {selectedModel === m.id && (
                        <span className="ml-auto text-xs text-primary">Active</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </DropdownMenuItem>
                ))}
                {(userTier === 'free' || userTier === 'starter') && (
                  <DropdownMenuItem asChild>
                    <Link href="/pricing" className="text-xs text-primary cursor-pointer">
                      Upgrade for more models →
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            disabled={currentChat.messages.length === 0}
            title="Share Chat"
            className="h-11 w-11 p-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MessageList messages={currentChat.messages} loadingMessage={loadingMessage} isGenerating={isGenerating || isLoading} />

      {showUpgradePrompt && (
        <UpgradePrompt
          currentTier={tokenInfo.tier}
          tokenLimit={tokenInfo.limit}
          tokensUsed={tokenInfo.used}
        />
      )}

      <div className="border-t p-2 sm:p-4 flex-shrink-0 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Button
            type="button"
            onClick={() => setFileUploaderOpen(true)}
            variant="outline"
            size="icon"
            title="Attach File"
            disabled={isLoading}
            className="h-11 w-11"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            variant={webSearchEnabled ? 'default' : 'outline'}
            size="icon"
            title={webSearchEnabled ? 'Web search ON — click to disable' : 'Enable web search for this message'}
            disabled={isLoading}
            className="h-11 w-11"
          >
            <Globe className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? 'destructive' : 'outline'}
            size="icon"
            title={isRecording ? 'Stop recording' : 'Voice input'}
            disabled={isLoading || isTranscribing}
            className="h-11 w-11"
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className={isRecording ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} />
            )}
          </Button>
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask anything privately'
              className="min-h-[44px] sm:min-h-[52px] pr-14 resize-none text-sm sm:text-base"
              disabled={isLoading}
            />
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className="absolute right-2 bottom-2 h-9 w-9"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim()}
                size="icon"
                className="absolute right-2 bottom-2 h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </div>

      <ShareDialog
        chat={currentChat}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <FileUploader
        open={fileUploaderOpen}
        onOpenChange={setFileUploaderOpen}
        onFileUploaded={handleFileUploaded}
      />
    </div>
  )
}
