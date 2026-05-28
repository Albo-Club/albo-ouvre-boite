import { useRef, useState } from 'react'
import { useConvexMutation } from '@convex-dev/react-query'
import { ConvexError } from 'convex/values'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

const MAX_BYTES = 20 * 1024 * 1024
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const KNOWN_ERRORS = ['too_large', 'invalid_type', 'insufficient_role']

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
  label,
}: {
  currentUrl: string | null
  shape?: 'square' | 'circle'
  onPicked: (storageId: Id<'_storage'>) => Promise<void>
  onRemove?: () => Promise<void>
  disabled?: boolean
  label?: string
}) {
  const { t } = useTranslation('common')
  const generateUploadUrl = useConvexMutation(api.files.generateUploadUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const resolvedLabel = label ?? t('imageUpload.label')

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error(t('imageUpload.errors.too_large'))
      return
    }
    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error(t('imageUpload.errors.invalid_type'))
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
        toast.error(t('imageUpload.uploadFailed'))
        return
      }
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      await onPicked(storageId)
      toast.success(t('imageUpload.updated'))
    } catch (err) {
      const code = errorCode(err) ?? ''
      toast.error(
        KNOWN_ERRORS.includes(code)
          ? t(`imageUpload.errors.${code}`)
          : t('imageUpload.uploadFailed'),
      )
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
          const file = e.dataTransfer.files.item(0)
          if (file) void handleFile(file)
        }}
        className={cn(
          'bg-muted text-muted-foreground border-input flex h-20 w-20 items-center justify-center overflow-hidden border-2 border-dashed text-xs transition-colors',
          shape === 'circle' ? 'rounded-full' : 'rounded-md',
          dragOver && 'border-primary bg-primary/10',
          (disabled || uploading) && 'cursor-not-allowed opacity-60',
        )}
        aria-label={resolvedLabel}
      >
        {uploading ? (
          t('imageUpload.uploading')
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          t('imageUpload.dropOrClick')
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
          {currentUrl ? t('imageUpload.replace') : t('imageUpload.upload')}
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
                toast.success(t('imageUpload.removed'))
              } catch {
                toast.error(t('imageUpload.couldNotRemove'))
              } finally {
                setUploading(false)
              }
            }}
            disabled={disabled || uploading}
          >
            {t('actions.remove')}
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
          e.target.value = ''
        }}
      />
    </div>
  )
}
