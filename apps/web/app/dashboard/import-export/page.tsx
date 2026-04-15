'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  FileJson,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Eye,
} from 'lucide-react';

const IMPORT_FORMATS = [
  { id: 'csv', label: 'CSV', Icon: FileText, desc: 'Comma-separated values', ext: '.csv', color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' },
  { id: 'xlsx', label: 'Excel', Icon: FileSpreadsheet, desc: 'Microsoft Excel', ext: '.xlsx, .xls', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' },
  { id: 'json', label: 'JSON', Icon: FileJson, desc: 'JavaScript Object Notation', ext: '.json', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' },
  { id: 'ofx', label: 'OFX/QFX', Icon: FileText, desc: 'Open Financial Exchange', ext: '.ofx, .qfx', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' },
];

const EXPORT_FORMATS = [
  { id: 'csv', label: 'CSV', Icon: FileText },
  { id: 'xlsx', label: 'Excel', Icon: FileSpreadsheet },
  { id: 'json', label: 'JSON', Icon: FileJson },
  { id: 'pdf', label: 'PDF Report', Icon: FileText },
];

const EXPORT_DATA_TYPES = [
  { id: 'transactions', label: 'Transazioni', desc: 'Tutte le transazioni' },
  { id: 'accounts', label: 'Conti', desc: 'Dettagli conti e carte' },
  { id: 'investments', label: 'Investimenti', desc: 'Portafoglio completo' },
  { id: 'budget', label: 'Budget', desc: 'Categorie e allocazioni' },
  { id: 'all', label: 'Tutto', desc: 'Export completo di tutti i dati' },
];

const MOCK_PREVIEW = [
  { date: '2026-03-01', description: 'Stipendio Marzo', amount: 3500, category: 'Stipendio', type: 'Entrata' as const },
  { date: '2026-03-03', description: 'Spesa Conad', amount: -45.30, category: 'Alimentari', type: 'Uscita' as const },
  { date: '2026-03-05', description: 'Bolletta Gas', amount: -78.50, category: 'Utenze', type: 'Uscita' as const },
  { date: '2026-03-07', description: 'Amazon', amount: -29.99, category: 'Shopping', type: 'Uscita' as const },
  { date: '2026-03-10', description: 'Ristorante', amount: -42.00, category: 'Ristorazione', type: 'Uscita' as const },
];

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [importStep, setImportStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);
  const [exportDataType, setExportDataType] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setImportStep(2);
    setFeedback('File caricato con successo!');
  };

  const handleFileSelect = () => {
    setImportStep(2);
    setFeedback('File caricato con successo!');
  };

  const handleImportConfirm = () => {
    setImportStep(4);
    setFeedback('5 transazioni importate con successo!');
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setFeedback(`Export ${exportDataType} in formato ${exportFormat?.toUpperCase()} completato!`);
    }, 1500);
  };

  const resetImport = () => {
    setImportStep(0);
    setSelectedFormat(null);
    setFeedback(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import / Export</h1>
        <p className="text-muted-foreground mt-1">Importa transazioni o esporta i tuoi dati</p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900">
            <X className="w-4 h-4 text-emerald-600" />
          </button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
            activeTab === 'import' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <Upload className="w-4 h-4" /> Importa
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
            activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <Download className="w-4 h-4" /> Esporta
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'import' ? (
          <motion.div key="import" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Progress steps */}
            <div className="flex items-center gap-2">
              {['Formato', 'Carica', 'Anteprima', 'Mapping', 'Completato'].map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= importStep ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i < importStep ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden md:block ${i <= importStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {i < 4 && <div className={`w-8 h-0.5 ${i < importStep ? 'bg-blue-600' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>

            {/* Step 0: Select format */}
            {importStep === 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Seleziona il formato del file</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {IMPORT_FORMATS.map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelectedFormat(f.id); setImportStep(1); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md ${
                        selectedFormat === f.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl ${f.color} w-fit mb-3`}>
                        <f.Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-foreground">{f.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{f.ext}</Badge>
                    </motion.button>
                  ))}
                </div>

                {/* AI suggestion */}
                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Suggerimento AI</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                        La maggior parte delle banche italiane (Intesa, Unicredit, BNL) esportano in formato CSV o OFX.
                        Accedi al tuo home banking e cerca &quot;Esporta movimenti&quot; per scaricare il file.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 1: Upload */}
            {importStep === 1 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Carica il file</h3>
                  <button onClick={resetImport} className="text-sm text-blue-600 hover:underline">&larr; Cambia formato</button>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                    isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-300'
                  }`}
                >
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h4 className="font-semibold text-foreground mb-1">Trascina il file qui</h4>
                  <p className="text-sm text-muted-foreground mb-4">oppure</p>
                  <Button onClick={handleFileSelect} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Seleziona File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Formato: {IMPORT_FORMATS.find(f => f.id === selectedFormat)?.ext} &bull; Max 10MB
                  </p>
                </div>
              </Card>
            )}

            {/* Step 2: Preview */}
            {importStep === 2 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-foreground">Anteprima Dati</h3>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    5 transazioni trovate
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Data</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Descrizione</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Importo</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Categoria</th>
                        <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_PREVIEW.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 px-4 text-foreground">{row.date}</td>
                          <td className="py-3 px-4 text-foreground">{row.description}</td>
                          <td className={`py-3 px-4 font-semibold ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            &euro;{Math.abs(row.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{row.category}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={row.type === 'Entrata' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {row.type}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI Auto-categorization */}
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      Categorizzazione AI Automatica
                    </span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    L&apos;AI ha categorizzato automaticamente 5/5 transazioni. Puoi modificare le categorie nella tabella prima di confermare.
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={resetImport}>Annulla</Button>
                  <Button onClick={() => setImportStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Conferma Mapping <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 3: Column Mapping */}
            {importStep === 3 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Mapping Colonne</h3>
                <p className="text-sm text-muted-foreground mb-6">Verifica che le colonne siano mappate correttamente</p>

                <div className="space-y-4">
                  {[
                    { source: 'date', target: 'Data Transazione' },
                    { source: 'description', target: 'Descrizione' },
                    { source: 'amount', target: 'Importo (\u20AC)' },
                    { source: 'category', target: 'Categoria' },
                  ].map((m) => (
                    <div key={m.source} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
                      <div className="flex-1 p-2 bg-card rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground">Colonna file</p>
                        <p className="font-medium text-foreground">{m.source}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1">
                        <select className="w-full p-2 bg-card border border-border rounded-xl text-sm text-foreground">
                          <option>{m.target}</option>
                        </select>
                      </div>
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-muted/30 rounded-xl">
                  <label className="flex items-center gap-2">
                    <select className="p-2 bg-card border border-border rounded-xl text-sm text-foreground">
                      <option>Conto Corrente Principale</option>
                      <option>Conto Risparmio</option>
                      <option>Carta di Credito</option>
                    </select>
                    <span className="text-sm text-muted-foreground">Conto destinazione</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="outline" onClick={() => setImportStep(2)}>Indietro</Button>
                  <Button onClick={handleImportConfirm} className="bg-green-600 hover:bg-green-700 text-white">
                    <Check className="w-4 h-4 mr-2" /> Importa Transazioni
                  </Button>
                </div>
              </Card>
            )}

            {/* Step 4: Done */}
            {importStep === 4 && (
              <Card className="p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Import Completato!</h3>
                <p className="text-muted-foreground mb-4">5 transazioni importate con successo nel tuo conto</p>
                <div className="flex items-center justify-center gap-1 text-cyan-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">+10 diamanti guadagnati</span>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="outline" onClick={resetImport}>Nuovo Import</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Vai alle Transazioni</Button>
                </div>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div key="export" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Select data */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Cosa vuoi esportare?</h3>
                <div className="space-y-3">
                  {EXPORT_DATA_TYPES.map((dt) => (
                    <button
                      key={dt.id}
                      onClick={() => setExportDataType(dt.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                        exportDataType === dt.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{dt.label}</p>
                        <p className="text-xs text-muted-foreground">{dt.desc}</p>
                      </div>
                      {exportDataType === dt.id && <Check className="w-5 h-5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Select format */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">In quale formato?</h3>
                <div className="space-y-3">
                  {EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setExportFormat(f.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                        exportFormat === f.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <div className="p-2 bg-muted rounded-xl">
                        <f.Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <span className="font-semibold text-foreground">{f.label}</span>
                      {exportFormat === f.id && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleExport}
                  disabled={!exportFormat || !exportDataType || exporting}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-6"
                >
                  {exporting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <><Download className="w-4 h-4 mr-2" /> Esporta Dati</>
                  )}
                </Button>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
