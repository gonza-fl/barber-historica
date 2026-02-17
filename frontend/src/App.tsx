import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Scissors, Loader2, User, LayoutDashboard, Settings } from 'lucide-react'
import { AddClientDialog } from '@/components/AddClientDialog'
import { ClientDetails } from '@/components/ClientDetails'
import { ServicesManager } from '@/components/ServicesManager'
import { Dashboard } from '@/components/Dashboard'
import { Toaster } from '@/components/ui/sonner'

const API_URL = import.meta.env.VITE_API_URL

interface Client {
  id: string
  name: string
  phone: string | null
  photoUrl: string | null
  notes: string | null
  _count: {
    records: number
  }
}

type View = 'clients' | 'dashboard' | 'services'

function App() {
  const [currentView, setCurrentView] = useState<View>('clients')
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/clients`)
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentView === 'clients') {
      fetchClients()
    }
  }, [fetchClients, currentView])

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone?.includes(search)
  )

  if (selectedClientId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-20 p-4">
        <Toaster position="top-center" />
        <ClientDetails 
          clientId={selectedClientId} 
          onBack={() => {
            setSelectedClientId(null)
            fetchClients() // Refresh count
          }} 
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white border-b p-4 sticky top-0 z-10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Scissors className="w-6 h-6 text-blue-600" />
          BarberHistórica
        </h1>
        {currentView === 'clients' && <AddClientDialog onClientAdded={fetchClients} />}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {currentView === 'clients' && (
          <div className="space-y-6">
            {/* Search Section */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                placeholder="Buscar cliente por nombre o tel..." 
                className="pl-10 h-12 text-lg shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Recent Activity */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {search ? 'Resultados de búsqueda' : 'Clientes registrados'}
              </h2>
              
              {loading && clients.length === 0 ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                </div>
              ) : filteredClients.length > 0 ? (
                <div className="grid gap-3">
                  {filteredClients.map(client => (
                    <Card 
                      key={client.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-all group"
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <div className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          {client.photoUrl ? (
                            <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900 truncate">{client.name}</h3>
                            <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {client._count.records} cortes
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            {client.phone || 'Sin teléfono'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 border-2 border-dashed rounded-lg">
                  No se encontraron clientes
                </div>
              )}
            </section>
          </div>
        )}

        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'services' && <ServicesManager />}
      </main>

      {/* Navigation Bar (Mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
        <Button 
          variant="ghost" 
          className={`flex flex-col gap-1 h-auto ${currentView === 'clients' ? 'text-blue-600' : 'text-slate-400'}`}
          onClick={() => setCurrentView('clients')}
        >
          <Scissors className="w-6 h-6" />
          <span className="text-[10px]">Cortes</span>
        </Button>
        <Button 
          variant="ghost" 
          className={`flex flex-col gap-1 h-auto ${currentView === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px]">Dashboard</span>
        </Button>
        <Button 
          variant="ghost" 
          className={`flex flex-col gap-1 h-auto ${currentView === 'services' ? 'text-blue-600' : 'text-slate-400'}`}
          onClick={() => setCurrentView('services')}
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px]">Servicios</span>
        </Button>
      </nav>
    </div>
  )
}

export default App
