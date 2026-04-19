'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute right-2 top-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          className="h-8 px-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      {language && (
        <div className="absolute left-4 top-2 text-xs text-muted-foreground">
          {language}
        </div>
      )}
      <pre className={cn(
        "p-4 pt-10 rounded-lg overflow-x-auto",
        "bg-muted/50 dark:bg-muted/20",
        "border border-border"
      )}>
        <code className={language ? `language-${language}` : ''}>
          {code}
        </code>
      </pre>
    </div>
  )
}