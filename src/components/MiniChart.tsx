
import React from 'react';
import { ChartContainer } from '@/components/ui/chart';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

interface MiniChartProps {
  data: Array<{ date: string; value: number }>;
  color: 'blue' | 'green' | 'purple';
  className?: string;
}

const MiniChart: React.FC<MiniChartProps> = ({ data, color, className }) => {
  const colorMap = {
    blue: 'hsl(213.3 100% 46.9%)',
    green: 'hsl(142.1 76.2% 36.3%)',
    purple: 'hsl(262.1 83.3% 57.8%)',
  };

  const chartColor = colorMap[color];
  const gradientId = `gradient-${color}`;

  return (
    <div className={cn('h-16 w-full overflow-hidden', className)}>
      <ChartContainer
        className="w-full h-full"
        config={{
          value: {
            label: 'Värde',
            color: chartColor,
          },
        }}
      >
        <RechartsPrimitive.AreaChart data={data}>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={chartColor}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={chartColor}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <RechartsPrimitive.XAxis dataKey="date" hide={true} />
          <RechartsPrimitive.Area
            dataKey="value"
            stroke={chartColor}
            fill={`url(#${gradientId})`}
            fillOpacity={0.4}
            strokeWidth={1.5}
            type="monotone"
          />
        </RechartsPrimitive.AreaChart>
      </ChartContainer>
    </div>
  );
};

export default MiniChart;
