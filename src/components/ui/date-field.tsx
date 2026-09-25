import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/format-date";

type DateFieldProps = {
  /** ISO YYYY-MM-DD or empty string */
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  min?: string;
  max?: string;
};

function parseISO(v: string): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateField({
  value,
  onChange,
  id,
  name,
  required,
  disabled,
  className,
  placeholder = "Pick a date",
  min,
  max,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const date = parseISO(value);
  const minDate = min ? parseISO(min) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  return (
    <>
      {/* Hidden native input keeps form semantics + required validation */}
      <input type="hidden" id={id} name={name} value={value} required={required} readOnly />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? formatDate(toISO(date)) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(toISO(d));
                setOpen(false);
              } else {
                onChange("");
              }
            }}
            disabled={(d) => {
              if (minDate && d < minDate) return true;
              if (maxDate && d > maxDate) return true;
              return false;
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
