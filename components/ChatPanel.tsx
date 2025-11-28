import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, HelpCircle } from 'lucide-react';
import { ChatMessage } from '../types';
import { chatWithCoach } from '../services/gemini';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  context: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ context }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I am your safety dispatcher. Ask me anything about the current situation or general survival tips.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatWithCoach(messages.concat(userMsg), context);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection weak. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="bg-stone-100 p-3 border-b border-stone-200 flex items-center gap-2">
        <Bot className="w-5 h-5 text-nature-600" />
        <span className="font-semibold text-stone-700 text-sm">Safety Coach</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-nature-600 text-white rounded-br-none' 
                : 'bg-stone-100 text-stone-800 rounded-bl-none'
            }`}>
              {msg.role === 'model' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-stone-100 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-stone-200 bg-white">
        <div className="flex items-center gap-2 bg-stone-50 rounded-full border border-stone-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-nature-500 transition-all">
          <input 
            type="text" 
            className="flex-1 bg-transparent outline-none text-sm text-stone-800 placeholder-stone-400"
            placeholder="Ask for advice..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-1.5 bg-nature-600 text-white rounded-full hover:bg-nature-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
