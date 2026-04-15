'use client';

import { useState } from 'react';
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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & demo data
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault: boolean;
}

const DEMO_CATEGORIES: Category[] = [
  { id: '1', name: 'Spesa Alimentare', type: 'expense', icon: '🛒', color: '#F59E0B', isDefault: true },
  { id: '2', name: 'Ristorazione', type: 'expense', icon: '🍽️', color: '#EF4444', isDefault: true },
  { id: '3', name: 'Trasporti', type: 'expense', icon: '🚗', color: '#3B82F6', isDefault: true },
  { id: '4', name: 'Shopping', type: 'expense', icon: '🛍️', color: '#8B5CF6', isDefault: true },
  { id: '5', name: 'Bollette', type: 'expense', icon: '⚡', color: '#EF4444', isDefault: true },
  { id: '6', name: 'Abbonamenti', type: 'expense', icon: '📺', color: '#EC4899', isDefault: true },
  { id: '7', name: 'Salute', type: 'expense', icon: '💊', color: '#14B8A6', isDefault: true },
  { id: '8', name: 'Intrattenimento', type: 'expense', icon: '🎬', color: '#A855F7', isDefault: true },
  { id: '9', name: 'Stipendio', type: 'income', icon: '💼', color: '#22C55E', isDefault: true },
  { id: '10', name: 'Investimenti', type: 'income', icon: '📈', color: '#3B82F6', isDefault: true },
  { id: '11', name: 'Freelance', type: 'income', icon: '💻', color: '#8B5CF6', isDefault: true },
];

const EMOJI_PICKER = ['🛒','🍽️','🚗','🛍️','⚡','📺','💊','🎬','💼','📈','💻','🏠','✈️','🎓','🐾','👶','🏋️','💰','🎁','☕','🔧','📱','🧾','💲'];

const COLORS = ['#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#22C55E','#A855F7','#F97316','#0EA5E9','#6366F1','#78716C'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CategoryManager() {
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formIcon, setFormIcon] = useState('🛒');
  const [formColor, setFormColor] = useState('#F59E0B');

  const expenseCategories = categories.filter(c => c.type === 'expense' && c.name.toLowerCase().includes(search.toLowerCase()));
  const incomeCategories = categories.filter(c => c.type === 'income' && c.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormType('expense');
    setFormIcon('🛒');
    setFormColor('#F59E0B');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormType(cat.type);
    setFormIcon(cat.icon);
    setFormColor(cat.color);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;

    if (editingId) {
      setCategories(prev => prev.map(c => c.id === editingId ? { ...c, name: formName, type: formType, icon: formIcon, color: formColor } : c));
      setFeedback('Categoria aggiornata!');
    } else {
      const newCat: Category = {
        id: `new-${Date.now()}`,
        name: formName.trim(),
        type: formType,
        icon: formIcon,
        color: formColor,
        isDefault: false,
      };
      setCategories(prev => [...prev, newCat]);
      setFeedback('Categoria creata!');
    }
    setShowModal(false);
    setTimeout(() => setFeedback(''), 2000);
  };

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setFeedback('Categoria eliminata');
    setTimeout(() => setFeedback(''), 2000);
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]" style={{ backgroundColor: `${cat.color}20` }}>
              {cat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">{cat.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[11px] text-muted-foreground">{cat.isDefault ? 'Predefinita' : 'Personalizzata'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/50 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {!cat.isDefault && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Nome</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Es: Spesa Alimentare" className="rounded-xl border-border/50 bg-background" />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormType('expense')}
                    className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'expense' ? 'bg-rose-500/10 text-rose-600 border-2 border-rose-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}
                  >
                    Spesa
                  </button>
                  <button
                    onClick={() => setFormType('income')}
                    className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${formType === 'income' ? 'bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/30' : 'bg-muted/50 text-muted-foreground border-2 border-transparent'}`}
                  >
                    Entrata
                  </button>
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Icona</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJI_PICKER.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setFormIcon(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[18px] transition-all ${formIcon === emoji ? 'bg-emerald-500/20 ring-2 ring-emerald-500' : 'bg-muted/30 hover:bg-muted/50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-muted-foreground/60 font-medium mb-1.5">Colore</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${formColor === color ? 'ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-xl bg-muted/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px]" style={{ backgroundColor: `${formColor}20` }}>
                  {formIcon}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{formName || 'Anteprima'}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: formColor }} />
                    <span className="text-[11px] text-muted-foreground">{formType === 'expense' ? 'Spesa' : 'Entrata'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Annulla</Button>
              <Button
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                onClick={handleSave}
                disabled={!formName.trim()}
              >
                {editingId ? 'Salva' : 'Crea'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
