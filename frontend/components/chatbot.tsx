'use client';

import { useRef, useEffect } from 'react';
import { useChat, Message } from '@/hooks/use-chat';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendIcon, BotIcon, UserIcon, LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

function ChatMessage({ message }: { message: Message }) {
    const isUser = message.role === 'user';
    return (
        <div className={cn("flex items-start gap-3", isUser && "justify-end")}>
            {!isUser && (
                <div className="flex-shrink-0 size-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <BotIcon className="size-5" />
                </div>
            )}
            <div
                className={cn(
                    "p-3 rounded-lg max-w-[85%]",
                    isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                )}
            >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
             {isUser && (
                <div className="flex-shrink-0 size-8 bg-muted rounded-full flex items-center justify-center">
                    <UserIcon className="size-5" />
                </div>
            )}
        </div>
    );
}

export function Chatbot() {
    const { messages, isLoading, sendMessage } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const message = formData.get('message') as string;
        sendMessage(message);
        event.currentTarget.reset();
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full">
                        <BotIcon className="size-8 mb-2" />
                        <p>Ask Sauron where people are.</p>
                        <p className="text-xs mt-2">e.g., &quot;Who was near the bank on University Ave yesterday at 3 PM?&quot;</p>
                    </div>
                ) : (
                    messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
            </div>
            
            <Separator />

            <div className="p-4">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        name="message"
                        placeholder="Ask a question..."
                        autoComplete="off"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading} aria-label="Send message">
                        {isLoading ? (
                            <LoaderIcon className="animate-spin" />
                        ) : (
                            <SendIcon />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}