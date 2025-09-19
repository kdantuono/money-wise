import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  CreditCard,
  Eye,
  EyeOff,
  MoreHorizontal,
  Zap,
  Shield,
  TrendingUp,
  Star
} from "lucide-react";

// Enhanced card data with more realistic information
const cardData = [
  {
    id: 1,
    cardNumber: "3778 **** **** 1234",
    fullNumber: "3778 2134 5678 1234",
    holderName: "Eddy Cusuma",
    expiryDate: "12/26",
    balance: 15756.50,
    cardType: "Premium",
    bankName: "Chase Bank",
    color: {
      from: "from-gradient-start",
      to: "to-gradient-end",
      gradient: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)"
    },
    isMain: true,
    limit: 50000,
    available: 34243.50,
    rewards: 1840,
    status: "active"
  },
  {
    id: 2,
    cardNumber: "4532 **** **** 8901",
    fullNumber: "4532 1098 7654 8901",
    holderName: "Eddy Cusuma",
    expiryDate: "09/27",
    balance: 8432.75,
    cardType: "Cashback",
    bankName: "Bank of America",
    color: {
      from: "from-white",
      to: "to-gray-100",
      gradient: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)"
    },
    isMain: false,
    limit: 25000,
    available: 16567.25,
    rewards: 642,
    status: "active"
  },
  {
    id: 3,
    cardNumber: "5412 **** **** 3456",
    fullNumber: "5412 3456 7890 3456",
    holderName: "Eddy Cusuma",
    expiryDate: "03/28",
    balance: 2150.00,
    cardType: "Travel",
    bankName: "American Express",
    color: {
      from: "from-emerald-600",
      to: "to-emerald-800",
      gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)"
    },
    isMain: false,
    limit: 15000,
    available: 12850.00,
    rewards: 320,
    status: "active"
  }
];

// Card brand logo component
const CardLogo = ({ cardNumber, className = "w-8 h-8" }: { cardNumber: string, className?: string }) => {
  const firstFour = cardNumber.substring(0, 4);

  if (firstFour.startsWith("4")) {
    return <div className={`${className} flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded`}>VISA</div>;
  }
  if (firstFour.startsWith("5")) {
    return <div className={`${className} flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded`}>MC</div>;
  }
  if (firstFour.startsWith("3")) {
    return <div className={`${className} flex items-center justify-center bg-green-600 text-white text-xs font-bold rounded`}>AMEX</div>;
  }

  return <CreditCard className={className} />;
};

// Individual card component
const CreditCardComponent = ({
  card,
  index,
  showFullNumber,
  onToggleNumber,
  onCardClick
}: {
  card: typeof cardData[0],
  index: number,
  showFullNumber: boolean,
  onToggleNumber: () => void,
  onCardClick: () => void
}) => {
  const isDark = card.id === 1;
  const utilizationPercent = ((card.limit - card.available) / card.limit) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{
        scale: 1.02,
        rotateY: 5,
        transition: { duration: 0.3 }
      }}
      className="flex-shrink-0"
    >
      <Card
        className={`
          relative min-w-[320px] sm:min-w-[360px] h-[220px] p-6 rounded-3xl shadow-premium hover:shadow-card-hover
          transition-all duration-500 cursor-pointer overflow-hidden group
          ${isDark ? 'text-white' : 'text-neutral-900 bg-white border border-neutral-200'}
        `}
        style={{
          background: card.color.gradient
        }}
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        aria-label={`${card.cardType} card ending in ${card.cardNumber.slice(-4)}, balance $${card.balance.toLocaleString()}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCardClick();
          }
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-32 h-32 border border-current rounded-full"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 border border-current rounded-full"></div>
        </div>

        {/* Card Header */}
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <p className={`text-xs font-medium ${isDark ? 'text-blue-200' : 'text-neutral-500'}`}>
                {card.bankName}
              </p>
              {card.isMain && (
                <div className="flex items-center">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-neutral-500'}`}>
                Current Balance
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold">
                  ${card.balance.toLocaleString()}
                </p>
                {card.balance > 10000 && (
                  <TrendingUp className="h-4 w-4 text-success-400" />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleNumber();
              }}
              className={`h-8 w-8 p-0 ${isDark ? 'hover:bg-white/20' : 'hover:bg-neutral-100'}`}
              aria-label={showFullNumber ? "Hide card number" : "Show card number"}
            >
              {showFullNumber ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <CardLogo cardNumber={card.cardNumber} />
          </div>
        </div>

        {/* Card Details */}
        <div className="relative z-10 flex justify-between items-end mb-6">
          <div className="space-y-1">
            <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-neutral-500'}`}>
              CARD HOLDER
            </p>
            <p className="text-sm font-medium">
              {card.holderName}
            </p>
          </div>

          <div className="text-right space-y-1">
            <p className={`text-xs ${isDark ? 'text-blue-200' : 'text-neutral-500'}`}>
              EXPIRES
            </p>
            <p className="text-sm font-medium">
              {card.expiryDate}
            </p>
          </div>
        </div>

        {/* Card Number and Chip */}
        <div className={`
          relative z-10 flex items-center justify-between p-4 rounded-2xl
          ${isDark ? 'bg-white/10 backdrop-blur-sm' : 'bg-neutral-50 border border-neutral-200'}
        `}>
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-6 rounded ${isDark ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 'bg-gradient-to-r from-yellow-400 to-yellow-500'}`}>
              <div className="w-full h-full bg-yellow-400 rounded flex items-center justify-center">
                <div className="w-4 h-3 border border-yellow-600 rounded-sm"></div>
              </div>
            </div>
            <motion.p
              className="text-lg font-mono tracking-wider"
              key={showFullNumber ? card.fullNumber : card.cardNumber}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {showFullNumber ? card.fullNumber : card.cardNumber}
            </motion.p>
          </div>

          <div className="flex space-x-1">
            <div className={`w-6 h-6 rounded-full ${isDark ? 'bg-white/40' : 'bg-neutral-400/40'}`}></div>
            <div className={`w-6 h-6 rounded-full -ml-2 ${isDark ? 'bg-white/60' : 'bg-neutral-400/60'}`}></div>
          </div>
        </div>

        {/* Card Type Badge */}
        <div className="absolute top-4 right-4 z-20">
          <div className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${isDark ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}
          `}>
            {card.cardType}
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="absolute bottom-2 left-6 right-6 z-10">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={isDark ? 'text-blue-200' : 'text-neutral-500'}>
              Available: ${card.available.toLocaleString()}
            </span>
            <span className={isDark ? 'text-blue-200' : 'text-neutral-500'}>
              {(100 - utilizationPercent).toFixed(0)}%
            </span>
          </div>
          <div className={`w-full h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-neutral-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-success-400 to-success-500"
              style={{ width: `${100 - utilizationPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Security Indicator */}
        <div className="absolute top-6 left-6 z-20">
          <div className="flex items-center space-x-1">
            <Shield className="h-4 w-4 text-success-400" />
            <span className={`text-xs ${isDark ? 'text-blue-200' : 'text-neutral-500'}`}>
              Secured
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export function CreditCards() {
  const [showFullNumbers, setShowFullNumbers] = useState<Record<number, boolean>>({});
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const toggleCardNumber = (cardId: number) => {
    setShowFullNumbers(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleCardClick = (cardId: number) => {
    setSelectedCard(cardId === selectedCard ? null : cardId);
  };

  return (
    <div className="space-y-4">
      {/* Cards Grid - Mobile First */}
      <ScrollArea className="w-full">
        <div className="flex lg:grid lg:grid-cols-2 gap-4 lg:gap-6 pb-4">
          <AnimatePresence>
            {cardData.map((card, index) => (
              <CreditCardComponent
                key={card.id}
                card={card}
                index={index}
                showFullNumber={showFullNumbers[card.id] || false}
                onToggleNumber={() => toggleCardNumber(card.id)}
                onCardClick={() => handleCardClick(card.id)}
              />
            ))}
          </AnimatePresence>
        </div>
        <ScrollBar orientation="horizontal" className="lg:hidden" />
      </ScrollArea>

      {/* Quick Actions - Mobile Optimized */}
      <motion.div
        className="flex lg:hidden items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Quick Pay
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-600 hover:text-primary-700"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Card Summary Stats */}
      <motion.div
        className="grid grid-cols-3 gap-4 pt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-center">
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {cardData.length}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Active Cards
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-success-600 dark:text-success-400">
            ${cardData.reduce((sum, card) => sum + card.available, 0).toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Available
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {cardData.reduce((sum, card) => sum + card.rewards, 0).toLocaleString()}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Rewards
          </p>
        </div>
      </motion.div>

      {/* Accessibility: Screen reader table */}
      <div className="sr-only">
        <table>
          <caption>Credit cards overview</caption>
          <thead>
            <tr>
              <th>Card Type</th>
              <th>Bank</th>
              <th>Last 4 Digits</th>
              <th>Balance</th>
              <th>Available Credit</th>
              <th>Expiry Date</th>
            </tr>
          </thead>
          <tbody>
            {cardData.map((card) => (
              <tr key={card.id}>
                <td>{card.cardType}</td>
                <td>{card.bankName}</td>
                <td>{card.cardNumber.slice(-4)}</td>
                <td>${card.balance.toLocaleString()}</td>
                <td>${card.available.toLocaleString()}</td>
                <td>{card.expiryDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}