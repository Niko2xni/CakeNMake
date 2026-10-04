import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Bot, Sparkles, Send, Plus, Paperclip, X, MessageSquare, History, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { validateUploadedFile } from '@/lib/file-validation';

// Wrap any vertical scrollable content with this instead of the browser's native scrollbar.
function CustomScrollbar({ className = '', contentClassName = '', children }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const dragStateRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [thumbMetrics, setThumbMetrics] = useState({ top: 0, height: 0, visible: false });

  function getTrackMetrics(el) {
    const trackHeight = el.clientHeight - 40;
    const thumbHeight = Math.max(24, (el.clientHeight / el.scrollHeight) * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    return { thumbHeight, maxThumbTop, maxScroll };
  }

  function updateThumbMetrics() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    let next;
    if (scrollHeight - clientHeight <= 1) {
      next = { top: 0, height: 0, visible: false };
    } else {
      const { thumbHeight, maxThumbTop, maxScroll = 0 } = getTrackMetrics(el);
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
      next = { top: thumbTop, height: thumbHeight, visible: true };
    }
    setThumbMetrics((prev) => {
      const sameVisible = prev.visible === next.visible;
      const sameTop = Math.abs(prev.top - next.top) < 0.5;
      const sameHeight = Math.abs(prev.height - next.height) < 0.5;
      if (sameVisible && sameTop && sameHeight) return prev;
      return next;
    });
  }

  function scrollUp() {
    scrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  }
  function scrollDown() {
    scrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  }

  function handleTrackClick(e) {
    if (justDraggedRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
    const desiredThumbTop = Math.min(maxThumbTop, Math.max(0, clickY - thumbHeight / 2));
    const scrollRatio = maxThumbTop > 0 ? desiredThumbTop / maxThumbTop : 0;
    el.scrollTo({ top: scrollRatio * maxScroll, behavior: 'smooth' });
  }

  function handleThumbMouseDown(e) {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    dragStateRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    window.addEventListener('mousemove', handleThumbMouseMove);
    window.addEventListener('mouseup', handleThumbMouseUp);
  }

  function handleThumbMouseMove(e) {
    const el = scrollRef.current;
    const drag = dragStateRef.current;
    if (!el || !drag) return;
    const { maxThumbTop, maxScroll } = getTrackMetrics(el);
    if (maxThumbTop <= 0) return;
    const deltaScroll = ((e.clientY - drag.startY) / maxThumbTop) * maxScroll;
    el.scrollTop = Math.min(maxScroll, Math.max(0, drag.startScrollTop + deltaScroll));
    updateThumbMetrics();
  }

  function handleThumbMouseUp() {
    dragStateRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);
    window.removeEventListener('mousemove', handleThumbMouseMove);
    window.removeEventListener('mouseup', handleThumbMouseUp);
  }

  useLayoutEffect(() => {
    updateThumbMetrics();
  });

  useEffect(() => {
    window.addEventListener('resize', updateThumbMetrics);
    const ro = new ResizeObserver(updateThumbMetrics);
    if (scrollRef.current) ro.observe(scrollRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener('resize', updateThumbMetrics);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`relative min-h-0 ${className}`}>
      {thumbMetrics.visible && (
        <div className="cn-ai-scrollbar hidden md:flex absolute top-0 right-0 h-full w-4 flex-col z-10">
          <button
            onClick={scrollUp}
            aria-label="Scroll up"
            title="Scroll up"
            className="cn-ai-scroll-button h-5 flex-shrink-0 flex items-center justify-center text-[10px] leading-none transition-colors select-none"
          >
            ▲
          </button>
          <div onClick={handleTrackClick} className="cn-ai-scroll-track relative flex-1 cursor-pointer">
            <div
              onMouseDown={handleThumbMouseDown}
              onClick={(e) => e.stopPropagation()}
              className="cn-ai-scroll-thumb absolute left-1/2 -translate-x-1/2 w-1.5 rounded-full transition-colors cursor-grab active:cursor-grabbing"
              style={{ top: thumbMetrics.top, height: thumbMetrics.height }}
            />
          </div>
          <button
            onClick={scrollDown}
            aria-label="Scroll down"
            title="Scroll down"
            className="cn-ai-scroll-button h-5 flex-shrink-0 flex items-center justify-center text-[10px] leading-none transition-colors select-none"
          >
            ▼
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={updateThumbMetrics}
        className={`h-full overflow-y-auto ${thumbMetrics.visible ? 'md:pr-5' : ''} [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
      >
        <div ref={contentRef} className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}

export default function CakeAI() {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Chat History States
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: 'Vintage Wedding Cake Design' },
    { id: 2, title: '3-Tier Birthday Pastel Theme' },
    { id: 3, title: 'CakeNMake Agile Scrum Sprint Space Plan' },
    { id: 4, title: 'Minimalist Fondant Concept Collection' },
    { id: 5, title: 'Separating Emojis for Deliverables' },
    { id: 6, title: 'Rustic Woodland Theme Layering' },
    { id: 7, title: 'Gothic Dark Chocolate Elegance' },
    { id: 8, title: 'Geometric Art Deco Tier Layouts' },
    { id: 9, title: 'Watercolor Floral Accent Palette' },
    { id: 10, title: 'Muted Earth Tones Palette Sheet' },
    { id: 11, title: 'Children’s Cartoon Character Topper' },
    { id: 12, title: 'Stained Glass Sugar Window Concept' },
    { id: 13, title: 'Marbled Buttercream Coating Guide' },
    { id: 14, title: 'Metallic Gold Leaf Application Style' },
    { id: 15, title: 'Cascading Sugar Orchid Pattern' }
  ]);
  const [activeChatId, setActiveChatId] = useState(null); 
  
  // Popover and Modal triggers
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const menuRef = useRef(null);

  // Dynamic automatic row height manager tracking text entries up to 11 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    
    const lineHeight = 24; 
    const maxLinesHeight = lineHeight * 11;
    const currentScrollHeight = textarea.scrollHeight;

    if (currentScrollHeight <= maxLinesHeight) {
      textarea.style.height = `${currentScrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxLinesHeight}px`;
      textarea.style.overflowY = 'auto'; 
    }
  }, [message]);

  // Click outside listener for menu dropdown dismissal
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
        setEditingChatId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    const payload = {
      text: message,
      files: attachedFiles,
      chatId: activeChatId
    };
    
    console.log("Sending payload to upcoming AI API:", payload);

    if (message.trim() && !chatHistory.some(h => h.title === message.substring(0, 24))) {
      const newLog = {
        id: Date.now(),
        title: message.length > 28 ? `${message.substring(0, 26)}...` : message
      };
      setChatHistory([newLog, ...chatHistory]);
      setActiveChatId(newLog.id);
    }

    setMessage('');
    setAttachedFiles([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const addFiles = (files) => {
    const accepted = [];
    let firstError = '';
    files.forEach((file) => {
      const fileError = validateUploadedFile(file);
      if (fileError) {
        firstError ||= `${file.name}: ${fileError}`;
      } else {
        accepted.push(file);
      }
    });
    setAttachmentError(firstError);
    if (accepted.length) setAttachedFiles((current) => [...current, ...accepted]);
  };

  const removeFile = (indexToRemove) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const triggerRenameState = (chat) => {
    setEditingChatId(chat.id);
    setEditTitleValue(chat.title);
  };

  const saveRenameAction = (id) => {
    if (editTitleValue.trim()) {
      setChatHistory(prev => prev.map(item => item.id === id ? { ...item, title: editTitleValue.trim() } : item));
    }
    setEditingChatId(null);
    setActiveMenuId(null);
  };

  const executeDeleteChat = () => {
    if (deleteConfirmId) {
      setChatHistory(prev => prev.filter(item => item.id !== deleteConfirmId));
      if (activeChatId === deleteConfirmId) {
        setActiveChatId(null);
      }
      setDeleteConfirmId(null);
      setActiveMenuId(null);
    }
  };

  const hasContentToSend = message.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div className="cn-app-page cn-ai-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 flex relative overflow-visible">
      <ClientNavbar />
      
      {/* PERSONAL HISTORY SIDE NAVIGATION */}
      <aside className="cn-ai-history hidden lg:flex border-r border-pink-100/60 bg-white/30 backdrop-blur-md flex-col py-6 select-none shrink-0 relative z-40 overflow-visible">
        
        {/* Header Title Block */}
        <div className="cn-ai-history-heading flex items-center gap-2 mb-5 px-5 text-gray-400 font-semibold text-xs tracking-wider">
          <History className="w-3.5 h-3.5 text-pink-400" />
          <span>DESIGN HISTORY</span>
        </div>

        {/* New Concept Action Trigger */}
        <div className="px-4 mb-4">
          <button 
            onClick={() => { setMessage(''); setAttachedFiles([]); setActiveChatId(null); }}
            className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-pink-600 bg-white hover:bg-pink-50 rounded-xl border border-pink-100 shadow-3xs transition-all w-full text-left group"
          >
            <span>New Design Concept</span>
            <Plus className="w-4 h-4 text-pink-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Scrollable Chat Items Area */}
        <CustomScrollbar 
          className="cn-ai-history-list w-full pl-3 pr-1 overflow-visible"
          contentClassName="space-y-0.5 pb-10"
        >
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              className="relative group w-full overflow-visible"
            >
              <button
                onClick={() => setActiveChatId(chat.id)}
                aria-current={activeChatId === chat.id ? 'page' : undefined}
                title={chat.title}
                className={`cn-ai-history-item flex items-center w-full text-left px-3 py-3 rounded-xl transition-all ${
                  activeChatId === chat.id 
                    ? 'bg-white text-gray-900 border border-pink-100/70 shadow-3xs pr-12' 
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 pr-12'
                }`}
              >
                <div className="flex items-center gap-2.5 w-full min-w-0">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-pink-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium truncate flex-1">{chat.title}</span>
                </div>
              </button>

              {/* 3-DOT INTERACTION BUTTON */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropdownWidth = 288; 
                    const dropdownHeight = 90; 
                    
                    // Fixed coordinates right next to the 3-dot trigger button
                    let leftPos = rect.right + 6; 
                    if (leftPos + dropdownWidth > window.innerWidth) {
                      leftPos = rect.left - dropdownWidth - 6; 
                    }
                    
                    let topPos = rect.top;
                    if (topPos + dropdownHeight > window.innerHeight) {
                      topPos = window.innerHeight - dropdownHeight - 12; 
                    }

                    setMenuPosition({
                      top: topPos,
                      left: leftPos
                    });
                    setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all flex items-center justify-center"
                  title="Chat Options"
                >
                  <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* CONTEXT DROPDOWN CARD */}
              {activeMenuId === chat.id && (
                <div 
                  ref={menuRef}
                  style={{
                    position: 'fixed',
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`
                  }}
                  className="bg-white border border-gray-150 rounded-xl shadow-xl py-2 w-72 z-[999] animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3 py-1.5 border-b border-gray-100 mb-1 group/item">
                    {editingChatId === chat.id ? (
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        onBlur={() => saveRenameAction(chat.id)}
                        onKeyDown={(e) => e.key === 'Enter' && saveRenameAction(chat.id)}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        className="w-full text-sm font-semibold text-gray-800 bg-gray-50 border border-pink-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-pink-400"
                      />
                    ) : (
                      <div 
                        onClick={() => triggerRenameState(chat)}
                        className="flex items-center justify-between text-sm font-semibold text-gray-800 truncate rounded hover:bg-gray-50 p-1 cursor-pointer w-full"
                        title="Click to rename"
                      >
                        <span className="truncate flex-1 pr-1">{chat.title}</span>
                        <Pencil className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover/item:opacity-100 shrink-0 ml-1" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(chat.id)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete chat</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </CustomScrollbar>
      </aside>

      {/* CORE WORKSPACE INPUT CANVAS */}
      <main className="cn-ai-stage flex-1 flex flex-col items-center px-6 relative z-10">
        
        {/* RESPONSIVE TOP-RIGHT TOGGLE BUTTON (Hidden on Desktop) */}
        <div className="absolute top-6 right-4 lg:hidden z-50">
          <button
            onClick={() => setIsMobileHistoryOpen(true)}
            className="p-3 bg-white border border-pink-100 text-pink-600 rounded-xl shadow-xs hover:bg-pink-50 transition-all flex items-center gap-2 font-medium text-sm"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* FULL PAGE RESPONSIVE MOBILE MENU COVER OVERLAY */}
        {isMobileHistoryOpen && (
          <div className="cn-ai-mobile-history fixed inset-0 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 z-[100] flex flex-col pt-6 pb-6 pr-4 pl-[86px] animate-in fade-in slide-in-from-top duration-200 lg:hidden overflow-y-auto">
            {/* Top Bar inside Full Screen Menu */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-pink-100 shrink-0 relative">
              <div className="flex items-center gap-2 text-gray-400 font-semibold text-xs tracking-wider">
                <History className="w-3.5 h-3.5 text-pink-400" />
                <span>DESIGN HISTORY</span>
              </div>
              <button
                onClick={() => setIsMobileHistoryOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors absolute right-0 top-1/2 -translate-y-1/2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mobile New Concept Trigger */}
            <div className="mb-4 shrink-0">
              <button 
                onClick={() => { setMessage(''); setAttachedFiles([]); setActiveChatId(null); setIsMobileHistoryOpen(false); }}
                className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-pink-600 bg-white rounded-xl border border-pink-100 shadow-3xs transition-all w-full text-left"
              >
                <span>New Design Concept</span>
                <Plus className="w-4 h-4 text-pink-400" />
              </button>
            </div>

            {/* Items Loop List */}
            <div className="flex-1 space-y-0.5 pb-8 overflow-visible">
              {chatHistory.map((chat) => (
                <div key={chat.id} className="relative group w-full overflow-visible">
                  <button
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setIsMobileHistoryOpen(false);
                    }}
                    aria-current={activeChatId === chat.id ? 'page' : undefined}
                    className={`flex items-center w-full text-left px-3 py-3.5 rounded-xl transition-all ${
                      activeChatId === chat.id 
                        ? 'bg-white text-gray-900 border border-pink-100/70 shadow-3xs pr-12' 
                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 pr-12'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 w-full min-w-0">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${activeChatId === chat.id ? 'text-pink-500' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium truncate flex-1" title={chat.title}>{chat.title}</span>
                    </div>
                  </button>
                  
                  {/* MOBILE 3-DOT INTERACTION OPTION */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const dropdownWidth = 288;
                        const dropdownHeight = 90;
                        
                        let leftPos = rect.left - dropdownWidth + rect.width; 
                        if (leftPos < 86) leftPos = 86; // Prevent clip with navigation layout
                        
                        let topPos = rect.bottom + 4;
                        if (topPos + dropdownHeight > window.innerHeight) {
                          topPos = rect.top - dropdownHeight - 4; 
                        }

                        setMenuPosition({
                          top: topPos,
                          left: leftPos
                        });
                        setActiveMenuId(activeMenuId === chat.id ? null : chat.id);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-all flex items-center justify-center"
                      title="Chat Options"
                    >
                      <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="cn-ai-composer-wrap w-full mx-auto">
          {/* Header Section */}
          <div className="cn-ai-prompt-heading text-center">
            <div className="flex items-center justify-center gap-2">
              <Bot className="w-6 h-6 text-pink-500" />
              <h1 className="font-bold py-1">
                What will we design today?
              </h1>
              <Sparkles className="w-6 h-6 text-orange-400" />
            </div>
            <p>Describe the occasion, flavors, colors, and details you have in mind.</p>
          </div>

          {/* Text Box Container */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="cn-ai-composer relative flex flex-col border rounded-2xl transition-all duration-200 bg-white border-gray-200 focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100/50"
          >
            {isDragging && (
              <div className="absolute inset-0 bg-pink-50/90 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10 text-pink-600 font-medium pointer-events-none text-sm">
                Drop your media and files right here
              </div>
            )}

            <div className="w-full">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe your idea, and I'll bring it to life"
                rows={1}
                className="cn-ai-textarea w-full bg-transparent border-0 outline-none resize-none text-gray-700 placeholder-gray-400 focus:ring-0 focus:outline-none text-base leading-6"
              />
            </div>

            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2 pb-3 pt-2 border-b border-gray-100 mb-2 mt-1">
                {attachedFiles.map((file, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center gap-1.5 bg-pink-50 border border-pink-100 text-pink-700 text-xs font-medium px-2.5 py-1 rounded-lg shadow-3xs group"
                  >
                    <Paperclip className="w-3 h-3 text-pink-400" />
                    <span className="max-w-[140px] truncate">{file.name}</span>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="p-0.5 hover:bg-pink-200 rounded-full text-pink-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {attachmentError && (
              <p className="px-3 pb-2 text-xs text-red-600" role="alert">{attachmentError}</p>
            )}

            <div className="cn-ai-composer-actions flex items-center justify-between border-t">
              <div>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="cn-ai-attach flex items-center justify-center gap-2 rounded-full"
                  title="Attach files"
                  aria-label="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                  <span>Attach files</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!hasContentToSend}
                className="cn-ai-submit flex items-center justify-center gap-2 rounded-full"
                title="Generate cake concept"
              >
                <span>Generate concept</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* SYSTEM CONFIRMATION MODAL OVERLAY */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[150] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-100 animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete chat?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to delete this chat history loop? This structural change cannot be recovered.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteChat}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
