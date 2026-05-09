import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getMedia, presignUpload, deleteMedia } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Trash2, Upload, Image as ImageIcon, FileVideo, File } from 'lucide-react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({ obj }) {
  const ext = obj.key.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(ext);
  const isVideo = ['mp4', 'webm'].includes(ext);

  if (isImage) {
    return (
      <img
        src={obj.publicUrl}
        alt={obj.key}
        className="w-full h-36 object-cover rounded-t-lg bg-muted"
        loading="lazy"
      />
    );
  }
  if (isVideo) {
    return (
      <div className="w-full h-36 rounded-t-lg bg-muted flex items-center justify-center text-muted-foreground">
        <FileVideo size={36} />
      </div>
    );
  }
  return (
    <div className="w-full h-36 rounded-t-lg bg-muted flex items-center justify-center text-muted-foreground">
      <File size={36} />
    </div>
  );
}

const ALLOWED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,video/mp4,video/webm,application/pdf';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export default function MediaPage() {
  const { token, user } = useAuth();
  const [media, setMedia]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // {name, percent}
  const [deleteTarget, setDeleteTarget]     = useState(null); // obj to confirm deletion
  const [deleting, setDeleting]     = useState(false);
  const [dragging, setDragging]     = useState(false);
  const fileInputRef                = useRef(null);

  const canDelete = ['owner', 'moderator'].includes(user?.role);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMedia(token);
      setMedia(data.objects || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function uploadFile(file) {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds the 50 MB limit.`);
      return;
    }

    setUploading(true);
    setUploadProgress({ name: file.name, percent: 0 });

    try {
      // Step 1: get presigned URL from worker
      const { uploadUrl, publicUrl } = await presignUpload(token, file.name, file.type);

      // Step 2: PUT file directly to R2 using presigned URL
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress({ name: file.name, percent: Math.round((e.loaded / e.total) * 100) });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(file);
      });

      toast.success(`${file.name} uploaded.`);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleFiles(files) {
    for (const file of files) {
      await uploadFile(file);
    }
  }

  function onFileInput(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = '';
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() { setDragging(false); }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard.');
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMedia(token, deleteTarget.key);
      toast.success(`${deleteTarget.key} deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Media</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>↻ Refresh</Button>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} className="mr-1.5" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES}
            multiple
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <ImageIcon size={28} className="mx-auto mb-2 opacity-50" />
        {uploading && uploadProgress ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">Uploading {uploadProgress.name}…</p>
            <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
            <p className="text-xs">{uploadProgress.percent}%</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
            <p className="text-xs mt-1">Images, videos, PDFs — max 50 MB each</p>
          </>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center py-16 text-muted-foreground">Loading…</p>
      ) : !media.length ? (
        <p className="text-center py-16 text-muted-foreground">No files yet. Upload one above.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {media.map(obj => (
            <div
              key={obj.key}
              className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <FilePreview obj={obj} />
              <div className="p-2 flex-1 flex flex-col gap-1.5">
                <p
                  className="text-xs font-medium text-gray-700 truncate"
                  title={obj.key}
                >
                  {obj.key.split('/').pop()}
                </p>
                <p className="text-xs text-muted-foreground">{obj.sizeFormatted}</p>
                <div className="flex gap-1 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs px-2"
                    onClick={() => copyUrl(obj.publicUrl)}
                    title="Copy URL"
                  >
                    <Copy size={11} className="mr-1" />
                    Copy URL
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(obj)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground break-all">
            <span className="font-medium text-foreground">{deleteTarget?.key}</span>
            <br />
            This will permanently remove the file from R2. Any content that references
            this URL will show a broken image.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
