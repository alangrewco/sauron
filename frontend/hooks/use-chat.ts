import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
    };
    
    const botMessagePlaceholder: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
    };

    setMessages(prev => [...prev, userMessage, botMessagePlaceholder]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const jsonString = line.replace('data: ', '');
            try {
                const parsed = JSON.parse(jsonString);
                if (parsed.response) {
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === botMessagePlaceholder.id
                                ? { ...msg, content: msg.content + parsed.response }
                                : msg
                        )
                    );
                }
            } catch (e) {
                console.error('Failed to parse stream chunk:', jsonString);
            }
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('An unknown error occurred.');
      setError(err);
      setMessages(prev =>
        prev.map(msg =>
            msg.id === botMessagePlaceholder.id
                ? { ...msg, content: `Error: ${err.message}` }
                : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, isLoading, error, sendMessage };
};