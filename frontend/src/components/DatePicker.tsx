"use client"

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  minDate?: string // YYYY-MM-DD
  className?: string
  clearable?: boolean
}

function toDate(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00')
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  onClear,
  placeholder = 'Selecione uma data',
  minDate,
  className,
  clearable = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = value ? toDate(value) : undefined
  const disabledMatcher = minDate ? { before: toDate(minDate) } : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon />
          {value
            ? format(toDate(value), 'dd/MM/yyyy', { locale: ptBR })
            : <span>{placeholder}</span>}
          {clearable && value && onClear && (
            <X
              className="ml-auto opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(toDateString(date))
              setOpen(false)
            }
          }}
          disabled={disabledMatcher}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
