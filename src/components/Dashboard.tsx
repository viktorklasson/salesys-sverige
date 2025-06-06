import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Phone, Users, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { salesysApi } from '@/services/salesysApi';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDateRangePicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from '@/lib/utils';
import { DateRange, format } from "date-fns"
import { sv } from 'date-fns/locale';
import DashboardCard from './DashboardCard';
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

interface DashboardProps {
  onStatisticsClick: (statType: 'avtal' | 'samtal' | 'ordrar') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStatisticsClick }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'ringlistor' | 'anvandare' | 'team'>('ringlistor');
  const [avtalsData, setAvtalsData] = useState<Array<{ date: string; value: number }>>([]);
  const [samtalData, setSamtalData] = useState<Array<{ date: string; value: number }>>([]);
  const [ordrarData, setOrdrarData] = useState<Array<{ date: string; value: number }>>([]);
  const [dialGroups, setDialGroups] = useState<any[]>([]);
  const [loadingDialGroups, setLoadingDialGroups] = useState(true);
  const [dialGroupsError, setDialGroupsError] = useState<string | null>(null);
  const [dialGroupSummaries, setDialGroupSummaries] = useState<any[]>([]);
  const [loadingDialGroupSummaries, setLoadingDialGroupSummaries] = useState(true);
  const [dialGroupSummariesError, setDialGroupSummariesError] = useState<string | null>(null);

  // Helper function to get today's date range in Stockholm timezone
  const getTodayStockholmRange = (): { from: string; to: string } => {
    const now = new Date();
    const stockholmTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
    
    const today = new Date(stockholmTime);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return {
      from: today.toISOString().split('T')[0], // YYYY-MM-DD format
      to: tomorrow.toISOString().split('T')[0]  // YYYY-MM-DD format
    };
  };

  // Helper function to aggregate hourly data and convert to Stockholm time
  const aggregateHourlyData = (data: any[]): Array<{ date: string; value: number }> => {
    const hourlyMap = new Map<string, number>();
    
    data.forEach(item => {
      // Convert UTC time to Stockholm time for display
      const utcDate = new Date(item.intervalStart);
      const stockholmDate = new Date(utcDate.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
      const hour = stockholmDate.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      const currentCount = hourlyMap.get(hourKey) || 0;
      hourlyMap.set(hourKey, currentCount + item.count);
    });

    // Create array for all 24 hours
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

  // Load statistics data
  useEffect(() => {
    const loadStatistics = async () => {
      if (!salesysApi.getBearerToken()) return;

      console.log('Preloading statistics data...');
      const { from, to } = getTodayStockholmRange();

      try {
        // Load hourly statistics for today
        const [offerStats, callStats, orderStats] = await Promise.all([
          salesysApi.getOfferStatistics({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getCallStatisticsHourly({ from, to, fixedIntervalType: 'hour' }),
          salesysApi.getOrderStatisticsHourly({ from, to, fixedIntervalType: 'hour' })
        ]);

        // Aggregate and convert data
        const avtalsData = aggregateHourlyData(offerStats);
        const samtalData = aggregateHourlyData(callStats);
        const ordrarData = aggregateHourlyData(orderStats);

        setAvtalsData(avtalsData);
        setSamtalData(samtalData);
        setOrdrarData(ordrarData);

        console.log('Loaded hourly statistics:', { 
          avtal: avtalsData, 
          samtal: samtalData, 
          ordrar: ordrarData 
        });

      } catch (error) {
        console.error('Error loading statistics:', error);
      }
    };

    loadStatistics();
  }, []);

  // Load dial groups
  useEffect(() => {
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
  }, []);

  // Load dial group summaries
  useEffect(() => {
    const loadDialGroupSummaries = async () => {
      if (dialGroups.length === 0) return;

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
  }, [dialGroups]);

  const getTotalFromHourlyData = (data: Array<{ date: string; value: number }>): number => {
    return data.reduce((sum, item) => sum + item.value, 0);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 py-4 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-light text-gray-800">Dashboard</h1>
        </div>
      </div>

      {/* Navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant={activeSection === 'ringlistor' ? 'default' : 'outline'}
            onClick={() => setActiveSection('ringlistor')}
          >
            Ringlistor
          </Button>
          <Button
            variant={activeSection === 'anvandare' ? 'default' : 'outline'}
            onClick={() => setActiveSection('anvandare')}
          >
            Användare
          </Button>
          <Button
            variant={activeSection === 'team' ? 'default' : 'outline'}
            onClick={() => setActiveSection('team')}
          >
            Team
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Section Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <DashboardCard
            title="Avtal signerade"
            count={getTotalFromHourlyData(avtalsData)}
            isLoading={!avtalsData.length}
            color="green"
            chartData={avtalsData}
            onClick={() => onStatisticsClick('avtal')}
          />
          <DashboardCard
            title="Samtal genomförda"
            count={getTotalFromHourlyData(samtalData)}
            isLoading={!samtalData.length}
            color="blue"
            chartData={samtalData}
            onClick={() => onStatisticsClick('samtal')}
          />
          <DashboardCard
            title="Ordrar skapade"
            count={getTotalFromHourlyData(ordrarData)}
            isLoading={!ordrarData.length}
            color="purple"
            chartData={ordrarData}
            onClick={() => onStatisticsClick('ordrar')}
          />
        </div>

        {activeSection === 'ringlistor' && (
          <>
            {/* Dashboard Stats Cards */}
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
          </>
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
};

export default Dashboard;
