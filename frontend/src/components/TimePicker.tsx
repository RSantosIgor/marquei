import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimePickerProps {
  value: string // "HH:MM"
  onChange: (value: string) => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))

export function TimePicker({ value, onChange }: TimePickerProps) {
  const parts = value ? value.split(':') : []
  const h = parts[0] ?? '08'
  const m = parts[1] ?? '00'

  return (
    <div className="flex items-center gap-1">
      <Select value={h} onValueChange={(v) => onChange(`${v}:${m}`)}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {HOURS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={m} onValueChange={(v) => onChange(`${h}:${v}`)}>
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {MINUTES.map((min) => (
            <SelectItem key={min} value={min}>
              {min}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
