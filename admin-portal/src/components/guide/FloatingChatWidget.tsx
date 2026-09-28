'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '../../store/useBlogStore';
import { HELP_CATEGORIES, HelpCategory, HelpQuestion } from '../../data/helpCenterData';
import { 
  HelpCircle, 
  Sparkles, 
  X, 
  Send, 
  RotateCcw, 
  ChevronRight, 
  ArrowUpRight, 
  CheckCircle2, 
  Lightbulb, 
  BookOpen, 
  Search,
  MessageSquare,
  Bot
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  time: string;
  // Bot payload types
  type?: 'welcome' | 'categories' | 'questions-list' | 'answer' | 'search-results' | 'text';
  category?: HelpCategory;
  question?: HelpQuestion;
  searchResults?: { category: HelpCategory; question: HelpQuestion }[];
  actionLink?: { label: string; href: string };
  followUps?: { label: string; action: () => void }[];
}

export const FloatingChatWidget: React.FC = () => {
  const router = useRouter();
  const setGuideOpen = useBlogStore((s) => s.setGuideOpen);
  const activeRole = useBlogStore((s) => s.activeRole);

  const [isOpen, setIsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initial welcome message
  const createInitialMessages = (): ChatMessage[] => [
    {
      id: 'welcome-1',
      sender: 'bot',
      time: getTime(),
      type: 'welcome',
      text: 'Namaste! Main Jupsoft Help Bot hoon. Aapko CMS me kis cheez me help chahiye? Niche diye gaye options me se choose karein:',
    },
    {
      id: 'categories-1',
      sender: 'bot',
      time: getTime(),
      type: 'categories',
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleResetChat = () => {
    setMessages(createInitialMessages());
    setInputText('');
  };

  // When user selects a main category
  const handleSelectCategory = (category: HelpCategory) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `${category.title} (${category.titleHi})`,
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        time: getTime(),
        type: 'questions-list',
        category,
        text: `"${category.title}" ke regarding aapko kis question ka solution chahiye? Niche click karein:`,
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 280);
  };

  // When user selects a specific question
  const handleSelectQuestion = (category: HelpCategory, question: HelpQuestion) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question.title,
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        time: getTime(),
        type: 'answer',
        category,
        question,
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 320);
  };

  // Search through all questions
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim().toLowerCase();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const results: { category: HelpCategory; question: HelpQuestion }[] = [];
      for (const cat of HELP_CATEGORIES) {
        for (const q of cat.questions) {
          if (
            q.title.toLowerCase().includes(query) ||
            q.titleHi.toLowerCase().includes(query) ||
            q.summary.toLowerCase().includes(query) ||
            q.tags.some((t) => t.toLowerCase().includes(query))
          ) {
            results.push({ category: cat, question: q });
          }
        }
      }

      if (results.length > 0) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          time: getTime(),
          type: 'search-results',
          searchResults: results.slice(0, 5),
          text: `Mujhe "${query}" ke related ${results.length} solutions mile. Click karke solution dekhein:`,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          time: getTime(),
          type: 'text',
          text: `Maaf kijiye, "${query}" ke related koi exact topic nahi mila. Aap niche diye gaye main categories me se select kar sakte hain ya top navbar me "Help & Guide" manual dekh sakte hain.`,
        };
        const catMsg: ChatMessage = {
          id: `bot-cat-${Date.now()}`,
          sender: 'bot',
          time: getTime(),
          type: 'categories',
        };
        setMessages((prev) => [...prev, botMsg, catMsg]);
      }
    }, 300);
  };

  const handleActionNavigate = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      {/* ========================================================================= */}
      {/* 1. CHATBOT WINDOW (INTERCOM / CRISP STYLE)                                 */}
      {/* ========================================================================= */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="Jupsoft Support Chatbot"
          className="w-[360px] sm:w-[420px] h-[580px] max-h-[82vh] bg-white dark:bg-[#0c1220] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden mb-3 animate-in fade-in zoom-in-95 duration-200 transition-all"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-red-600 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate">Jupsoft Help Bot</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs">
                    BETA TESTING
                  </span>
                </div>
                <div className="text-[10px] text-red-100 truncate">
                  Interactive Support • सहायता
                </div>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setGuideOpen(true);
                }}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Open Full Reading Manual"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer ml-0.5"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/70 dark:bg-[#080d19] text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Regular Text Bubble */}
                  {msg.text && (
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl leading-relaxed text-xs shadow-2xs ${
                        isUser
                          ? 'bg-red-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-[#131d33] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Main Categories Option Buttons */}
                  {msg.type === 'categories' && (
                    <div className="w-full space-y-1.5 pt-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                        Select a Topic:
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {HELP_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleSelectCategory(cat)}
                            className="w-full text-left px-3 py-2 rounded-xl bg-white dark:bg-[#131d33] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                                {cat.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {cat.titleHi}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Questions List for Selected Category */}
                  {msg.type === 'questions-list' && msg.category && (
                    <div className="w-full space-y-1.5 pt-1">
                      <div className="grid grid-cols-1 gap-1.5">
                        {msg.category.questions.map((q, idx) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(msg.category!, q)}
                            className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-[#131d33] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-start gap-2 group cursor-pointer shadow-2xs"
                          >
                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-red-600 group-hover:text-white transition-colors">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400">
                                {q.title}
                              </div>
                              <div className="text-[10px] text-red-600/80 dark:text-red-400/80 font-medium">
                                {q.titleHi}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleResetChat}
                        className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline px-1 pt-1 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Back to All Categories</span>
                      </button>
                    </div>
                  )}

                  {/* Search Results Option List */}
                  {msg.type === 'search-results' && msg.searchResults && (
                    <div className="w-full space-y-1.5 pt-1">
                      <div className="grid grid-cols-1 gap-1.5">
                        {msg.searchResults.map(({ category, question }) => (
                          <button
                            key={question.id}
                            type="button"
                            onClick={() => handleSelectQuestion(category, question)}
                            className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-[#131d33] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-start justify-between group cursor-pointer shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                                {category.title}
                              </span>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400">
                                {question.title}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {question.titleHi}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 mt-1" />
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleResetChat}
                        className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline px-1 pt-1 cursor-pointer"
                      >
                        Back to Main Topics
                      </button>
                    </div>
                  )}

                  {/* Full Structured Answer Card */}
                  {msg.type === 'answer' && msg.question && (
                    <div className="w-full p-3.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
                      {/* Title */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                          {msg.category?.title}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {msg.question.title}
                        </h4>
                        <p className="text-[11px] font-semibold text-red-600/90 dark:text-red-400/90">
                          {msg.question.titleHi}
                        </p>
                      </div>

                      {/* Direct Summary / Saransh */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1a253e] border border-slate-200/70 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Direct Answer:</span>
                        </div>
                        <p className="leading-relaxed font-medium">
                          {msg.question.summary}
                        </p>
                        {msg.question.summaryHi && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            {msg.question.summaryHi}
                          </p>
                        )}
                      </div>

                      {/* Numbered Steps */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Follow These Steps:
                        </div>
                        {msg.question.steps.map((st) => (
                          <div
                            key={st.step}
                            className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/70 dark:bg-[#162238] border border-slate-100 dark:border-slate-800/80"
                          >
                            <span className="w-4 h-4 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {st.step}
                            </span>
                            <div className="text-[11px] min-w-0">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {st.instruction}
                              </span>
                              {st.detail && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {st.detail}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pro-Tip */}
                      {msg.question.proTip && (
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Tip: </span>
                            <span>{msg.question.proTip}</span>
                          </div>
                        </div>
                      )}

                      {/* Quick Action Navigation Button */}
                      {msg.question.actionLink && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleActionNavigate(msg.question!.actionLink!.href)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <span>{msg.question.actionLink.label}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Follow-up Options */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(msg.category!)}
                          className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          More in this topic &rarr;
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <button
                          type="button"
                          onClick={handleResetChat}
                          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          Main Menu
                        </button>
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 px-1">
                    {msg.time}
                  </span>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-slate-800 w-fit text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0c1220] flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search help (e.g. 403, super admin, image)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-3.5 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FLOATING LAUNCHER PILL / BUTTON (MATCHING USER SCREENSHOT)              */}
      {/* ========================================================================= */}
      {!minimized ? (
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/95 dark:bg-[#0d1527] backdrop-blur-md border border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.35)] text-white animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-full hover:bg-slate-800/90 dark:hover:bg-slate-800/60 transition-all group cursor-pointer"
            title="Open Jupsoft Chatbot Support"
          >
            {/* Animated Red Icon with Yellow Notification Pip */}
            <div className="relative flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <HelpCircle className="w-4 h-4 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
            </div>

            {/* Label and Subtitle matching user screenshot */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white group-hover:text-red-300 transition-colors">
                  Need Help?
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5" />
                  BETA TESTING
                </span>
              </div>
              <span className="text-[10px] text-slate-300 font-medium">
                Option-Wise Guide &bull; सहायता
              </span>
            </div>

            <ChevronRight className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform ${isOpen ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => {
              setMinimized(true);
              setIsOpen(false);
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer mr-1"
            title="Minimize"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        /* Minimized Round Bubble */
        <button
          type="button"
          onClick={() => {
            setMinimized(false);
            setIsOpen(true);
          }}
          className="relative group w-11 h-11 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 dark:bg-[#0d1527] text-white flex items-center justify-center shadow-2xl border border-slate-700/80 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Open Jupsoft Chatbot"
        >
          <HelpCircle className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
          <span className="absolute -top-1 -right-1 px-1 py-[1px] rounded bg-amber-400 text-slate-950 font-black text-[7.5px] uppercase tracking-wider shadow-xs">
            BETA
          </span>
        </button>
      )}
    </div>
  );
};
