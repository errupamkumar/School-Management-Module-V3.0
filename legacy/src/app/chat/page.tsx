'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  CheckCheck,
  Circle,
  Users,
  User,
  Sparkles,
  Shield,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'me' | 'other';
  senderName: string;
  text: string;
  time: string;
}

interface Channel {
  id: string;
  name: string;
  nameHi: string;
  role: string;
  roleHi: string;
  avatar: string;
  lastMessage: string;
  lastMessageHi: string;
  time: string;
  unread: number;
  online: boolean;
  type: 'group' | 'direct';
}

const INITIAL_CHANNELS: Channel[] = [
  {
    id: '1',
    name: 'Class 10-A Parents Group',
    nameHi: 'कक्षा 10-ए अभिभावक समूह',
    role: 'Group • 42 Parents & Teachers',
    roleHi: 'समूह • 42 अभिभावक एवं शिक्षक',
    avatar: '👨‍👩‍👧',
    lastMessage: 'Tomorrow is the parent-teacher meeting at 10 AM.',
    lastMessageHi: 'कल सुबह 10 बजे अभिभावक-शिक्षक बैठक है।',
    time: '10:45 AM',
    unread: 2,
    online: true,
    type: 'group',
  },
  {
    id: '2',
    name: 'All Teachers Lounge',
    nameHi: 'समस्त शिक्षक कक्ष',
    role: 'Staff • 52 Members',
    roleHi: 'स्टाफ • 52 सदस्य',
    avatar: '👨‍🏫',
    lastMessage: 'Please submit the monthly assessment marks by Friday.',
    lastMessageHi: 'कृपया शुक्रवार तक मासिक मूल्यांकन अंक जमा करें।',
    time: '9:20 AM',
    unread: 0,
    online: true,
    type: 'group',
  },
  {
    id: '3',
    name: 'Accounts & Fee Desk',
    nameHi: 'लेखा एवं शुल्क विभाग',
    role: 'Finance Department',
    roleHi: 'वित्त विभाग',
    avatar: '💳',
    lastMessage: 'Today fee collection summary report is ready for review.',
    lastMessageHi: 'आज की शुल्क संग्रह सारांश रिपोर्ट समीक्षा के लिए तैयार है।',
    time: 'Yesterday',
    unread: 1,
    online: false,
    type: 'direct',
  },
  {
    id: '4',
    name: 'Dr. R.K. Sharma (Principal)',
    nameHi: 'डॉ. आर.के. शर्मा (प्रधानाचार्य)',
    role: 'Principal Office',
    roleHi: 'प्रधानाचार्य कार्यालय',
    avatar: '👔',
    lastMessage: 'Approved the annual sports day proposal.',
    lastMessageHi: 'वार्षिक खेल दिवस प्रस्ताव को मंजूरी दे दी गई है।',
    time: 'Yesterday',
    unread: 0,
    online: true,
    type: 'direct',
  },
  {
    id: '5',
    name: 'Pooja Verma (Senior Math)',
    nameHi: 'पूजा वर्मा (वरिष्ठ गणित)',
    role: 'Teacher • Class 9 & 10',
    roleHi: 'शिक्षिका • कक्षा 9 एवं 10',
    avatar: '👩‍🏫',
    lastMessage: 'Extra classes for remedial students scheduled.',
    lastMessageHi: 'उपचारात्मक छात्रों के लिए अतिरिक्त कक्षाएं निर्धारित हैं।',
    time: '2 days ago',
    unread: 0,
    online: false,
    type: 'direct',
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      sender: 'other',
      senderName: 'Sunita Mehra (Parent)',
      text: 'Good morning sir, could you please confirm the schedule for tomorrow’s parent-teacher conference?',
      time: '10:30 AM',
    },
    {
      id: 'm2',
      sender: 'me',
      senderName: 'Administrator',
      text: 'Good morning Mrs. Mehra. The conference begins at 10:00 AM sharp in the main school auditorium. Roll numbers 1 to 25 from 10:00 to 12:00, and 26 to 50 from 1:00 to 3:00 PM.',
      time: '10:38 AM',
    },
    {
      id: 'm3',
      sender: 'other',
      senderName: 'Rajesh Gupta (Parent)',
      text: 'Will the mid-term progress reports be handed over during this meeting?',
      time: '10:42 AM',
    },
    {
      id: 'm4',
      sender: 'me',
      senderName: 'Administrator',
      text: 'Yes Mr. Gupta. Printed report cards along with teacher feedback rubrics will be provided.',
      time: '10:45 AM',
    },
  ],
  '2': [
    {
      id: 't1',
      sender: 'other',
      senderName: 'Academic Coordinator',
      text: 'Reminder to all subject teachers: Please upload formative assessment grades into the ERP portal before Friday 5 PM.',
      time: '9:15 AM',
    },
    {
      id: 't2',
      sender: 'me',
      senderName: 'Administrator',
      text: 'The marks entry portal is live. If anyone faces access issues, reach out to IT desk.',
      time: '9:20 AM',
    },
  ],
};

export default function ChatPage() {
  const { lang } = useLanguage();
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('1');
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeMessages = messages[activeChannelId] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      senderName: 'Administrator',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));

    // Update last message in channel list
    setChannels((prev) =>
      prev.map((c) =>
        c.id === activeChannelId
          ? { ...c, lastMessage: inputText.trim(), lastMessageHi: inputText.trim(), time: 'Just now' }
          : c
      )
    );

    setInputText('');
    toast.success(lang === 'hi' ? 'संदेश भेजा गया' : 'Message sent');
  };

  const handleQuickTemplate = (template: string) => {
    setInputText(template);
  };

  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameHi.includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-6 sm:pb-10">
        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row h-[82vh] md:h-[78vh] min-h-[500px]">
          {/* Left Sidebar: Conversations list */}
          <div
            className={cn(
              'w-full md:w-80 lg:w-96 border-r border-gray-100 dark:border-slate-800 flex-col h-full bg-gray-50/50 dark:bg-slate-900/50',
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* Search Header */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                    <MessageSquare size={16} />
                  </div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {lang === 'hi' ? 'संदेश एवं चैट' : 'Institute Chat'}
                  </h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold">
                  {channels.length} {lang === 'hi' ? 'चैट्स' : 'active'}
                </span>
              </div>

              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'hi' ? 'बातचीत खोजें...' : 'Search conversations...'}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Channels List */}
            <div className="flex-1 overflow-y-auto touch-scroll divide-y divide-gray-100/60 dark:divide-slate-800/60">
              {filteredChannels.map((channel) => {
                const isActive = channel.id === activeChannelId;
                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChannelId(channel.id);
                      setMobileView('chat');
                    }}
                    className={cn(
                      'w-full text-left p-3.5 flex items-start gap-3 transition-colors',
                      isActive
                        ? 'bg-purple-50/80 dark:bg-purple-950/40 border-l-4 border-purple-600'
                        : 'hover:bg-gray-100/60 dark:hover:bg-slate-800/50'
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 dark:from-purple-950 dark:to-indigo-950 flex items-center justify-center text-lg shadow-sm border border-purple-200/50 dark:border-purple-800/40">
                        {channel.avatar}
                      </div>
                      {channel.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                          {lang === 'hi' ? channel.nameHi : channel.name}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {channel.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {lang === 'hi' ? channel.lastMessageHi : channel.lastMessage}
                      </p>
                    </div>

                    {channel.unread > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {channel.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Active Chat Window */}
          <div
            className={cn(
              'flex-1 flex-col h-full bg-white dark:bg-slate-900',
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            )}
          >
            {/* Chat Header */}
            <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-1.5 -ml-1 text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                  aria-label="Back to conversations list"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
                  {activeChannel.avatar}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {lang === 'hi' ? activeChannel.nameHi : activeChannel.name}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                    {activeChannel.online && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                    <span className="truncate">{lang === 'hi' ? activeChannel.roleHi : activeChannel.role}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toast.success(lang === 'hi' ? 'ऑडियो कॉल सुविधा सक्रिय' : 'Voice call initialized')}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Voice Call"
                >
                  <Phone size={17} />
                </button>
                <button
                  onClick={() => toast.success(lang === 'hi' ? 'वीडियो कॉन्फ्रेंस कक्ष सक्रिय' : 'Video meeting room active')}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Video Call"
                >
                  <Video size={17} />
                </button>
              </div>
            </div>

            {/* Quick Template Chips */}
            <div className="px-4 py-2 bg-gray-50/70 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                {lang === 'hi' ? 'त्वरित संदेश:' : 'Quick Templates:'}
              </span>
              {[
                {
                  text: lang === 'hi' ? 'कृपया कल की अभिभावक-शिक्षक बैठक में उपस्थित रहें।' : 'Please attend tomorrow’s scheduled Parent-Teacher meeting.',
                  label: lang === 'hi' ? 'बैठक सूचना' : 'P-T Meeting',
                },
                {
                  text: lang === 'hi' ? 'आवश्यक सूचना: सभी कक्षाओं के लिए वार्षिक परीक्षा समय सारणी जारी कर दी गई है।' : 'Notice: The annual examination datesheet has been published.',
                  label: lang === 'hi' ? 'परीक्षा नोटिस' : 'Exam Notice',
                },
                {
                  text: lang === 'hi' ? 'स्मरण पत्र: कृपया इस माह का बकाया स्कूल शुल्क समय पर जमा कराएं।' : 'Reminder: Kindly clear outstanding school fee dues at earliest.',
                  label: lang === 'hi' ? 'शुल्क स्मरण' : 'Fee Reminder',
                },
              ].map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickTemplate(tpl.text)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950 whitespace-nowrap transition-colors"
                >
                  + {tpl.label}
                </button>
              ))}
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-gray-50/30 dark:bg-slate-950/20">
              {activeMessages.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-xs">{lang === 'hi' ? 'कोई संदेश नहीं। बातचीत शुरू करने के लिए नीचे लिखें।' : 'No messages yet. Send a message to start the conversation.'}</p>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}
                    >
                      <div className="flex items-baseline gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold text-gray-400">
                          {isMe ? (lang === 'hi' ? 'आप (प्रशासक)' : 'You (Admin)') : msg.senderName}
                        </span>
                        <span className="text-[9px] text-gray-400">{msg.time}</span>
                      </div>

                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm',
                          isMe
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-tl-none'
                        )}
                      >
                        <p className="leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lang === 'hi' ? 'संदेश टाइप करें...' : 'Type your message...'}
                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500/20"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
