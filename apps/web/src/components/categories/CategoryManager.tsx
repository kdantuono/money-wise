'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Tag,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { categoriesClient, type Category, type CategoryType } from '@/services/categories.client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLORS = ['#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#22C55E','#A855F7','#F97316','#0EA5E9','#6366F1','#78716C'];

// Heroicons name → emoji mapping (matches DB icon field values)
const ICON_MAP: Record<string, string> = {
  'shopping-cart': '🛒', 'utensils': '🍴', 'coffee': '☕', 'wine': '🍷', 'pizza': '🍕', 'apple': '🍎',
  'car': '🚗', 'plane': '✈️', 'airplane': '✈️', 'train': '🚂', 'bus': '🚌', 'bike': '🚲', 'fuel': '⛽', 'truck': '🚚',
  'film': '🎬', 'music': '🎵', 'tv': '📺', 'gamepad': '🎮', 'ticket': '🎫', 'play': '▶️',
  'shopping-bag': '🛍️', 'shirt': '👕', 'gift': '🎁', 'tag': '🏷️',
  'home': '🏠', 'bolt': '⚡', 'droplet': '💧', 'wifi': '📶', 'phone': '📱', 'wrench': '🔧', 'key': '🔑',
  'heart': '❤️', 'pill': '💊', 'activity': '💪', 'scissors': '✂️', 'sparkles': '✨',
  'wallet': '💰', 'piggy-bank': '🐷', 'credit-card': '💳', 'bank': '🏦', 'coins': '🪙',
  'trending-up': '📈', 'trending-down': '📉', 'chart-bar': '📊', 'currency-dollar': '💲', 'percent': '💹', 'banknotes': '💵',
  'book': '📚', 'graduation-cap': '🎓', 'academic-cap': '🎓', 'briefcase': '💼', 'laptop': '💻', 'pen': '✏️',
  'map': '🗺️', 'compass': '🧭', 'camera': '📷', 'umbrella': '☂️',
  'arrow-right-left': '↔️', 'repeat': '🔄', 'send': '📤', 'download': '📥', 'arrow-uturn-left': '↩️',
  'document-text': '📄', 'building-storefront': '🏪', 'shield-check': '🛡️', 'receipt-percent': '🧾',
  'building-library': '🏛️', 'building-office': '🏢', 'medical-bag': '🏥', 'dumbbell': '🏋️',
  'computer-desktop': '🖥️', 'fire': '🔥', 'paw': '🐾', 'child': '👶', 'user': '👤',
  'parking': '🅿️', 'question-mark-circle': '❓', 'plus-circle': '➕', 'star': '⭐',
  'circle': '⚪', 'folder': '📁', 'flag': '🚩',
};

function getIconEmoji(iconName: string | null): string {
  if (!iconName) return '📊';
  return ICON_MAP[iconName.toLowerCase()] || iconName;
}

const EMOJI_PICKER = [...new Set(Object.values(ICON_MAP))];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// CategoryManager — 1:1 Figma Settings Categories tab
// ---------------------------------------------------------------------------

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoriesClient.getAll();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel caricamento');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Split categories
  const defaultCategories = categories.filter(c => c.isDefault || c.isSystem);
  const customCategories = categories.filter(c => !c.isDefault && !c.isSystem);

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
    setFormIcon(getIconEmoji(cat.icon));
    setFormColor(cat.color || '#F59E0B');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await categoriesClient.update(editingId, { name: formName.trim(), icon: formIcon, color: formColor });
        showFeedback('Categoria aggiornata!');
      } else {
        await categoriesClient.create({ name: formName.trim(), slug: slugify(formName), type: formType as CategoryType, icon: formIcon, color: formColor });
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

  if (isLoading) {
    return (
      <Card className="p-6 rounded-2xl border-0 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 rounded-2xl border-0 shadow-sm">
        {/* Header — 1:1 Figma */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[18px] font-medium text-foreground">Gestione Categorie</h3>
            <p className="text-[13px] text-muted-foreground mt-1">Personalizza le categorie di spesa e entrata</p>
          </div>
          <Button
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-0 rounded-xl"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Categoria
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[13px] mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="p-1"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[13px] font-medium mb-4 flex items-center gap-2">
            <Check className="w-4 h-4" /> {feedback}
          </div>
        )}

        {/* Default/System Categories — Figma grid */}
        <div className="mb-8">
          <h4 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            Categorie Predefinite
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {defaultCategories.map((cat) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shadow-sm group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${cat.color || '#6b7280'}15`, border: `2px solid ${cat.color || '#6b7280'}30` }}
                  >
                    {getIconEmoji(cat.icon)}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-foreground">{cat.name}</p>
                    <p className="text-[11px] text-muted-foreground">{cat.type === 'EXPENSE' ? 'Spesa' : 'Entrata'}
                      {cat.expenseClass ? ` · ${cat.expenseClass === 'FIXED' ? 'Fissa' : 'Variabile'}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px]" style={{ backgroundColor: cat.color || '#6b7280', color: 'white' }}>
                    {cat.type === 'EXPENSE' ? 'Spesa' : 'Entrata'}
                  </Badge>
                  <button
                    onClick={() => openEdit(cat)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted/50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Custom Categories — Figma style */}
        <div>
          <h4 className="text-[14px] font-medium text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Categorie Personalizzate
          </h4>
          {customCategories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customCategories.map((cat) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] shadow-sm group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${cat.color || '#6b7280'}15`, border: `2px solid ${cat.color || '#6b7280'}30` }}
                    >
                      {getIconEmoji(cat.icon)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-foreground">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground">{cat.type === 'EXPENSE' ? 'Spesa' : 'Entrata'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-purple-500 text-white">Custom</Badge>
                    <button
                      onClick={() => openEdit(cat)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted/50"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-xl border-2 border-dashed border-border">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-[13px] text-muted-foreground">Nessuna categoria personalizzata</p>
              <p className="text-[11px] text-muted-foreground mt-1">Crea la tua prima categoria custom!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Create/Edit Modal */}
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
                    <button onClick={() => setFormType('EXPENSE')} disabled={isSaving}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'EXPENSE' ? 'bg-rose-500/10 text-rose-600 border-2 border-rose-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}>
                      Spesa
                    </button>
                    <button onClick={() => setFormType('INCOME')} disabled={isSaving}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'INCOME' ? 'bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}>
                      Entrata
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Icona</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PICKER.map(emoji => (
                    <button key={emoji} onClick={() => setFormIcon(emoji)} disabled={isSaving}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] transition-all ${formIcon === emoji ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-muted/30 hover:bg-muted/50'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Colore</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button key={color} onClick={() => setFormColor(color)} disabled={isSaving}
                      className={`w-8 h-8 rounded-full transition-all ${formColor === color ? 'ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px]"
                  style={{ backgroundColor: `${formColor}15`, border: `2px solid ${formColor}30` }}>
                  {formIcon}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-foreground">{formName || 'Anteprima'}</p>
                  <p className="text-[11px] text-muted-foreground">{formType === 'EXPENSE' ? 'Spesa' : 'Entrata'}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)} disabled={isSaving}>Annulla</Button>
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                onClick={handleSave} disabled={!formName.trim() || isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingId ? 'Salva' : 'Crea'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
