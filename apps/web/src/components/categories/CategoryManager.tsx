'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  TrendingDown,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { categoriesClient, type Category, type CategoryType } from '@/services/categories.client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMOJI_PICKER = ['🛒','🍽️','🚗','🛍️','⚡','📺','💊','🎬','💼','📈','💻','🏠','✈️','🎓','🐾','👶','🏋️','💰','🎁','☕','🔧','📱','🧾','💲'];
const COLORS = ['#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#22C55E','#A855F7','#F97316','#0EA5E9','#6366F1','#78716C'];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// CategoryManager — connected to real Supabase data
// ---------------------------------------------------------------------------

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [formIcon, setFormIcon] = useState('🛒');
  const [formColor, setFormColor] = useState('#F59E0B');

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoriesClient.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento delle categorie');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Filtered lists
  const expenseCategories = categories.filter(c =>
    c.type === 'EXPENSE' && c.name.toLowerCase().includes(search.toLowerCase())
  );
  const incomeCategories = categories.filter(c =>
    c.type === 'INCOME' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormType('EXPENSE');
    setFormIcon('🛒');
    setFormColor('#F59E0B');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormType(cat.type as 'EXPENSE' | 'INCOME');
    setFormIcon(cat.icon || '🛒');
    setFormColor(cat.color || '#F59E0B');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await categoriesClient.update(editingId, {
          name: formName.trim(),
          icon: formIcon,
          color: formColor,
        });
        showFeedback('Categoria aggiornata!');
      } else {
        await categoriesClient.create({
          name: formName.trim(),
          slug: slugify(formName),
          type: formType as CategoryType,
          icon: formIcon,
          color: formColor,
        });
        showFeedback('Categoria creata!');
      }
      setShowModal(false);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await categoriesClient.delete(id);
      showFeedback('Categoria eliminata');
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella eliminazione');
    }
  };

  const renderCategoryList = (cats: Category[], title: string, icon: React.ReactNode) => (
    <Card className="p-5 rounded-2xl border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-[16px] font-medium text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">{cats.length}</Badge>
      </div>
      <div className="space-y-2">
        {cats.map(cat => (
          <div key={cat.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]" style={{ backgroundColor: `${cat.color || '#6b7280'}20` }}>
              {cat.icon || '📊'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">{cat.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#6b7280' }} />
                <span className="text-[11px] text-muted-foreground">
                  {cat.isSystem ? 'Sistema' : cat.isDefault ? 'Predefinita' : 'Personalizzata'}
                  {cat.expenseClass ? ` · ${cat.expenseClass === 'FIXED' ? 'Fissa' : 'Variabile'}` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {!cat.isSystem && !cat.isDefault && (
                <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {cats.length === 0 && (
          <p className="text-center text-[13px] text-muted-foreground py-6">Nessuna categoria trovata</p>
        )}
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-foreground">Gestione Categorie</h2>
          <p className="text-[13px] text-muted-foreground mt-1">Personalizza le categorie di spesa e entrata</p>
        </div>
        <Button
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl text-[13px]"
          onClick={openCreate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuova Categoria
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[13px] flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium flex items-center gap-2">
          <Check className="w-4 h-4" /> {feedback}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
        <Input
          placeholder="Cerca categorie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-xl border-border/50 bg-background"
        />
      </div>

      {/* Category lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCategoryList(expenseCategories, 'Categorie Spesa', <TrendingDown className="w-5 h-5 text-rose-500" />)}
        {renderCategoryList(incomeCategories, 'Categorie Entrata', <TrendingUp className="w-5 h-5 text-emerald-500" />)}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !isSaving && setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h3>
              <button onClick={() => !isSaving && setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Nome</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Es: Spesa Alimentare" className="rounded-xl border-border/50 bg-background" disabled={isSaving} />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Tipo</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormType('EXPENSE')}
                      disabled={isSaving}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'EXPENSE' ? 'bg-rose-500/10 text-rose-600 border-2 border-rose-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}
                    >
                      Spesa
                    </button>
                    <button
                      onClick={() => setFormType('INCOME')}
                      disabled={isSaving}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'INCOME' ? 'bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}
                    >
                      Entrata
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Icona</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PICKER.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setFormIcon(emoji)}
                      disabled={isSaving}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] transition-all ${formIcon === emoji ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-muted/30 hover:bg-muted/50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Colore</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      disabled={isSaving}
                      className={`w-8 h-8 rounded-full transition-all ${formColor === color ? 'ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]" style={{ backgroundColor: `${formColor}20` }}>
                  {formIcon}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{formName || 'Anteprima'}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: formColor }} />
                    <span className="text-[11px] text-muted-foreground">{formType === 'EXPENSE' ? 'Spesa' : 'Entrata'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)} disabled={isSaving}>Annulla</Button>
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                onClick={handleSave}
                disabled={!formName.trim() || isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Salva' : 'Crea'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
