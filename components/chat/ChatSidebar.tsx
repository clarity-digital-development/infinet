'use client'

import { useChatStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Search,
  MessageSquare,
  Folder,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  X,
  MoreVertical,
  Trash,
  Edit,
  Crown,
  Archive,
  Settings,
} from 'lucide-react'
import { SettingsPanel } from './SettingsPanel'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')

  const { user } = useUser()
  const userEmail = user?.emailAddresses?.[0]?.emailAddress
  const isDeveloper = userEmail?.toLowerCase() === 'tannercarlson@vvsvault.com'

  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<{ tokensUsed: number; tokenLimit: number | 'unlimited'; percentUsed: number } | null>(null)

  useEffect(() => {
    fetch('/api/user/usage')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setSubscriptionTier(data.subscription.tier)
          setUsageData(data.usage)
        }
      })
      .catch(() => {})
  }, [])

  const {
    chats,
    projects,
    currentChatId,
    createChat,
    deleteChat,
    setCurrentChat,
    updateChatTitle,
    searchChats,
    createProject,
    deleteProject,
    updateProject,
    assignChatToProject,
  } = useChatStore()

  const filteredChats = searchQuery ? searchChats(searchQuery) : chats

  const handleDeleteChat = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete)
      setChatToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const handleStartEdit = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId)
    setEditingTitle(currentTitle)
  }

  const handleSaveEdit = () => {
    if (editingChatId && editingTitle.trim()) {
      updateChatTitle(editingChatId, editingTitle.trim())
      setEditingChatId(null)
      setEditingTitle('')
    }
  }

  const handleCancelEdit = () => {
    setEditingChatId(null)
    setEditingTitle('')
  }

  const handleNewChat = () => {
    const newChatId = createChat()
    setCurrentChat(newChatId)
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createProject(newFolderName.trim())
      setNewFolderName('')
      setNewFolderDialogOpen(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    const newCollapsed = new Set(collapsedFolders)
    if (newCollapsed.has(folderId)) {
      newCollapsed.delete(folderId)
    } else {
      newCollapsed.add(folderId)
    }
    setCollapsedFolders(newCollapsed)
  }

  const handleStartEditProject = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId)
    setEditingProjectName(currentName)
  }

  const handleSaveProjectEdit = () => {
    if (editingProjectId && editingProjectName.trim()) {
      updateProject(editingProjectId, { name: editingProjectName.trim() })
      setEditingProjectId(null)
      setEditingProjectName('')
    }
  }

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId)
  }

  // Group chats by project
  const chatsByProject = filteredChats.reduce((acc, chat) => {
    const key = chat.projectId || 'default'
    if (!acc[key]) acc[key] = []
    acc[key].push(chat)
    return acc
  }, {} as Record<string, typeof chats>)

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'w-72 bg-background border-r transition-all duration-300',
          'fixed inset-y-0 left-0 z-50 lg:relative lg:z-0',
          isOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:w-0 lg:translate-x-0 lg:overflow-hidden'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b px-4">
            <span className="font-semibold">Chats</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNewFolderDialogOpen(true)}
                title="New Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewChat}
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 pb-4">
              {/* Show folders first */}
              {projects.map((project) => {
                const folderChats = chats.filter(chat => chat.projectId === project.id)
                const isCollapsed = collapsedFolders.has(project.id)

                return (
                  <div key={project.id} className="space-y-1">
                    <div className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent">
                      <div
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => toggleFolder(project.id)}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <Folder className="h-4 w-4" />
                        {editingProjectId === project.id ? (
                          <Input
                            value={editingProjectName}
                            onChange={(e) => setEditingProjectName(e.target.value)}
                            onBlur={handleSaveProjectEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveProjectEdit()
                              if (e.key === 'Escape') {
                                setEditingProjectId(null)
                                setEditingProjectName('')
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 px-1 flex-1"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm font-medium flex-1">
                            {project.name} ({folderChats.length})
                          </span>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 flex-shrink-0 opacity-20 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleStartEditProject(project.id, project.name)}
                          >
                            <Edit className="mr-2 h-3 w-3" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {!isCollapsed && (
                      <div className="ml-6 space-y-1">
                        {folderChats.map((chat) => (
                          <div
                            key={chat.id}
                            className={cn(
                              'group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer overflow-hidden',
                              currentChatId === chat.id && 'bg-accent'
                            )}
                            onClick={() => setCurrentChat(chat.id)}
                          >
                            <MessageSquare className="h-4 w-4 flex-shrink-0" />
                            {editingChatId === chat.id ? (
                              <Input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit()
                                  if (e.key === 'Escape') handleCancelEdit()
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 px-1 flex-1"
                                autoFocus
                              />
                            ) : (
                              <span className="text-sm truncate flex-1 min-w-0">
                                {chat.title.split(' ').slice(0, 4).join(' ')}{chat.title.split(' ').length > 4 ? '...' : ''}
                              </span>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 flex-shrink-0 opacity-20 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStartEdit(chat.id, chat.title)
                                  }}
                                >
                                  <Edit className="mr-2 h-3 w-3" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    assignChatToProject(chat.id, undefined)
                                  }}
                                >
                                  <Archive className="mr-2 h-3 w-3" />
                                  Move out
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setChatToDelete(chat.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash className="mr-2 h-3 w-3" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Show chats without folders */}
              {Object.entries(chatsByProject).map(([projectId, projectChats]) => {
                const project = projects.find((p) => p.id === projectId)

                // Only show chats that don't have a project
                if (projectId !== 'default' || project) return null

                return (
                  <div key={projectId}>

                    <div className="space-y-1">
                      {projectChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={cn(
                            'group relative flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer overflow-hidden',
                            currentChatId === chat.id && 'bg-accent'
                          )}
                          onClick={() => setCurrentChat(chat.id)}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0" />

                          {editingChatId === chat.id ? (
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit()
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 px-1 flex-1"
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1 truncate text-sm min-w-0">
                              {chat.title.split(' ').slice(0, 4).join(' ')}{chat.title.split(' ').length > 4 ? '...' : ''}
                            </span>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 flex-shrink-0 opacity-20 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEdit(chat.id, chat.title)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              {projects.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Folder className="mr-2 h-4 w-4" />
                                    Move to Folder
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {projects.map((project) => (
                                      <DropdownMenuItem
                                        key={project.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          assignChatToProject(chat.id, project.id)
                                        }}
                                      >
                                        {project.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setChatToDelete(chat.id)
                                  setDeleteDialogOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Settings and Upgrade section at bottom */}
          <div className="border-t p-4 space-y-2">
            <SettingsPanel />

            {/* Mini usage bar for paid users */}
            {usageData && subscriptionTier && subscriptionTier !== 'free' && subscriptionTier !== 'developer' && usageData.tokenLimit !== 'unlimited' && (
              <div className="px-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{usageData.tokensUsed.toLocaleString()} used</span>
                  <span>{(usageData.tokenLimit as number).toLocaleString()} limit</span>
                </div>
                <Progress value={usageData.percentUsed} className="h-1.5" />
              </div>
            )}

            {/* Only show Upgrade button for free tier users */}
            {!isDeveloper && (!subscriptionTier || subscriptionTier === 'free') && (
              <Link href="/pricing" className="block">
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-gradient-to-r from-primary/10 to-primary/20 hover:from-primary/20 hover:to-primary/30 border-primary/20"
                >
                  <Crown className="h-4 w-4 text-primary" />
                  Upgrade Plan
                </Button>
              </Link>
            )}

            {isDeveloper && (
              <div className="text-center text-xs text-muted-foreground">
                <Crown className="h-3 w-3 text-primary inline-block mr-1" />
                Developer Mode
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this chat? This action cannot be undone.</p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChat}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="folder-name" className="text-sm font-medium">
                Folder Name
              </label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderDialogOpen(false)
                setNewFolderName('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}