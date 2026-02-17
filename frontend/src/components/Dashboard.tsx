import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, TrendingUp, DollarSign, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const API_URL = import.meta.env.VITE_API_URL

interface StatsData {
  totalIncome: number
  projectedIncome: number
  completedCount: number
  programmedCount: number
  chartData: { date: string; income: number }[]
}

export function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_URL}/stats/financial`)
        setStats(response.data)
      } catch (error) {
        toast.error('Error al cargar estadísticas')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-slate-900">Resumen Financiero</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-600 text-white border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-100 text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ingresos Reales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats?.totalIncome.toLocaleString()}</div>
            <p className="text-blue-200 text-xs mt-2">{stats?.completedCount} trabajos realizados</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500 text-white border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-16 h-16" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-50 text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ingresos Proyectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats?.projectedIncome.toLocaleString()}</div>
            <p className="text-amber-100 text-xs mt-2">{stats?.programmedCount} citas pendientes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Evolución de Ingresos
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] p-0 pr-4 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats?.chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(str) => format(parseISO(str), 'dd MMM', { locale: es })}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelFormatter={(str) => format(parseISO(str), 'PPPP', { locale: es })}
              />
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {!stats?.chartData.length && (
        <div className="text-center p-8 text-slate-400 border-2 border-dashed rounded-lg bg-white">
          Aún no hay datos para mostrar en el gráfico
        </div>
      )}
    </div>
  )
}
