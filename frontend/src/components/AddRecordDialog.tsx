import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from 'axios'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Plus, Loader2, Camera, X, Calendar as CalendarIcon, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta.env.VITE_API_URL

interface Service {
  id: string
  name: string
  price: number
}

const recordSchema = z.object({
  serviceIds: z.array(z.string()),
  haircutType: z.string().min(2, 'Especifica el nombre del trabajo'),
  pricePaid: z.number().min(0),
  technicalNotes: z.string().optional(),
  status: z.enum(['COMPLETED', 'PROGRAMMED', 'CANCELED']),
  scheduledDate: z.date().optional().nullable(),
})

type RecordFormValues = z.infer<typeof recordSchema>

interface AddRecordDialogProps {
  clientId: string
  onRecordAdded: () => void
  initialData?: {
    id?: string
    serviceIds: string[]
    haircutType: string
    pricePaid: number
    technicalNotes?: string
    status: 'COMPLETED' | 'PROGRAMMED' | 'CANCELED'
    scheduledDate?: string | null
    photoUrls?: string[]
  }
  trigger?: React.ReactNode
}

export function AddRecordDialog({ clientId, onRecordAdded, initialData, trigger }: AddRecordDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    (initialData?.id && initialData?.photoUrls) ? initialData.photoUrls : []
  )
  const [services, setServices] = useState<Service[]>([])
  const [isScheduled, setIsScheduled] = useState(initialData?.status === 'PROGRAMMED')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RecordFormValues>({
    resolver: zodResolver(recordSchema),
    defaultValues: initialData ? {
      serviceIds: initialData.serviceIds,
      haircutType: initialData.haircutType,
      pricePaid: initialData.pricePaid,
      technicalNotes: initialData.technicalNotes || '',
      status: initialData.status,
      scheduledDate: initialData.scheduledDate ? new Date(initialData.scheduledDate) : null,
    } : {
      serviceIds: [],
      haircutType: '',
      pricePaid: 0,
      technicalNotes: '',
      status: 'COMPLETED',
      scheduledDate: null,
    },
  })

  const selectedServiceIds = watch('serviceIds')
  const scheduledDate = watch('scheduledDate')

  const [isFirstLoad, setIsFirstLoad] = useState(true)

  useEffect(() => {
    if (open) {
      axios.get(`${API_URL}/services`).then(res => setServices(res.data))
    } else {
      setIsFirstLoad(true)
    }
  }, [open])

  // Update price and names when services change
  useEffect(() => {
    if (selectedServiceIds.length > 0 && services.length > 0) {
      if (initialData && isFirstLoad) {
        setIsFirstLoad(false)
        return
      }
      
      const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))
      const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0)
      const names = selectedServices.map(s => s.name).join(' + ')
      
      setValue('pricePaid', totalPrice)
      setValue('haircutType', names)
    }
  }, [selectedServiceIds, services, setValue, initialData, isFirstLoad])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
      
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
      setPreviews((prev) => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    if (index < existingPhotos.length) {
      setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
    } else {
      const newIdx = index - existingPhotos.length
      setFiles((prev) => prev.filter((_, i) => i !== newIdx))
      setPreviews((prev) => prev.filter((_, i) => i !== newIdx))
    }
  }

  const toggleService = (id: string) => {
    const current = [...selectedServiceIds]
    const index = current.indexOf(id)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(id)
    }
    setValue('serviceIds', current)
  }

  const onSubmit = async (data: RecordFormValues) => {
    setIsSubmitting(true)
    try {
      const photoUrls: string[] = []

      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('client-photos')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('client-photos')
          .getPublicUrl(fileName)
        
        photoUrls.push(publicUrl)
      }

      const finalStatus = isScheduled ? 'PROGRAMMED' : 'COMPLETED'
      const payload = {
        ...data,
        status: finalStatus,
        scheduledDate: isScheduled && data.scheduledDate ? data.scheduledDate.toISOString() : null,
        clientId,
        photoUrls: [...existingPhotos, ...photoUrls],
      }

      if (initialData?.id) {
        await axios.patch(`${API_URL}/records/${initialData.id}`, payload)
        toast.success('Registro actualizado')
      } else {
        await axios.post(`${API_URL}/records`, payload)
        toast.success(isScheduled ? 'Cita programada' : 'Trabajo registrado')
      }
      setOpen(false)
      reset()
      setFiles([])
      setPreviews([])
      setIsScheduled(false)
      onRecordAdded()
    } catch {
      toast.error('Error al guardar el registro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = initialData?.id ? 'Editar Registro' : (initialData ? 'Nuevo Registro (Repetir)' : 'Registrar Servicio / Venta')
  const submitText = isSubmitting 
    ? 'Guardando...' 
    : (initialData?.id ? 'Guardar Cambios' : (isScheduled ? 'Programar Cita' : 'Finalizar Registro'))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2 bg-blue-600">
            <Plus className="w-4 h-4" />
            Nuevo Registro
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Programar para el futuro</Label>
              <p className="text-xs text-slate-500">¿Es una cita para otro día?</p>
            </div>
            <Switch 
              checked={isScheduled} 
              onCheckedChange={setIsScheduled} 
            />
          </div>

          {isScheduled && (
            <div className="space-y-2">
              <Label>Fecha Programada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP", { locale: es }) : <span>Selecciona el día</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate || undefined}
                    onSelect={(date) => setValue('scheduledDate', date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>Servicios realizados</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10 py-2 group">
                  <div className="flex flex-wrap gap-1">
                    {selectedServiceIds.length > 0 ? (
                      services
                        .filter(s => selectedServiceIds.includes(s.id))
                        .map(s => (
                          <Badge key={s.id} variant="secondary" className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100">
                            {s.name}
                            <X 
                              className="w-3 h-3 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleService(s.id);
                              }}
                            />
                          </Badge>
                        ))
                    ) : (
                      <span className="text-muted-foreground">Selecciona uno o más servicios...</span>
                    )}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[350px]" align="start">
                <Command>
                  <CommandInput placeholder="Buscar servicio..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                    <CommandGroup>
                      {services.map((s) => (
                        <CommandItem
                          key={s.id}
                          onSelect={() => toggleService(s.id)}
                          className="flex items-center justify-between"
                        >
                          <span>{s.name} (${s.price})</span>
                          {selectedServiceIds.includes(s.id) && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="haircutType">Nombre del Trabajo</Label>
              <Input
                id="haircutType"
                placeholder="Ej: Fade + Barba"
                {...register('haircutType')}
                className={errors.haircutType ? 'border-red-500' : ''}
              />
              {errors.haircutType && (
                <p className="text-xs text-red-500">{errors.haircutType.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePaid">Precio Total ($)</Label>
              <Input
                id="pricePaid"
                type="number"
                {...register('pricePaid', { valueAsNumber: true })}
                className={errors.pricePaid ? 'border-red-500' : ''}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="technicalNotes">Notas Técnicas</Label>
            <Textarea
              id="technicalNotes"
              placeholder="Ej: Navaja 0.5, tijera arriba..."
              {...register('technicalNotes')}
            />
          </div>

          <div className="space-y-2">
            <Label>Fotos {isScheduled ? '(Opcional/Referencia)' : 'del Trabajo'}</Label>
            <div className="grid grid-cols-3 gap-2">
              {[...existingPhotos, ...previews].map((src, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-slate-100 group">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <Label 
                htmlFor="photo-upload" 
                className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-6 h-6 text-slate-400" />
                <span className="text-[10px] text-slate-500 mt-1">Sube fotos</span>
                <input 
                  id="photo-upload" 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                submitText
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
