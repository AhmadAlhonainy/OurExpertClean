import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Search, User, LogOut, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["/api/unread-messages"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isActive = (path: string) => location === path;
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">خ</span>
            </div>
            <span className="font-display font-bold text-xl">منصة الخبرات</span>
          </Link>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث عن تجارب..."
                className="pr-10 text-right"
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Button
              variant={isActive("/experiences") ? "secondary" : "ghost"}
              asChild
              data-testid="link-experiences"
            >
              <Link href="/experiences">احجز موعداً</Link>
            </Button>
            <Button
              variant={isActive("/become-mentor") ? "secondary" : "ghost"}
              asChild
              data-testid="link-become-mentor"
            >
              <Link href="/become-mentor">كن مرشداً</Link>
            </Button>
            
            {isAuthenticated ? (
              <>
                <Button
                  variant={isActive("/messages") ? "secondary" : "ghost"}
                  size="icon"
                  asChild
                  className="relative"
                  data-testid="button-messages"
                >
                  <Link href="/messages">
                    <MessageCircle className="w-5 h-5" />
                    {unreadData?.unreadCount && unreadData.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {unreadData.unreadCount > 9 ? "9+" : unreadData.unreadCount}
                      </span>
                    )}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-profile">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-right">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{user?.name || 'المستخدم'}</p>
                        <Badge variant={
                          user?.role === 'admin' ? 'default' :
                          user?.role === 'mentor' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {user?.role === 'admin' ? 'مسؤول' :
                           user?.role === 'mentor' ? 'مرشد خبير' : 'متعلم'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {user?.role === 'admin' && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        صلاحيات الإدارة
                      </div>
                      <DropdownMenuItem className="text-right cursor-pointer" asChild>
                        <Link href="/dashboard/manager" data-testid="link-manager-dashboard">
                          لوحة التحكم
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-right cursor-pointer" asChild>
                        <Link href="/dashboard/admin" data-testid="link-admin-dashboard">
                          لوحة الإدارة
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  <DropdownMenuItem className="text-right cursor-pointer" asChild>
                    <Link href="/messages" className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      الرسائل
                      {unreadData?.unreadCount && unreadData.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs mr-auto">
                          {unreadData.unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    لوحات التحكم
                  </div>
                  
                  <DropdownMenuItem className="text-right cursor-pointer" asChild>
                    <Link href="/dashboard/learner">
                      متابعة جلساتي
                    </Link>
                  </DropdownMenuItem>
                  
                  {(user?.role === 'mentor' || user?.role === 'admin') && (
                    <>
                      <DropdownMenuItem className="text-right cursor-pointer" asChild>
                        <Link href="/dashboard/mentor" data-testid="link-mentor-dashboard">
                          لوحة المرشد
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-right cursor-pointer" asChild>
                        <Link href="/become-mentor">
                          إضافة تجربة جديدة
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {user?.role !== 'mentor' && user?.role !== 'admin' && (
                    <DropdownMenuItem className="text-right cursor-pointer" asChild>
                      <Link href="/become-mentor">
                        أصبح مرشداً خبيراً
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-right cursor-pointer text-destructive"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <Button variant="default" asChild data-testid="button-signin">
                <Link href="/signin">تسجيل الدخول</Link>
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t">
            <div className="pb-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="ابحث عن تجارب..."
                  className="pr-10 text-right"
                  data-testid="input-search-mobile"
                />
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/experiences">احجز موعداً</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start" asChild>
              <Link href="/become-mentor">كن مرشداً</Link>
            </Button>
            {isAuthenticated ? (
              <>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/messages">
                    <MessageCircle className="w-5 h-5 ml-2" />
                    الرسائل
                    {unreadData?.unreadCount && unreadData.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs mr-auto">
                        {unreadData.unreadCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/dashboard/learner">
                    <User className="w-5 h-5 ml-2" />
                    متابعة جلساتي
                  </Link>
                </Button>
                {(user?.role === 'mentor' || user?.role === 'admin') && (
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard/mentor">
                      لوحة المرشد
                    </Link>
                  </Button>
                )}
                {user?.role === 'admin' && (
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/dashboard/admin">
                      لوحة الإدارة
                    </Link>
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleLogout}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="w-5 h-5 ml-2" />
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <Button variant="default" className="w-full" asChild data-testid="button-signin-mobile">
                <Link href="/signin">تسجيل الدخول</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
