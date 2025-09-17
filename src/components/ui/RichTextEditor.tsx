'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react'
import { Button } from './button'
import DOMPurify from 'dompurify'
import { useEffect, useCallback } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  hideUndoRedo?: boolean
}

// Export sanitization function for use when saving
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: []
  })
}

export function RichTextEditor({ content, onChange, placeholder, className = '', disabled = false, hideUndoRedo = false }: RichTextEditorProps) {
  // Pass HTML directly without sanitization during editing to prevent glitches
  // Sanitization should happen on save in the parent component
  const handleChange = useCallback((html: string) => {
    onChange(html)
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      handleChange(html)
    },
    editable: !disabled,
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[120px] p-3`,
        style: 'white-space: pre-wrap; word-wrap: break-word;'
      },
    },
  })

  // Update editor content when content prop changes
  // Only update if content is different to prevent cursor jumping
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className={`min-h-[180px] border rounded-md bg-gray-50 animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 border-b"></div>
        <div className="p-3">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-input rounded-md focus-within:border-primary focus-within:ring-0 ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-2 flex items-center gap-1 flex-wrap bg-gray-50 rounded-t-md">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        {!hideUndoRedo && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().chain().focus().undo().run() || disabled}
                className="h-8 w-8 p-0"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().chain().focus().redo().run() || disabled}
                className="h-8 w-8 p-0"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="relative rounded-b-md overflow-hidden bg-white">
        <EditorContent 
          editor={editor} 
          className="rich-text-editor-content"
        />
        {/* Placeholder */}
        {editor.isEmpty && placeholder && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none text-sm">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}