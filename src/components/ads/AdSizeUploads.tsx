import FileUpload from '@/components/admin/FileUpload';
import { AD_FORMATS, type CreativeVariants } from '@/lib/ads/formats';

export default function AdSizeUploads({ value, onChange }: { value: CreativeVariants; onChange: (value: CreativeVariants) => void }) {
  return <section className="space-y-3">
    <h3 className="font-semibold">Display sizes</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      {AD_FORMATS.map((format) => <div key={format.key} className="min-w-0 border-b border-border pb-4">
        <FileUpload bucket="uploads" folder={`ads/${format.key}`} accept="image/*" showUrlInput={false} expectedSize={format} label={`${format.label} · ${format.key}`} sizeHint={`${format.width} × ${format.height}px`} value={value[format.key] ?? ''}
          onChange={(url) => { const next = { ...value }; if (url) next[format.key] = url; else delete next[format.key]; onChange(next); }} />
      </div>)}
    </div>
  </section>;
}