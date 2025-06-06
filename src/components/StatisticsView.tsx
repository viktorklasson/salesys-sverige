import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Filter } from 'lucide-react';
import Stats10 from '@/components/ui/stats-4';
import { salesysApi, StatisticsData, User, Team } from '@/services/salesysApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StatisticsViewProps {
  statType: 'avtal' | 'samtal' | 'ordrar';
  onBack: () => void;
}

interface ChartData {
  date: string;
  count: number;
}

interface UserStats {
  userId: string;
  fullName: string;
  teamName: string;
  totalCount: number;
  totalDuration?: number;
  connectedCount?: number;
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ statType, onBack }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  const getStatTitle = () => {
    switch (statType) {
      case 'avtal': return 'Avtal signerade';
      case 'samtal': return 'Samtal genomförda';
      case 'ordrar': return 'Ordrar skapade';
      default: return 'Statistik';
    }
  };

  const getApiEndpoint = () => {
    switch (statType) {
      case 'avtal': return 'issue_1238_2';
      case 'samtal': return 'issue_1238_2';
      case 'ordrar': return 'issue_1238_2';
      default: return 'issue_1238_2';
    }
  };

  const getDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30); // Last 30 days

    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    loadData();
  }, [statType]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const { from, to } = getDateRange();
      
      // Load users and teams data in parallel
      const [usersData, teamsData] = await Promise.all([
        salesysApi.getUsers(),
        salesysApi.getTeams()
      ]);

      setUsers(usersData);
      setTeams(teamsData);

      // Load statistics data based on stat type
      let statisticsData: StatisticsData[];
      
      switch (statType) {
        case 'avtal':
          statisticsData = await salesysApi.getStatistics({
            endpoint: getApiEndpoint(),
            from,
            to,
            fixedIntervalType: 'day'
          });
          break;
        case 'samtal':
          statisticsData = await salesysApi.getCallStatistics({
            endpoint: getApiEndpoint(),
            from,
            to,
            fixedIntervalType: 'day'
          });
          break;
        case 'ordrar':
          statisticsData = await salesysApi.getOrderStatistics({
            endpoint: getApiEndpoint(),
            from,
            to,
            fixedIntervalType: 'day'
          });
          break;
        default:
          statisticsData = [];
      }

      // Process chart data for horizontal stacked bar chart
      const userChartMap = new Map<string, { [key: string]: number }>();
      const dateSet = new Set<string>();

      statisticsData.forEach(item => {
        const date = item.intervalStart.split('T')[0];
        const user = usersData.find(u => u.id === item.userId);
        const userName = user?.fullName || 'Okänd användare';
        
        dateSet.add(date);
        
        if (!userChartMap.has(userName)) {
          userChartMap.set(userName, {});
        }
        
        const userData = userChartMap.get(userName)!;
        userData[date] = (userData[date] || 0) + item.count;
      });

      // Convert to chart format - taking top 5 users for better visibility
      const topUsers = Array.from(userChartMap.entries())
        .map(([userName, dates]) => ({
          userName,
          total: Object.values(dates).reduce((sum, count) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      const chartDataArray: any[] = Array.from(dateSet)
        .sort()
        .map(date => {
          const dataPoint: any = { date };
          topUsers.forEach(({ userName }) => {
            const userMap = userChartMap.get(userName);
            dataPoint[userName] = userMap?.[date] || 0;
          });
          return dataPoint;
        });

      setChartData(chartDataArray);

      // Process user stats
      const userStatsMap = new Map<string, {
        totalCount: number;
        totalDuration: number;
        connectedCount: number;
      }>();

      statisticsData.forEach(item => {
        const existing = userStatsMap.get(item.userId) || {
          totalCount: 0,
          totalDuration: 0,
          connectedCount: 0
        };

        userStatsMap.set(item.userId, {
          totalCount: existing.totalCount + item.count,
          totalDuration: existing.totalDuration + (item.totalDuration || 0),
          connectedCount: existing.connectedCount + (item.connectedCount || 0)
        });
      });

      const userStatsArray: UserStats[] = Array.from(userStatsMap.entries())
        .map(([userId, stats]) => {
          const user = usersData.find(u => u.id === userId);
          const team = teamsData.find(t => t.id === user?.teamId);
          
          return {
            userId,
            fullName: user?.fullName || 'Okänd användare',
            teamName: team?.name || 'Inget team',
            totalCount: stats.totalCount,
            totalDuration: stats.totalDuration,
            connectedCount: stats.connectedCount
          };
        })
        .sort((a, b) => b.totalCount - a.totalCount);

      setUserStats(userStatsArray);

    } catch (err) {
      setError('Kunde inte ladda statistikdata');
      console.error('Error loading statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUserStats = userStats.filter(user => {
    if (selectedUser !== 'all' && user.userId !== selectedUser) return false;
    if (selectedTeam !== 'all') {
      const userTeam = users.find(u => u.id === user.userId)?.teamId;
      if (userTeam !== selectedTeam) return false;
    }
    return true;
  });

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    return `${minutes}m`;
  };

  // Generate colors for top users
  const colors = ['#1665c0', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const topUsers = chartData.length > 0 ? Object.keys(chartData[0]).filter(key => key !== 'date') : [];
  const chartConfig: ChartConfig = topUsers.reduce((config, userName, index) => {
    config[userName] = {
      label: userName,
      color: colors[index % colors.length],
    };
    return config;
  }, {} as ChartConfig);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/4"></div>
            <div className="h-48 sm:h-64 bg-gray-200 rounded"></div>
            <div className="h-24 sm:h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
        <div className="container mx-auto">
          <Button onClick={onBack} variant="ghost" className="mb-4 sm:mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">{error}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="container mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button onClick={onBack} variant="ghost" className="self-start">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka
            </Button>
            <h1 className="text-xl sm:text-2xl font-light text-gray-800">{getStatTitle()}</h1>
            <Badge variant="outline" className="self-start">Senaste 30 dagarna</Badge>
          </div>
        </div>

        {/* Chart - Using Stats10 component */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg font-light text-gray-700">
              Trendanalys - Topp användare
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Stats10 />
          </CardContent>
        </Card>

        {/* User Stats Table */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-base sm:text-lg font-light text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Användarstatistik
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Filter className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {selectedUser === 'all' ? 'Alla användare' : users.find(u => u.id === selectedUser)?.fullName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedUser('all')}>
                      Alla användare
                    </DropdownMenuItem>
                    {users.map(user => (
                      <DropdownMenuItem key={user.id} onClick={() => setSelectedUser(user.id)}>
                        {user.fullName}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="justify-start">
                      <Filter className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="truncate">
                        {selectedTeam === 'all' ? 'Alla team' : teams.find(t => t.id === selectedTeam)?.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setSelectedTeam('all')}>
                      Alla team
                    </DropdownMenuItem>
                    {teams.map(team => (
                      <DropdownMenuItem key={team.id} onClick={() => setSelectedTeam(team.id)}>
                        {team.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Användare</TableHead>
                    <TableHead className="min-w-[100px]">Team</TableHead>
                    <TableHead className="min-w-[80px]">Antal</TableHead>
                    {statType === 'samtal' && (
                      <>
                        <TableHead className="min-w-[80px]">Anslutna</TableHead>
                        <TableHead className="min-w-[80px]">Total tid</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUserStats.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: teams.find(t => t.name === user.teamName)?.color }}>
                          {user.teamName}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.totalCount}</TableCell>
                      {statType === 'samtal' && (
                        <>
                          <TableCell>{user.connectedCount}</TableCell>
                          <TableCell>{formatDuration(user.totalDuration || 0)}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatisticsView;
