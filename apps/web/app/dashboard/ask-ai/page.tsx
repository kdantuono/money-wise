'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  TrendingUp,
  Receipt,
  PiggyBank,
  Wallet,
  Bot,
  User,
  ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type AgentTopic = 'general' | 'investments' | 'expenses' | 'savings' | 'accounts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Mock Data (from Figma) ───────────────────────────────────

const agents: {
  id: AgentTopic;
  label: string;
  icon: typeof Sparkles;
  color: string;
  desc: string;
}[] = [
  {
    id: 'general',
    label: 'Assistente Generale',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    desc: 'Domande generali sulle tue finanze',
  },
  {
    id: 'investments',
    label: 'Consulente Investimenti',
    icon: TrendingUp,
    color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    desc: 'Analisi portafoglio, crypto e azioni',
  },
  {
    id: 'expenses',
    label: 'Analista Spese',
    icon: Receipt,
    color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
    desc: 'Ottimizzazione costi e budget',
  },
  {
    id: 'savings',
    label: 'Coach Risparmio',
    icon: PiggyBank,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    desc: 'Strategie di risparmio e obiettivi',
  },
  {
    id: 'accounts',
    label: 'Gestore Conti',
    icon: Wallet,
    color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    desc: 'Gestione conti e movimenti',
  },
];

const mockResponses: Record<AgentTopic, string[]> = {
  general: [
    "Analizzando la tua situazione finanziaria complessiva, hai un patrimonio di €100.447,63 con un trend positivo del +8.2%. Il tuo tasso di risparmio del 34.5% è eccellente, ben sopra la media italiana. Ti suggerisco di mantenere questa disciplina e considerare di aumentare la diversificazione del portafoglio investimenti.",
    "Il tuo punteggio di salute finanziaria è 82/100. I punti forti sono risparmio e investimenti. L'area di miglioramento principale sono le spese per ristorazione, che sono aumentate del 35% rispetto al mese scorso.",
  ],
  investments: [
    "Il tuo portafoglio crypto sta performando molto bene con un +30.38% su BTC e +48.02% su SOL. Tuttavia, rappresenta il 76% del tuo portafoglio investimenti, il che è un rischio elevato. Consiglio di ribilanciare verso un 50% crypto, 30% azioni, 20% ETF per un profilo di rischio più equilibrato.",
    "Apple (AAPL) ha mostrato una crescita solida dell'8.18%. Considerando il rapporto P/E attuale, potrebbe essere un buon momento per accumulare. Microsoft (MSFT) con +7.17% è anch'essa in trend positivo. Il tuo ETF Vanguard S&P 500 fornisce stabilità con il +6.03%.",
  ],
  expenses: [
    "Le tue spese mensili ammontano a €1.487,23. I costi fissi (€1.135,97) rappresentano il 76% delle uscite, il che è nella norma. Le spese variabili (€351,26) sono sotto controllo. Ti consiglio di monitorare le spese per ristorazione (€165,30) che sono al 83% del budget allocato.",
    "Ho identificato potenziali risparmi: 1) Pacchetto Netflix+Spotify combinato: -€5/mese, 2) Cambio assicurazione auto online: -€15/mese, 3) Contratto luce a prezzo fisso: -€10/mese stimati. Totale risparmo potenziale: €30/mese = €360/anno.",
  ],
  savings: [
    "Ottimo lavoro! Questo mese hai risparmiato il 34.5% del reddito, superando l'obiettivo del 10%. Il tuo conto risparmio ha €12.340,50. Ti suggerisco di impostare un obiettivo a 6 mesi di €15.000 per il fondo emergenza (circa 5 mesi di spese). Sei già al 82% dell'obiettivo!",
    "Strategia consigliata: 1) Mantieni il fondo emergenza pari a 3-6 mesi di spese (€4.500-9.000), 2) Investi l'eccedenza in ETF con PAC mensile di €300, 3) Imposta un trasferimento automatico del 20% dello stipendio verso il conto risparmio appena arriva.",
  ],
  accounts: [
    "Hai 4 conti attivi. Il Conto Corrente Principale (€4.567,89) gestisce la maggior parte delle operazioni. La Carta di Credito mostra un saldo di -€1.234,56 che consiglio di saldare prima della scadenza per evitare interessi. Il Contante (€450) potrebbe essere depositato per generare interessi.",
    "Analisi movimenti: 10 transazioni questo mese, di cui 8 in uscita e 2 in entrata. Il rapporto entrate/uscite è positivo (4.350/1.487 = 2.92x). Consiglio di consolidare le spese su un unico conto per semplificare il tracciamento.",
  ],
};

const quickQuestions: Record<AgentTopic, string[]> = {
  general: [
    'Come sta la mia situazione finanziaria?',
    'Qual è il mio punteggio di salute?',
    'Dammi un riepilogo mensile',
  ],
  investments: [
    'Come sta il mio portafoglio?',
    'Devo vendere crypto?',
    'Quali azioni comprare?',
  ],
  expenses: ['Dove spendo troppo?', 'Come posso risparmiare?', 'Analizza le mie bollette'],
  savings: ['Quanto ho risparmiato?', 'Obiettivo fondo emergenza', 'Strategia di risparmio'],
  accounts: ['Analisi movimenti', 'Quale conto rende di più?', 'Saldo complessivo'],
};

// ─── Page Component ───────────────────────────────────────────

export default function AskAIPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentTopic | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Cancel any pending AI response timeout when unmounting or switching agents
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []);

  const selectAgent = (topic: AgentTopic) => {
    setSelectedAgent(topic);
    const agent = agents.find((a) => a.id === topic)!;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Ciao! Sono il tuo ${agent.label}. Come posso aiutarti oggi? Puoi farmi qualsiasi domanda su ${agent.desc.toLowerCase()}.`,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !selectedAgent) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Cancel any previous pending response
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      const responses = mockResponses[selectedAgent];
      const response = responses[Math.floor(Math.random() * responses.length)];
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      typingTimeoutRef.current = null;
    }, 1200 + Math.random() * 800);
  };

  // Agent Selection Screen
  if (!selectedAgent) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-purple-100 dark:bg-purple-900 rounded-2xl mb-4">
            <Sparkles className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">AskAI</h1>
          <p className="text-muted-foreground mt-2">
            Scegli un agente specializzato per ricevere consigli personalizzati
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className="p-5 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                onClick={() => selectAgent(agent.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl ${agent.color}`}>
                    <agent.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                      {agent.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{agent.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 transition-colors mt-1" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  const currentAgent = agents.find((a) => a.id === selectedAgent)!;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      {/* Chat Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button
          onClick={() => {
            setSelectedAgent(null);
            setMessages([]);
          }}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className={`p-2 rounded-xl ${currentAgent.color}`}>
          <currentAgent.icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">{currentAgent.label}</h3>
          <p className="text-xs text-muted-foreground">{currentAgent.desc}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? currentAgent.color : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}
              >
                {msg.role === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${currentAgent.color}`}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickQuestions[selectedAgent].map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm text-foreground transition-colors whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Chiedi qualcosa..."
            className="flex-1 bg-muted/50 border border-border rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim()}
            className="p-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
