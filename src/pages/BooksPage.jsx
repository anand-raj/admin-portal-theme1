import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { getBooks, createBook, updateBook, uploadBookImage } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

const EMPTY = { title: '', author: '', price: '', description: '', stock: '' };

export default function BooksPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new, else book object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setBooks(await getBooks(token));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setImageFile(null);
    setImagePreview(null);
    setOpen(true);
  }

  function openEdit(book) {
    setEditing(book);
    setForm({ title: book.title, author: book.author ?? '', price: book.price, description: book.description ?? '', stock: book.stock ?? '' });
    setImageFile(null);
    setImagePreview(book.image_url ?? null);
    setOpen(true);
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.title || !form.price) {
      toast.error('Title and price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: form.stock !== '' ? Number(form.stock) : undefined };
      if (editing) {
        await updateBook(token, editing.id, payload);
        if (imageFile) await uploadBookImage(token, editing.id, imageFile);
        toast.success('Book updated.');
      } else {
        const { id } = await createBook(token, payload);
        if (imageFile) await uploadBookImage(token, id, imageFile);
        toast.success('Book added.');
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Books</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>↻ Refresh</Button>
          <Button size="sm" onClick={openNew}>+ Add Book</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cover</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Price (₹)</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!loading && !books.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No books yet.</TableCell></TableRow>
            )}
            {books.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  {b.image_url
                    ? <img src={b.image_url} alt={b.title} className="h-12 w-10 object-cover rounded" />
                    : <div className="h-12 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">—</div>
                  }
                </TableCell>
                <TableCell className="font-medium">{b.title}</TableCell>
                <TableCell className="text-muted-foreground">{b.author ?? '—'}</TableCell>
                <TableCell>₹{b.price}</TableCell>
                <TableCell>{b.stock ?? '—'}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => openEdit(b)}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Book' : 'Add Book'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { name: 'title', label: 'Title', required: true },
              { name: 'author', label: 'Author' },
              { name: 'price', label: 'Price (₹)', type: 'number', required: true },
              { name: 'stock', label: 'Stock', type: 'number' },
              { name: 'description', label: 'Description' },
            ].map(({ name, label, type = 'text' }) => (
              <div key={name} className="space-y-1">
                <Label htmlFor={name}>{label}</Label>
                <Input id={name} name={name} type={type} value={form[name]} onChange={handleChange} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Cover Image</Label>
              {imagePreview && (
                <img src={imagePreview} alt="Cover preview" className="h-24 w-20 object-cover rounded border mb-1" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {imagePreview ? 'Change image' : 'Upload image'}
              </Button>
              <p className="text-xs text-muted-foreground">JPEG, PNG, WebP or GIF — max 2 MB</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
