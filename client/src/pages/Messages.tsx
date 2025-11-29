import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Send, Video, Calendar, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  bookingId: string;
  mentorId: string;
  learnerId: string;
  meetingLink: string | null;
  isActive: boolean;
  createdAt: string;
  lastMessage?: Message;
  otherUser?: { id: string; name: string; profileImage: string | null };
  experience?: { id: string; title: string };
  sessionDate?: string;
  unreadCount?: number;
  messages?: Message[];
  booking?: { id: string; status: string };
}

export default function Messages() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Fetch conversations list
  const { data: conversations, isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  // Fetch selected conversation details
  const { data: conversationDetails, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", selectedConversation?.id],
    enabled: !!selectedConversation?.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedConversation) return;
      return apiRequest("POST", `/api/conversations/${selectedConversation.id}/messages`, { content });
    },
    onSuccess: () => {
      setNewMessage("");
      refetchConversation();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency for a pleasant notification tone
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';
      
      // Set timing for a short, quiet beep
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume: 30%
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log("Audio notification not available");
    }
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", userId: user.id }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "new_message") {
        // Play notification sound for new messages from others
        if (data.senderId !== user.id) {
          playNotificationSound();
        }
        
        // Add message to local state immediately for instant display
        if (selectedConversation && data.conversationId === selectedConversation.id) {
          setLocalMessages(prev => {
            // Avoid duplicate messages
            if (prev.some(m => m.id === data.message.id)) {
              return prev;
            }
            return [...prev, data.message];
          });
        }
        
        // Refresh conversations list and current conversation
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        if (selectedConversation && data.conversationId === selectedConversation.id) {
          refetchConversation();
        }
      } else if (data.type === "typing") {
        if (data.userId !== user.id) {
          setOtherUserTyping(data.isTyping);
        }
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [user, selectedConversation, playNotificationSound]);

  // Join/leave conversation rooms and reset local messages
  useEffect(() => {
    // Reset local messages when switching conversations
    setLocalMessages([]);
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (selectedConversation) {
      wsRef.current.send(JSON.stringify({ 
        type: "join_conversation", 
        conversationId: selectedConversation.id 
      }));
    }

    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && selectedConversation) {
        wsRef.current.send(JSON.stringify({ type: "leave_conversation" }));
      }
    };
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationDetails?.messages]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    if (!isTyping) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({ type: "typing", isTyping: true }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "typing", isTyping: false }));
      }
    }, 2000);
  }, [isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(newMessage.trim());
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return format(date, "h:mm a", { locale: ar });
    }
    return format(date, "d MMM h:mm a", { locale: ar });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Card className="p-6">
          <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول إلى الرسائل</p>
          <Button className="mt-4 w-full" onClick={() => navigate("/signin")} data-testid="button-signin">
            تسجيل الدخول
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" />
            الرسائل
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">المحادثات</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {loadingConversations ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : conversations && conversations.length > 0 ? (
                  <div className="space-y-1 p-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`w-full text-right p-3 rounded-lg transition-colors hover-elevate ${
                          selectedConversation?.id === conv.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted"
                        }`}
                        data-testid={`conversation-${conv.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={conv.otherUser?.profileImage || undefined} />
                            <AvatarFallback>
                              {conv.otherUser?.name?.charAt(0) || "؟"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">
                                {conv.otherUser?.name || "مستخدم"}
                              </span>
                              {conv.unreadCount && conv.unreadCount > 0 && (
                                <Badge variant="default" className="text-xs">
                                  {conv.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.experience?.title || "تجربة"}
                            </p>
                            {conv.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {conv.lastMessage.content.substring(0, 30)}
                                {conv.lastMessage.content.length > 30 ? "..." : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">لا توجد محادثات بعد</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      ستظهر المحادثات عند قبول حجز
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedConversation && conversationDetails ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversationDetails.otherUser?.profileImage || undefined} />
                        <AvatarFallback>
                          {conversationDetails.otherUser?.name?.charAt(0) || "؟"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{conversationDetails.otherUser?.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {conversationDetails.experience?.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversationDetails.sessionDate && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(conversationDetails.sessionDate), "d MMM", { locale: ar })}
                        </Badge>
                      )}
                      {conversationDetails.meetingLink && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.open(conversationDetails.meetingLink!, "_blank")}
                          className="flex items-center gap-1"
                          data-testid="button-join-meeting"
                        >
                          <Video className="h-4 w-4" />
                          انضم للاجتماع
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages Area */}
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-420px)] p-4">
                    <div className="space-y-4">
                      {(localMessages.length > 0 ? localMessages : conversationDetails.messages)?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.senderId === user.id ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.messageType === "system"
                                ? "bg-primary/10 text-center w-full max-w-full"
                                : msg.senderId === user.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                            <p className={`text-xs mt-1 ${
                              msg.senderId === user.id ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}>
                              {formatMessageTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {otherUserTyping && (
                        <div className="flex justify-end">
                          <div className="bg-muted rounded-lg p-3 flex items-center gap-1">
                            <span className="animate-bounce">.</span>
                            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span>
                            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      placeholder="اكتب رسالتك..."
                      className="flex-1"
                      disabled={!conversationDetails.isActive || sendMessageMutation.isPending}
                      data-testid="input-message"
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || !conversationDetails.isActive || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                  {!conversationDetails.isActive && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      هذه المحادثة غير نشطة
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="bg-primary/10 rounded-full p-6 mb-4">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">مرحباً بك في الرسائل</h3>
                <p className="text-muted-foreground max-w-md">
                  اختر محادثة من القائمة للبدء. ستتمكن من التواصل مع المرشد أو المتعلم
                  ومشاركة رابط الاجتماع.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
