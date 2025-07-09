import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Phone, Users, UserPlus, CheckCircle, XCircle, Settings, LogOut, Grid3X3 } from 'lucide-react';
import { salesysApi } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { format } from "date-fns"
import { sv } from 'date-fns/locale';
import DashboardCard from './DashboardCard';
import DashboardListCard from './DashboardListCard';
import DashboardDetailView from './DashboardDetailView';
import StatisticsView from './StatisticsView';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { supabase } from '@/integrations/supabase/client';
import { AuthUtils } from './Authentication';

interface DashboardProps {
  onStatisticsClick: (statType: 'avtal' | 'samtal' | 'ordrar') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStatisticsClick }) => {
  const { toast } = useToast();
  const [currentView, setCurrentView] = useState<'welcome' | 'navigation' | 'section' | 'dashboard' | 'statistics'>('welcome');
  const [activeSection, setActiveSection] = useState<'ringlistor' | 'anvandare' | 'team'>('ringlistor');
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  const [selectedStatType, setSelectedStatType] = useState<'avtal' | 'samtal' | 'ordrar' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [avtalsData, setAvtalsData] = useState<Array<{ date: string; value: number }>>([]);
  const [samtalData, setSamtalData] = useState<Array<{ date: string; value: number }>>([]);
  const [ordrarData, setOrdrarData] = useState<Array<{ date: string; value: number }>>([]);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [dialGroups, setDialGroups] = useState<any[]>([]);
  const [loadingDialGroups, setLoadingDialGroups] = useState(true);
  const [dialGroupsError, setDialGroupsError] = useState<string | null>(null);
  const [dialGroupSummaries, setDialGroupSummaries] = useState<any[]>([]);
  const [loadingDialGroupSummaries, setLoadingDialGroupSummaries] = useState(true);
  const [dialGroupSummariesError, setDialGroupSummariesError] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [dashboardResults, setDashboardResults] = useState<any>(null);
  const [loadingDashboardResults, setLoadingDashboardResults] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [loadingUserName, setLoadingUserName] = useState(true);
  const [cachedStatisticsData, setCachedStatisticsData] = useState<Map<string, any>>(new Map());
  const [loadingCachedStatistics, setLoadingCachedStatistics] = useState(false);

  // Helper function to extract username from s2_uname cookie
  const getUsernameFromCookie = (): string | null => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('s2_uname=')) {
        const username = trimmed.substring('s2_uname='.length);
        console.log('Found username in cookie:', username);
        return username;
      }
    }
    console.log('No s2_uname cookie found');
    return null;
  };

  // Helper function to get first name from full name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };

  // Load user name from API
  useEffect(() => {
    const loadUserName = async () => {
      if (!salesysApi.getBearerToken()) {
        setLoadingUserName(false);
        return;
      }

      const username = getUsernameFromCookie();
      if (!username) {
        setUserFirstName('Användare');
        setLoadingUserName(false);
        return;
      }

      try {
        console.log('Loading users to find first name for username:', username);
        const users = await salesysApi.getUsers();
        console.log('Loaded users:', users);
        
        const currentUser = users.find(user => user.username === username);
        if (currentUser) {
          const firstName = getFirstName(currentUser.fullName);
          console.log('Found user with fullName:', currentUser.fullName, 'firstName:', firstName);
          setUserFirstName(firstName);
        } else {
          console.log('User not found with username:', username);
          setUserFirstName('Användare');
        }
      } catch (error) {
        console.error('Error loading user name:', error);
        setUserFirstName('Användare');
      } finally {
        setLoadingUserName(false);
      }
    };

    loadUserName();
  }, []);

  // Helper function to get date range for a specific date
  const getDateRange = (date: Date): { from: string; to: string } => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    return {
      from: targetDate.toISOString().split('T')[0],
      to: nextDay.toISOString().split('T')[0]
    };
  };

  // Helper function to aggregate hourly data and convert to Stockholm time
  const aggregateHourlyData = (data: any[]): Array<{ date: string; value: number }> => {
    const hourlyMap = new Map<string, number>();
    
    data.forEach(item => {
      const utcDate = new Date(item.intervalStart);
      const stockholmDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
      const hour = stockholmDate.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      const currentCount = hourlyMap.get(hourKey) || 0;
      hourlyMap.set(hourKey, currentCount + item.count);
    });

    const result = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      result.push({
        date: hourKey,
        value: hourlyMap.get(hourKey) || 0
      });
    }
    
    return result;
  };

  // Helper function to check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    const targetDate = new Date(date);
    return targetDate.toDateString() === today.toDateString();
  };

  // Helper function to crop chart data to only show hours with data
  const cropChartData = (data: Array<{ date: string; value: number }>): Array<{ date: string; value: number }> => {
    // For welcome cards, we want to show the full day range if it's today, or show data range for other days
    if (data.length === 0) return [];

    // If it's today, show more hours to give better context
    if (isToday(selectedDate)) {
      // Find first and last hour with data
      let firstHourWithData = -1;
      let lastHourWithData = -1;

      for (let i = 0; i < data.length; i++) {
        if (data[i].value > 0) {
          if (firstHourWithData === -1) {
            firstHourWithData = i;
          }
          lastHourWithData = i;
        }
      }

      // If no data found, show current time range
      if (firstHourWithData === -1) {
        const currentHour = new Date().getHours();
        const startIndex = Math.max(0, currentHour - 3);
        const endIndex = Math.min(data.length - 1, currentHour + 1);
        return data.slice(startIndex, endIndex + 1);
      }

      // Show from start of data to current hour + 1, or end of data
      const currentHour = new Date().getHours();
      const startIndex = Math.max(0, firstHourWithData - 1);
      const endIndex = Math.min(data.length - 1, Math.max(lastHourWithData + 1, currentHour + 1));

      return data.slice(startIndex, endIndex + 1);
    } else {
      // For other days, show the data range
      let firstHourWithData = -1;
      let lastHourWithData = -1;

      for (let i = 0; i < data.length; i++) {
        if (data[i].value > 0) {
          if (firstHourWithData === -1) {
            firstHourWithData = i;
          }
          lastHourWithData = i;
        }
      }

      // If no data found, return empty array
      if (firstHourWithData === -1) {
        return [];
      }

      // Add some padding around the data (1 hour before first, 1 hour after last)
      const startIndex = Math.max(0, firstHourWithData - 1);
      const endIndex = Math.min(data.length - 1, lastHourWithData + 1);

      return data.slice(startIndex, endIndex + 1);
    }
  };

  // Helper function to get relative date text
  const getRelativeDateText = (date: Date): string => {
    const today = new Date();
    const targetDate = new Date(date);
    
    // Check if it's today
    if (targetDate.toDateString() === today.toDateString()) {
      return "Idag";
    }
    
    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (targetDate.toDateString() === yesterday.toDateString()) {
      return "Igår";
    }
    
    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (targetDate.toDateString() === tomorrow.toDateString()) {
      return "Imorgon";
    }
    
    // Check if it's the same year
    if (targetDate.getFullYear() === today.getFullYear()) {
      return format(targetDate, "d MMMM", { locale: sv });
    }
    
    // Different year, include year
    return format(targetDate, "d MMMM yyyy", { locale: sv });
  };

  // Load statistics data based on selected date (only for welcome screen)
  useEffect(() => {
    if (currentView !== 'welcome') return;

    const loadStatistics = async () => {
      if (!salesysApi.getBearerToken()) return;

      console.log('Loading welcome card statistics data for date:', selectedDate);
      setLoadingStatistics(true);
      const { from, to } = getDateRange(selectedDate);

      try {
        const [offerStats, callStats, orderStats] = await Promise.all([
          salesysApi.getOfferStatistics({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getCallStatisticsHourly({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getOrderStatisticsHourly({ from, to, fixedIntervalType: 'hour' })
        ]);

        const newAvtalsData = aggregateHourlyData(offerStats);
        const newSamtalData = aggregateHourlyData(callStats);
        const newOrdrarData = aggregateHourlyData(orderStats);

        setAvtalsData(newAvtalsData);
        setSamtalData(newSamtalData);
        setOrdrarData(newOrdrarData);

        console.log('Loaded welcome card hourly statistics:', { 
          avtal: newAvtalsData, 
          samtal: newSamtalData, 
          ordrar: newOrdrarData 
        });

      } catch (error) {
        console.error('Error loading welcome card statistics:', error);
      } finally {
        setLoadingStatistics(false);
      }
    };

    loadStatistics();
  }, [selectedDate, currentView]);

  // Load detailed statistics data in background when navigating to welcome
  useEffect(() => {
    if (currentView !== 'welcome') return;

    const loadDetailedStatistics = async () => {
      setLoadingCachedStatistics(true);
      try {
        console.log('Starting background fetch of detailed statistics data...');
        
        // Get date ranges for different time periods that the user might select
        const now = new Date();
        const dateRanges = {
          'last30days': {
            from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().split('T')[0],
            to: now.toISOString().split('T')[0]
          },
          'month': {
            from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          },
          'week': {
            from: (() => {
              const currentDay = now.getDay();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
              return startOfWeek.toISOString().split('T')[0];
            })(),
            to: (() => {
              const currentDay = now.getDay();
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (currentDay === 0 ? 0 : 7 - currentDay));
              return endOfWeek.toISOString().split('T')[0];
            })()
          }
        };

        // Load statistics for different time ranges and stat types
        const statisticsPromises = [];
        const statTypes = ['avtal', 'samtal', 'ordrar'] as const;
        
        for (const [timeRange, { from, to }] of Object.entries(dateRanges)) {
          for (const statType of statTypes) {
            statisticsPromises.push(
              (async () => {
                try {
                  let data;
                  if (statType === 'avtal') {
                    data = await salesysApi.getOfferStatistics({
                      from,
                      to,
                      fixedIntervalType: 'day'
                    });
                  } else if (statType === 'samtal') {
                    data = await salesysApi.getCallStatisticsHourly({
                      from,
                      to,
                      fixedIntervalType: 'day'
                    });
                  } else if (statType === 'ordrar') {
                    data = await salesysApi.getOrderStatisticsHourly({
                      from,
                      to,
                      fixedIntervalType: 'day'
                    });
                  }
                  
                  const cacheKey = `${statType}-${timeRange}`;
                  console.log(`Loaded detailed statistics for ${cacheKey}:`, data);
                  return { cacheKey, data };
                } catch (error) {
                  console.error(`Error loading detailed statistics for ${statType}-${timeRange}:`, error);
                  return { cacheKey: `${statType}-${timeRange}`, data: null };
                }
              })()
            );
          }
        }

        // Wait for all statistics to load
        const allStatistics = await Promise.all(statisticsPromises);
        
        // Cache the results
        const statisticsMap = new Map();
        allStatistics.forEach(({ cacheKey, data }) => {
          if (data) {
            statisticsMap.set(cacheKey, data);
          }
        });
        
        setCachedStatisticsData(statisticsMap);
        console.log('Cached all detailed statistics:', statisticsMap);
        setLoadingCachedStatistics(false);
      } catch (error) {
        console.error('Error loading detailed statistics:', error);
        setLoadingCachedStatistics(false);
      }
    };

    loadDetailedStatistics();
  }, [currentView]);

  // Load dashboards when navigating to welcome
  useEffect(() => {
    if (currentView !== 'welcome') return;

    const loadDashboards = async () => {
      setLoadingDashboards(true);
      try {
        const dashboardsData = await salesysApi.getDashboards();
        setDashboards(dashboardsData);
        console.log('Loaded dashboards:', dashboardsData);
      } catch (error) {
        console.error('Error loading dashboards:', error);
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda statistikvyer.",
          variant: "destructive",
        });
      } finally {
        setLoadingDashboards(false);
      }
    };

    loadDashboards();
  }, [currentView]);

  // Load dial groups only when navigating to the ringlistor section
  useEffect(() => {
    if (currentView !== 'section' || activeSection !== 'ringlistor') return;

    const loadDialGroups = async () => {
      setLoadingDialGroups(true);
      setDialGroupsError(null);
      try {
        const response = await salesysApi.getDialGroups();
        setDialGroups(response.data);
      } catch (error) {
        console.error('Error loading dial groups:', error);
        setDialGroupsError('Kunde inte ladda ringlistor.');
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda ringlistor.",
          variant: "destructive",
        })
      } finally {
        setLoadingDialGroups(false);
      }
    };

    loadDialGroups();
  }, [currentView, activeSection]);

  // Load dial group summaries only when dial groups are loaded and in ringlistor section
  useEffect(() => {
    if (dialGroups.length === 0 || currentView !== 'section' || activeSection !== 'ringlistor') return;

    const loadDialGroupSummaries = async () => {
      setLoadingDialGroupSummaries(true);
      setDialGroupSummariesError(null);

      try {
        const dialGroupIds = dialGroups.map(group => group.id);
        const summaries = await salesysApi.getDialGroupSummaries(dialGroupIds);
        setDialGroupSummaries(summaries);
      } catch (error) {
        console.error('Error loading dial group summaries:', error);
        setDialGroupSummariesError('Kunde inte ladda ringlistesammanfattningar.');
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda ringlistesammanfattningar.",
          variant: "destructive",
        })
      } finally {
        setLoadingDialGroupSummaries(false);
      }
    };

    loadDialGroupSummaries();
  }, [dialGroups, currentView, activeSection]);

  // Load dashboard results
  useEffect(() => {
    if (!selectedDashboard || currentView !== 'dashboard') return;

    const loadDashboardResults = async () => {
      setLoadingDashboardResults(true);
      try {
        const results = await salesysApi.getDashboardResults(selectedDashboard.id);
        setDashboardResults(results);
        console.log('Loaded dashboard results:', results);
      } catch (error) {
        console.error('Error loading dashboard results:', error);
        toast({
          title: "Något gick fel.",
          description: "Kunde inte ladda dashboard-resultat.",
          variant: "destructive",
        });
      } finally {
        setLoadingDashboardResults(false);
      }
    };

    loadDashboardResults();
  }, [selectedDashboard, currentView]);

  const getTotalFromHourlyData = (data: Array<{ date: string; value: number }>): number => {
    return data.reduce((sum, item) => sum + item.value, 0);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleSectionNavigation = (section: 'ringlistor' | 'anvandare' | 'team') => {
    setActiveSection(section);
    setCurrentView('section');
  };

  const handleDashboardClick = (dashboard: any) => {
    setSelectedDashboard(dashboard);
    setCurrentView('dashboard');
  };

  const handleStatisticsClick = (statType: 'avtal' | 'samtal' | 'ordrar') => {
    console.log('Statistics clicked:', statType);
    setSelectedStatType(statType);
    setCurrentView('statistics');
    // Also call the parent's onStatisticsClick for any additional handling
    onStatisticsClick(statType);
  };

  const handleBackToWelcome = () => {
    setCurrentView('welcome');
    setSelectedDashboard(null);
    setSelectedStatType(null);
    setDashboardResults(null);
  };

  const handleBackToSection = () => {
    setCurrentView('section');
    setSelectedDashboard(null);
    setSelectedStatType(null);
    setDashboardResults(null);
  };

  const handleNavigationClick = () => {
    setCurrentView('navigation');
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out - clearing auth cookies and Supabase session');
      
      // Clear all SaleSys authentication cookies
      AuthUtils.clearAuthCookies();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Force reload to reset all state and redirect to login
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Något gick fel.",
        description: "Kunde inte logga ut.",
        variant: "destructive",
      });
    }
  };

  if (currentView === 'welcome') {
    const isSelectedDateToday = isToday(selectedDate);
    const croppedAvtalsData = cropChartData(avtalsData);
    const croppedSamtalData = cropChartData(samtalData);
    const croppedOrdrarData = cropChartData(ordrarData);

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="container mx-auto px-4 py-12 flex-1">
          <div className="flex justify-between items-start mb-6 mt-12">
            <div className="flex items-baseline gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNavigationClick}
                className="border-0 mr-2"
              >
                <Grid3X3 className="h-5 w-5" />
              </Button>
              <h1 className="text-4xl font-light text-gray-800">
                Hej {loadingUserName ? '...' : userFirstName}
              </h1>
              <p className="text-lg text-gray-600">
                {getRelativeDateText(selectedDate)}
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="border-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DashboardCard
              title="Avtal signerade"
              count={getTotalFromHourlyData(avtalsData)}
              isLoading={false}
              color="green"
              chartData={croppedAvtalsData.length > 0 ? croppedAvtalsData : (avtalsData.length > 0 ? avtalsData : [])}
              onClick={() => handleStatisticsClick('avtal')}
              showLiveDot={isSelectedDateToday}
            />
            
            <DashboardCard
              title="Samtal genomförda"
              count={getTotalFromHourlyData(samtalData)}
              isLoading={false}
              color="blue"
              chartData={croppedSamtalData.length > 0 ? croppedSamtalData : (samtalData.length > 0 ? samtalData : [])}
              onClick={() => handleStatisticsClick('samtal')}
              showLiveDot={isSelectedDateToday}
            />
            
            <DashboardCard
              title="Ordrar skapade"
              count={getTotalFromHourlyData(ordrarData)}
              isLoading={false}
              color="purple"
              chartData={croppedOrdrarData.length > 0 ? croppedOrdrarData : (ordrarData.length > 0 ? ordrarData : [])}
              onClick={() => handleStatisticsClick('ordrar')}
              showLiveDot={isSelectedDateToday}
            />
          </div>


          {/* Dashboards List */}
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-light flex items-center gap-2">
                Statistikvyer
                {loadingCachedStatistics && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Laddar statistikdata i bakgrunden...
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDashboards ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-200 h-16 rounded-lg" />
                  ))}
                </div>
              ) : dashboards.length > 0 ? (
                <div className="space-y-3">
                  {dashboards.map((dashboard) => (
                    <DashboardListCard
                      key={dashboard.id}
                      dashboard={dashboard}
                      onClick={() => handleDashboardClick(dashboard)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Inga statistikvyer hittades.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="py-6 px-4">
          <div className="container mx-auto">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-gray-500">Skapad av SaleSys</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'statistics') {
    return (
      <StatisticsView
        statType={selectedStatType!}
        onBack={handleBackToWelcome}
        cachedStatisticsData={cachedStatisticsData}
      />
    );
  }

  if (currentView === 'section') {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-light text-gray-800">
              {activeSection === 'ringlistor' ? 'Ringlistor' : 
               activeSection === 'anvandare' ? 'Användare' : 'Team'}
            </h1>
            <Button variant="outline" onClick={handleBackToWelcome}>
              Tillbaka till översikt
            </Button>
          </div>

          {activeSection === 'ringlistor' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Ringlistor</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDialGroups ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="bg-gray-200 h-4 w-32 rounded" />
                        <div className="bg-gray-200 h-4 w-12 rounded" />
                      </div>
                    ))}
                  </div>
                ) : dialGroupsError ? (
                  <div className="text-red-500">{dialGroupsError}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">ID</TableHead>
                          <TableHead>Namn</TableHead>
                          <TableHead>Kontakter</TableHead>
                          <TableHead>Reserverade</TableHead>
                          <TableHead>Skippade</TableHead>
                          <TableHead>Karantän</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dialGroups.map((group) => {
                          const summary = dialGroupSummaries.find(s => s.dialGroupId === group.id)?.summary;
                          return (
                            <TableRow key={group.id}>
                              <TableCell className="font-medium">{group.serialId}</TableCell>
                              <TableCell>{group.name}</TableCell>
                              <TableCell>{summary?.contactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.reservedContactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.skippedContactCount ?? 'N/A'}</TableCell>
                              <TableCell>{summary?.quarantinedContactCount ?? 'N/A'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'anvandare' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Användare</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Här kommer en lista med användare.</p>
              </CardContent>
            </Card>
          )}

          {activeSection === 'team' && (
            <Card className="bg-white border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-light">Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Här kommer en lista med team.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'navigation') {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-light text-gray-800">Navigation</h1>
            <Button variant="outline" onClick={handleBackToWelcome}>
              Tillbaka till översikt
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Card 
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleSectionNavigation('anvandare')}
            >
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Användare</h3>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleSectionNavigation('ringlistor')}
            >
              <CardContent className="p-6 text-center">
                <Phone className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Ringlistor</h3>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleStatisticsClick('avtal')}
            >
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Avtal</h3>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleStatisticsClick('samtal')}
            >
              <CardContent className="p-6 text-center">
                <Phone className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Samtal</h3>
              </CardContent>
            </Card>

            <Card 
              className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => handleStatisticsClick('ordrar')}
            >
              <CardContent className="p-6 text-center">
                <UserPlus className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Ordrar</h3>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm rounded-2xl cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Settings className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                <h3 className="text-lg font-light text-gray-800">Inställningar</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard view
  return (
    <DashboardDetailView
      dashboard={selectedDashboard}
      onBack={handleBackToWelcome}
    />
  );
};

export default Dashboard;
