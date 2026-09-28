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
  Bot,
  Users,
  FileText,
  Kanban,
  Globe,
  Tag,
  ArrowRightLeft,
  Lock,
  AlertCircle,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  time: string;
  type?: 'welcome' | 'categories' | 'questions-list' | 'answer' | 'search-results' | 'text';
  category?: HelpCategory;
  question?: HelpQuestion;
  searchResults?: { category: HelpCategory; question: HelpQuestion }[];
}

export const FloatingChatWidget: React.FC = () => {
  const router = useRouter();
  const setGuideOpen = useBlogStore((s) => s.setGuideOpen);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'FileText': return FileText;
      case 'Kanban': return Kanban;
      case 'Globe': return Globe;
      case 'Tag': return Tag;
      case 'ArrowRightLeft': return ArrowRightLeft;
      case 'Lock': return Lock;
      case 'AlertCircle': return AlertCircle;
      default: return HelpCircle;
    }
  };

  const createInitialMessages = (): ChatMessage[] => [
    {
      id: 'welcome-1',
      sender: 'bot',
      time: getTime(),
      type: 'welcome',
      text: 'Hello! I am your Jupsoft CMS Assistant. How can I assist you today? Select a topic below or type your question:',
    },
    {
      id: 'categories-1',
      sender: 'bot',
      time: getTime(),
      type: 'categories',
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  const handleResetChat = () => {
    setMessages(createInitialMessages());
    setInputText('');
  };

  const handleSelectCategory = (category: HelpCategory) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: category.title,
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
        text: `Here are the most common questions regarding ${category.title}:`,
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 250);
  };

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
    }, 280);
  };

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
          searchResults: results.slice(0, 4),
          text: `Found ${results.length} related solution${results.length > 1 ? 's' : ''} for "${query}":`,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          time: getTime(),
          type: 'text',
          text: `No direct match found for "${query}". You can choose from the main categories below or check the full documentation:`,
        };
        const catMsg: ChatMessage = {
          id: `bot-cat-${Date.now()}`,
          sender: 'bot',
          time: getTime(),
          type: 'categories',
        };
        setMessages((prev) => [...prev, botMsg, catMsg]);
      }
    }, 250);
  };

  const handleActionNavigate = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <aside 
      aria-label="Jupsoft Assistant Widget"
      className="fixed bottom-5 right-5 z-40 select-none"
    >
      {/* ========================================================================= */}
      {/* 1. PROFESSIONAL COMPACT CHAT WINDOW (360px wide, 510px high)             */}
      {/* ========================================================================= */}
      {isOpen && (
        <div 
          role="dialog"
          aria-label="Jupsoft Help Assistant"
          className="w-[340px] sm:w-[370px] h-[510px] max-h-[82vh] bg-white dark:bg-[#0c1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden mb-3 animate-in fade-in zoom-in-95 duration-150 transition-all font-sans"
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-900 dark:bg-[#0f172a] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold tracking-tight truncate">Jupsoft Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-amber-400 text-slate-950">
                    BETA
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  Guided Help &amp; Diagnostics
                </div>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Restart conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setGuideOpen(true);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Open Complete Documentation"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/70 dark:bg-[#090e1a] text-xs">
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
                      className={`max-w-[85%] p-2.5 rounded-xl leading-relaxed text-xs shadow-2xs ${
                        isUser
                          ? 'bg-red-600 text-white rounded-br-xs font-medium'
                          : 'bg-white dark:bg-[#131d33] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* Categories Option List */}
                  {msg.type === 'categories' && (
                    <div className="w-full space-y-1 pt-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                        Select a Topic:
                      </div>
                      <div className="space-y-1">
                        {HELP_CATEGORIES.map((cat) => {
                          const Icon = getCategoryIcon(cat.iconName);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleSelectCategory(cat)}
                              className="w-full text-left px-2.5 py-2 rounded-lg bg-white dark:bg-[#131d33] hover:bg-red-50/70 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <Icon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 truncate">
                                  {cat.title}
                                </span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Questions List for Selected Category */}
                  {msg.type === 'questions-list' && msg.category && (
                    <div className="w-full space-y-1 pt-0.5">
                      <div className="space-y-1">
                        {msg.category.questions.map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(msg.category!, q)}
                            className="w-full text-left p-2 rounded-lg bg-white dark:bg-[#131d33] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-start gap-2 group cursor-pointer shadow-2xs"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 leading-snug">
                                {q.title}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 mt-0.5" />
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleResetChat}
                        className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline px-1 pt-1 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Back to All Topics</span>
                      </button>
                    </div>
                  )}

                  {/* Search Results */}
                  {msg.type === 'search-results' && msg.searchResults && (
                    <div className="w-full space-y-1 pt-0.5">
                      <div className="space-y-1">
                        {msg.searchResults.map(({ category, question }) => {
                          const Icon = getCategoryIcon(category.iconName);
                          return (
                            <button
                              key={question.id}
                              type="button"
                              onClick={() => handleSelectQuestion(category, question)}
                              className="w-full text-left p-2 rounded-lg bg-white dark:bg-[#131d33] hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-red-300 dark:hover:border-red-800 transition-all flex items-start gap-2 group cursor-pointer shadow-2xs"
                            >
                              <Icon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                  {category.title}
                                </span>
                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-red-600 dark:group-hover:text-red-400 leading-snug">
                                  {question.title}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500 shrink-0 mt-1" />
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleResetChat}
                        className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline px-1 pt-1 cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Back to Main Topics</span>
                      </button>
                    </div>
                  )}

                  {/* Full Structured Answer Card */}
                  {msg.type === 'answer' && msg.question && (
                    <div className="w-full p-3 rounded-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
                      {/* Header */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1">
                          {(() => {
                            const Icon = getCategoryIcon(msg.category?.iconName || '');
                            return <Icon className="w-3 h-3" />;
                          })()}
                          <span>{msg.category?.title}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                          {msg.question.title}
                        </h4>
                      </div>

                      {/* Summary */}
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#162238] border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {msg.question.summary}
                      </div>

                      {/* Numbered Steps */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Action Steps:</span>
                        </div>
                        {msg.question.steps.map((st) => (
                          <div
                            key={st.step}
                            className="flex items-start gap-2 p-1.5 rounded-md bg-slate-50/70 dark:bg-[#0e1626] border border-slate-100 dark:border-slate-800/80"
                          >
                            <span className="w-4 h-4 rounded-full bg-red-600 text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
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
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 flex items-start gap-1.5 text-[10px] text-amber-800 dark:text-amber-300">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Tip: </span>
                            <span>{msg.question.proTip}</span>
                          </div>
                        </div>
                      )}

                      {/* Quick Action Navigation */}
                      {msg.question.actionLink && (
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleActionNavigate(msg.question!.actionLink!.href)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <span>{msg.question.actionLink.label}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Navigation */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(msg.category!)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                        >
                          <span>More topics</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <button
                          type="button"
                          onClick={handleResetChat}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Main Menu</span>
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
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-slate-800 w-fit text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Search Input Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] flex items-center gap-1.5 shrink-0"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search help topics (e.g. 403, super admin)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Search"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPACT PROFESSIONAL FLOATING LAUNCHER (Intercom / Crisp Standard)     */}
      {/* ========================================================================= */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl ${
            isOpen
              ? 'w-11 h-11 rounded-full bg-slate-800 text-white hover:bg-slate-700'
              : 'w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95'
          }`}
          title={isOpen ? 'Close Assistant' : 'Open Jupsoft Help Assistant'}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
              {/* Beta Pill attached to launcher */}
              <span className="absolute -top-3.5 -right-3.5 px-1.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-white dark:border-slate-900 shadow-xs">
                BETA
              </span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
