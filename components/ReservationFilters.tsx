'use client';

import { FilterOptions } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect } from 'react';

interface ReservationFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function ReservationFilters({ filters, onFiltersChange }: ReservationFiltersProps) {
  const [local, setLocal] = useState<FilterOptions>(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const handleTypeChange = (value: 'all' | 'departure' | 'arrival') => {
    // Clear both dates when switching type
    setLocal({ ...local, type: value, inDate: undefined, outDate: undefined });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value; // YYYY-MM-DD from <input type="date">
    if (local.type === 'departure') setLocal({ ...local, outDate: v });
    else if (local.type === 'arrival') setLocal({ ...local, inDate: v });
  };

  const currentDate =
    local.type === 'departure' ? (local.outDate ?? '') :
    local.type === 'arrival'   ? (local.inDate  ?? '') : '';

  const dateLabel =
    local.type === 'departure' ? 'Date de départ' :
    local.type === 'arrival'   ? "Date d'arrivée" : '';

  const helperText =
    local.type === 'departure' ? 'Filtrer par date de départ du vol aller' :
    local.type === 'arrival'   ? "Filtrer par date d'arrivée à destination" : '';

  const filterInfo =
    local.type === 'departure' && local.outDate
      ? `Vols au départ le ${toDisplayDate(local.outDate)}`
      : local.type === 'arrival' && local.inDate
      ? `Vols à l'arrivée le ${toDisplayDate(local.inDate)}`
      : '';

  const handleReset = () => {
    const reset: FilterOptions = { type: 'all', inDate: undefined, outDate: undefined, searchTerm: undefined };
    setLocal(reset);
    onFiltersChange(reset);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 2: Filtrer &amp; Exporter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Type */}
        <div className="space-y-3">
          <Label>Type</Label>
          <RadioGroup value={local.type} onValueChange={handleTypeChange} className="space-y-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="cursor-pointer">Toutes les réservations</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="arrival" id="arrival" />
              <Label htmlFor="arrival" className="cursor-pointer">Arrivée</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="departure" id="departure" />
              <Label htmlFor="departure" className="cursor-pointer">Départ</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Date picker */}
        {local.type !== 'all' && (
          <div className="space-y-2">
            <Label htmlFor="date">{dateLabel}</Label>
            <Input id="date" type="date" value={currentDate} onChange={handleDateChange} />
            <p className="text-xs text-gray-500">{helperText}</p>
          </div>
        )}

        {/* Active filter info */}
        {filterInfo && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{filterInfo}</div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-4">
          <Button onClick={() => onFiltersChange(local)} className="w-full">
            Valider
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full">
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** YYYY-MM-DD (HTML input) → DD/MM/YYYY (display) */
function toDisplayDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}