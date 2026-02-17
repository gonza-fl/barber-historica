import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL

interface Service {
  id: string
  name: string
  price: number
}

export function ServicesManager() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState({ name: '', price: '' })

  const fetchServices = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/services`)
      setServices(response.data)
    } catch (error) {
      toast.error('Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const handleAdd = async () => {
    if (!newService.name || !newService.price) return
    try {
      await axios.post(`${API_URL}/services`, {
        name: newService.name,
        price: parseFloat(newService.price)
      })
      toast.success('Servicio agregado')
      setNewService({ name: '', price: '' })
      setIsAdding(false)
      fetchServices()
    } catch (error) {
      toast.error('Error al agregar servicio')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este servicio?')) return
    try {
      await axios.delete(`${API_URL}/services/${id}`)
      toast.success('Servicio eliminado')
      fetchServices()
    } catch (error) {
      toast.error('Error al eliminar servicio')
    }
  }

  const handleEditInit = (service: Service) => {
    setEditingId(service.id)
    setEditValues({ name: service.name, price: service.price.toString() })
  }

  const handleUpdate = async (id: string) => {
    try {
      await axios.patch(`${API_URL}/services/${id}`, {
        name: editValues.name,
        price: parseFloat(editValues.price)
      })
      toast.success('Servicio actualizado')
      setEditingId(null)
      fetchServices()
    } catch (error) {
      toast.error('Error al actualizar servicio')
    }
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Servicios y Precios</h2>
        <Button 
          size="sm" 
          onClick={() => setIsAdding(!isAdding)}
          variant={isAdding ? 'ghost' : 'default'}
        >
          {isAdding ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isAdding ? 'Cancelar' : 'Nuevo'}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-4 border-blue-200 bg-blue-50/50 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Nombre</label>
              <Input 
                placeholder="Ej. Corte clásic" 
                value={newService.name}
                onChange={(e) => setNewService({ ...newService, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Precio ($)</label>
              <Input 
                type="number" 
                placeholder="1500" 
                value={newService.price}
                onChange={(e) => setNewService({ ...newService, price: e.target.value })}
              />
            </div>
          </div>
          <Button className="w-full" onClick={handleAdd}>Guardar Servicio</Button>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid gap-3">
          {services.map(service => (
            <Card key={service.id} className="p-4 flex items-center justify-between">
              {editingId === service.id ? (
                <div className="flex-1 flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Input 
                      className="h-8 text-sm"
                      value={editValues.name}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Input 
                      type="number"
                      className="h-8 text-sm"
                      value={editValues.price}
                      onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(service.id)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    <p className="text-sm font-bold text-blue-600">${service.price}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400" onClick={() => handleEditInit(service)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-red-400" onClick={() => handleDelete(service.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ))}
          {services.length === 0 && !isAdding && (
            <div className="text-center p-8 text-slate-400 border-2 border-dashed rounded-lg">
              No hay servicios configurados
            </div>
          )}
        </div>
      )}
    </div>
  )
}
