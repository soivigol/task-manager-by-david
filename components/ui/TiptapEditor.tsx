'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useCallback } from 'react'
import type { JSONContent } from '@tiptap/react'

interface TiptapEditorProps {
  content: JSONContent | null
  onChange: (content: JSONContent) => void
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors ${
        active
          ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
      }),
    ],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[80px] text-[13px] focus:outline-none [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2 [&_p]:my-0.5 [&_ul]:my-1 [&_ul]:pl-4 [&_li]:text-[13px]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON())
    },
  })

  // Sync content from parent when it changes externally (e.g., modal reopen)
  useEffect(() => {
    if (!editor) return
    const currentJSON = JSON.stringify(editor.getJSON())
    const newJSON = JSON.stringify(
      content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
    )
    if (currentJSON !== newJSON) {
      editor.commands.setContent(
        content ?? { type: 'doc', content: [{ type: 'paragraph' }] }
      )
    }
  }, [content, editor])

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run()
  }, [editor])

  const toggleHeading = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-500">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        <ToolbarButton
          onClick={toggleBold}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleItalic}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleBulletList}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          &bull; List
        </ToolbarButton>
        <ToolbarButton
          onClick={toggleHeading}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
