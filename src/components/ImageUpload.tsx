import { useRef, useState } from 'react'
import { useConvexMutation } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import { toast } from 'sonner'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

const errorMessages: Record<string, string> = {
  too_large: 'Image is larger than 20 MB',
  invalid_type: 'Use a PNG, JPEG, WEBP or GIF image',
  insufficient_role: 'Admins or owners only',
}

function errorCode(err: unknown): string | null {
  if (!(err instanceof ConvexError)) return null
  const data = err.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && 'code' in data) {
    return (data as { code: string }).code
  }
  return null
}

export function ImageUpload({
  currentUrl,
  shape = 'square',
  onPicked,
  onRemove,
  disabled,
  label = 'Upload image',
}: {
  currentUrl: string | null
  shape?: 'square' | 'circle'
  onPicked: (storageId: Id<'_storage'>) => Promise<void>
  onRemove?: () => Promise<void>
  disabled?: boolean
  label?: string
}) {
  const generateUploadUrl = useConvexMutation(api.files.generateUploadUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error('Image is larger than 20 MB')
      return
    }
    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error('Use a PNG, JPEG, WEBP or GIF image')
      return
    }
    setUploading(true)
    try {
      const url = await generateUploadUrl({})
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) {
        toast.error('Upload failed')
        return
      }
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      await onPicked(storageId)
      toast.success('Image updated')
    } catch (err) {
      const code = errorCode(err) ?? ''
      toast.error(errorMessages[code] ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function openPicker() {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || uploading}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) void handleFile(file)
        }}
        className={cn(
          'bg-muted text-muted-foreground border-input flex h-20 w-20 items-center justify-center overflow-hidden border-2 border-dashed text-xs transition-colors',
          shape === 'circle' ? 'rounded-full' : 'rounded-md',
          dragOver && 'border-primary bg-primary/10',
          (disabled || uploading) && 'cursor-not-allowed opacity-60',
        )}
        aria-label={label}
      >
        {uploading ? (
          'Uploading…'
        ) : currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          'Drop or click'
        )}
      </button>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openPicker}
          disabled={disabled || uploading}
        >
          {currentUrl ? 'Replace' : 'Upload'}
        </Button>
        {currentUrl && onRemove && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={async () => {
              setUploading(true)
              try {
                await onRemove()
                toast.success('Image removed')
              } catch {
                toast.error('Could not remove')
              } finally {
                setUploading(false)
              }
            }}
            disabled={disabled || uploading}
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          if (e.target) e.target.value = ''
        }}
      />
    </div>
  )
}
