
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Users, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
      case 'avtal': return 'issue_1238_2'; // This might need adjustment based on actual endpoint
      case 'samtal': return 'issue_1238_2'; // This might need adjustment based on actual endpoint
      case 'ordrar': return 'issue_1238_2'; // This might need adjustment based on actual endpoint
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
      
      // Load all required data in parallel
      const [statisticsData, usersData, teamsData] = await Promise.all([
        salesysApi.getStatistics({
          endpoint: getApiEndpoint(),
          from,
          to,
          fixedIntervalType: 'day'
        }),
        salesysApi.getUsers(),
        salesysApi.getTeams()
      ]);

      setUsers(usersData);
      setTeams(teamsData);

      // Process chart data
      const chartMap = new Map<string, number>();
      statisticsData.forEach(item => {
        const date = item.intervalStart.split('T')[0];
        chartMap.set(date, (chartMap.get(date) || 0) + item.count);
      });

      const chartDataArray: ChartData[] = Array.from(chartMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto">
          <Button onClick={onBack} variant="ghost" className="mb-6">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tillbaka
            </Button>
            <h1 className="text-2xl font-light text-gray-800">{getStatTitle()}</h1>
            <Badge variant="outline">Senaste 30 dagarna</Badge>
          </div>
        </div>

        {/* Chart */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-light text-gray-700">Trendanalys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#666"
                    fontSize={12}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString('sv-SE')}
                    formatter={(value) => [value, 'Antal']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1665c0" 
                    strokeWidth={2}
                    dot={{ fill: '#1665c0', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* User Stats Table */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-light text-gray-700 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Användarstatistik
              </CardTitle>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      {selectedUser === 'all' ? 'Alla användare' : users.find(u => u.id === selectedUser)?.fullName}
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
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      {selectedTeam === 'all' ? 'Alla team' : teams.find(t => t.id === selectedTeam)?.name}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Användare</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Antal</TableHead>
                  {statType === 'samtal' && (
                    <>
                      <TableHead>Anslutna</TableHead>
                      <TableHead>Total tid</TableHead>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatisticsView;
