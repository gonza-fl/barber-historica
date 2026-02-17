import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  Scissors, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Loader2, 
  Camera, 
  User,
  CheckCircle2,
  Clock,
  Pencil,
  Copy
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AddRecordDialog } from './AddRecordDialog'

const API_URL = import.meta.env.VITE_API_URL

interface HaircutRecord {
  id: string
  date: string
  scheduledDate: string | null
  status: 'COMPLETED' | 'PROGRAMMED' | 'CANCELED'
  haircutType: string
  pricePaid: number
  technicalNotes: string | null
  photoUrls: string[]
  services: {
    serviceId: string
    service: {
      name: string
      price: number
    }
  }[]
}

interface Client {
  id: string
  name: string
  phone: string | null
  photoUrl: string | null
  notes: string | null
  records: HaircutRecord[]
}

interface ClientDetailsProps {
  clientId: string
  onBack: () => void
}

export function ClientDetails({ clientId, onBack }: ClientDetailsProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchClientDetails = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/clients/${clientId}`)
      setClient(response.data)
    } catch (error) {
      console.error('Error fetching client details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientDetails()
  }, [clientId])

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !client) return

    try {
      setLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${client.id}/profile-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(fileName)

      await axios.patch(`${API_URL}/clients/${client.id}`, {
        photoUrl: publicUrl
      })

      toast.success('Foto de perfil actualizada')
      fetchClientDetails()
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      toast.error('Error al subir la foto de perfil')
    } finally {
      setLoading(false)
    }
  }

  const confirmAppointment = async (recordId: string) => {
    try {
      await axios.patch(`${API_URL}/records/${recordId}`, {
        status: 'COMPLETED'
      })
      toast.success('Cita confirmada y registrada')
      fetchClientDetails()
    } catch (error) {
      console.error('Error confirming appointment:', error)
      toast.error('Error al confirmar la cita')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-500">Cargando ficha del cliente...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center p-8">
        <p>Cliente no encontrado</p>
        <Button onClick={onBack} variant="link">Volver</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="relative group">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center">
            {client.photoUrl ? (
              <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" className="hidden" accept="image/*" onChange={handleProfilePhotoUpload} />
          </label>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{client.name}</h2>
          <p className="text-sm text-slate-500">{client.phone || 'Sin teléfono'}</p>
        </div>
      </div>

      {client.notes && (
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex gap-3">
            <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">Notas del Cliente</p>
              <p className="text-sm text-blue-800">{client.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Historial de Trabajos</h3>
        <AddRecordDialog clientId={clientId} onRecordAdded={fetchClientDetails} />
      </div>

      <div className="space-y-4">
        {client.records.length > 0 ? (
          client.records.map((record) => (
            <Card key={record.id} className={cn(
              "overflow-hidden border-slate-200 transition-all",
              record.status === 'PROGRAMMED' ? "border-amber-200 bg-amber-50/30" : ""
            )}>
              <CardContent className="p-0">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-900 font-semibold text-lg">
                        <Scissors className="w-4 h-4 text-slate-400" />
                        {record.haircutType}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {record.services.map((rs, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-normal py-0">
                            {rs.service.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(record.status === 'PROGRAMMED' && record.scheduledDate ? record.scheduledDate : record.date), "d 'de' MMMM", { locale: es })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                          <AddRecordDialog
                            clientId={clientId}
                            onRecordAdded={fetchClientDetails}
                            initialData={{
                              haircutType: record.haircutType,
                              pricePaid: record.pricePaid,
                              technicalNotes: record.technicalNotes || '',
                              status: record.status,
                              scheduledDate: record.scheduledDate,
                              serviceIds: record.services.map(s => s.serviceId)
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-green-600" title="Repetir">
                                <Copy className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <AddRecordDialog
                            clientId={clientId}
                            onRecordAdded={fetchClientDetails}
                            initialData={{
                              id: record.id,
                              haircutType: record.haircutType,
                              pricePaid: record.pricePaid,
                              technicalNotes: record.technicalNotes || '',
                              status: record.status,
                              scheduledDate: record.scheduledDate,
                              serviceIds: record.services.map(s => s.serviceId),
                              photoUrls: record.photoUrls
                            }}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            }
                          />
                        {record.status === 'COMPLETED' ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Pagado ${record.pricePaid}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-[10px]">
                            <Clock className="w-3 h-3" />
                            Programado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {record.technicalNotes && (
                    <div className="flex gap-2 p-2 bg-slate-50 rounded-md border text-slate-600">
                      <FileText className="w-4 h-4 shrink-0 transition-all opacity-40" />
                      <p className="text-sm italic">
                        {record.technicalNotes}
                      </p>
                    </div>
                  )}

                  {record.photoUrls.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {record.photoUrls.map((url, idx) => (
                        <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-slate-100 bg-slate-50">
                          <img 
                            src={url} 
                            alt={`Trabajo ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {record.status === 'PROGRAMMED' && (
                    <div className="pt-2 border-t border-amber-200 mt-2">
                      <Button 
                        onClick={() => confirmAppointment(record.id)} 
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 h-9"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Realización y Pago
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-12 bg-white border-2 border-dashed rounded-xl text-slate-400">
            <div className="flex justify-center mb-3">
              <ImageIcon className="w-10 h-10 opacity-20" />
            </div>
            <p className="text-sm">Aún no hay registros</p>
          </div>
        )}
      </div>
    </div>
  )
}
