'use client'

// MessageList component - updated to remove streaming dots
import { Message } from '@/lib/store'
import { ScrollArea } from '@/components/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { useEffect, useRef, useState, useMemo } from 'react'
import { User, Bot, Copy, Check, Download, Maximize2, Globe, Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MessageListProps {
  messages: Message[]
  loadingMessage?: string
  isGenerating?: boolean
}

interface MessageContentProps {
  content: string
  isBot: boolean
  messageId: string
  typedMessageIds: Set<string>
  isGenerating?: boolean
}

function MessageContent({ content, isBot, messageId, typedMessageIds, isGenerating = false }: MessageContentProps) {
  // Direct display for all content - no typing animation or dots
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, className, children, inline, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const codeString = String(children).replace(/\n$/, '')

          if (!inline && match) {
            return (
              <CodeBlock
                code={codeString}
                language={match[1]}
                className="my-4"
              />
            )
          }

          return (
            <code
              className={cn(
                "px-1.5 py-0.5 rounded-md",
                "bg-muted text-sm font-mono",
                className
              )}
              {...props}
            >
              {children}
            </code>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export function MessageList({ messages, loadingMessage, isGenerating = false }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [typedMessageIds] = useState<Set<string>>(() => new Set())
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playTTS = async (content: string, messageId: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (playingId === messageId) {
      setPlayingId(null)
      return
    }

    setTtsLoadingId(messageId)
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingId(messageId)
      audio.onended = () => {
        setPlayingId(null)
        URL.revokeObjectURL(url)
      }
      await audio.play()
    } catch (error) {
      console.error('TTS playback failed:', error)
      setPlayingId(null)
    } finally {
      setTtsLoadingId(null)
    }
  }

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const copyToClipboard = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `generated-image-${Date.now()}-${index}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollAreaRef}>
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Image
              src="/logo.png"
              alt="Infinet"
              width={48}
              height={48}
              className="mx-auto mb-4 grayscale opacity-50"
            />
            <p>Start a conversation by typing a message below</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto py-2 sm:py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role !== 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
              )}

              <div className={cn(
                'flex flex-col space-y-2',
                message.role === 'user' ? 'max-w-[85%] sm:max-w-[70%]' : 'max-w-[90%] sm:max-w-[85%]'
              )}>
                <div className={cn(
                  'rounded-lg px-3 py-2 sm:px-4 sm:py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto'
                    : 'bg-muted'
                )}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium opacity-70">
                        {message.role === 'user' ? 'You' : 'Infinet'}
                      </span>
                      {message.timestamp && (
                        <span className="text-xs opacity-50">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {message.role === 'assistant' && message.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playTTS(message.content, message.id)}
                          className="h-6 px-2"
                          title={playingId === message.id ? 'Stop' : 'Read aloud'}
                        >
                          {ttsLoadingId === message.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Volume2 className={cn('h-3 w-3', playingId === message.id && 'text-primary')} />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className={cn(
                          "h-6 px-2",
                          message.role === 'user' ? 'hover:bg-primary/80' : ''
                        )}
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                <div className={cn(
                  message.role === 'user'
                    ? "text-primary-foreground"
                    : "prose prose-sm dark:prose-invert max-w-none"
                )}>
                  {message.type === 'image' && message.images ? (
                    <div className="space-y-3">
                      <p className="text-sm mb-2">{message.content}</p>
                      <div className={cn(
                        "grid gap-3",
                        message.images.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                      )}>
                        {message.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <div className="relative aspect-square w-full max-w-md overflow-hidden rounded-lg border">
                              <img
                                src={image}
                                alt={`Generated image ${index + 1}`}
                                className="object-cover w-full h-full"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setExpandedImage(image)}
                                >
                                  <Maximize2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => downloadImage(image, index)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {message.metadata?.prompt && (
                        <p className="text-xs opacity-60 mt-2">
                          Model: {message.metadata.model || 'venice-sd35'}
                        </p>
                      )}
                    </div>
                  ) : (
                    !message.content && loadingMessage && message.role === 'assistant' ? (
                      <div className="italic text-muted-foreground">
                        {loadingMessage}
                      </div>
                    ) : (
                      <MessageContent
                        content={message.content || '_Thinking..._'}
                        isBot={message.role !== 'user'}
                        messageId={message.id}
                        typedMessageIds={typedMessageIds}
                        isGenerating={isGenerating}
                      />
                    )
                  )}
                </div>

                {/* Web search citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium opacity-70">
                      <Globe className="h-3 w-3" />
                      <span>Sources ({message.citations.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {message.citations.map((citation, idx) => (
                        <a
                          key={idx}
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/50 border text-xs hover:bg-background hover:border-primary/40 transition-colors max-w-xs truncate"
                          title={citation.title}
                        >
                          <span className="opacity-60">{idx + 1}.</span>
                          <span className="truncate">{citation.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {expandedImage && (
            <div className="relative w-full">
              <img
                src={expandedImage}
                alt="Expanded view"
                className="w-full h-auto rounded-lg"
              />
              <Button
                className="absolute top-2 right-2"
                size="sm"
                variant="secondary"
                onClick={() => downloadImage(expandedImage, 0)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}