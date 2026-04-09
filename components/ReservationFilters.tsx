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
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [dateError, setDateError] = useState<string>('');

  // Sync local filters with props when they change externally
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleTypeChange = (value: 'all' | 'departure' | 'arrival') => {
    const newFilters = { ...localFilters, type: value };
    // Clear dates when changing type
    if (value === 'departure') {
      newFilters.outDate = undefined;
      newFilters.inDate = undefined;
    } else if (value === 'arrival') {
      newFilters.inDate = undefined;
      newFilters.outDate = undefined;
    }
    setLocalFilters(newFilters);
    setDateError('');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    
    if (localFilters.type === 'departure') {
      // For Departure: use outDate
      setLocalFilters({ ...localFilters, outDate: dateValue });
    } else if (localFilters.type === 'arrival') {
      // For Arrival: use inDate
      setLocalFilters({ ...localFilters, inDate: dateValue });
    }
    setDateError('');
  };

  const handleValidate = () => {
    // No validation needed - single date is optional
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      type: 'all',
      inDate: undefined,
      outDate: undefined,
      searchTerm: undefined,
    };
    setLocalFilters(resetFilters);
    setDateError('');
    onFiltersChange(resetFilters);
  };

  // Get current date value based on type
  const getCurrentDateValue = () => {
    if (localFilters.type === 'departure') {
      return localFilters.outDate || '';
    } else if (localFilters.type === 'arrival') {
      return localFilters.inDate || '';
    }
    return '';
  };

  // Get date label based on type
  const getDateLabel = () => {
    if (localFilters.type === 'departure') {
      return 'Departure Date';
    } else if (localFilters.type === 'arrival') {
      return 'Arrival Date';
    }
    return '';
  };

  // Get helper text based on type
const getHelperText = () => {
  if (localFilters.type === 'departure') {
    return 'Filter outbound flights by their departure date from origin';
  } else if (localFilters.type === 'arrival') {
    return 'Filter outbound flights by their arrival date at destination';
  }
  return '';
};

const getFilterInfo = () => {
  if (localFilters.type === 'departure' && localFilters.outDate) {
    return `Showing outbound flights departing on ${localFilters.outDate}`;
  } else if (localFilters.type === 'arrival' && localFilters.inDate) {
    return `Showing outbound flights arriving at destination on ${localFilters.inDate}`;
  }
  return '';
};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 2: Filtrer & Exporter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trip Type Selection */}
        <div className="space-y-3">
          <Label>Type</Label>
          <RadioGroup
            value={localFilters.type}
            onValueChange={handleTypeChange}
            className="space-y-2"
          >
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

        {/* Single Date Picker - Only show when type is not 'all' */}
        {localFilters.type !== 'all' && (
          <div className="space-y-2">
            <Label htmlFor="date">{getDateLabel()}</Label>
            <Input
              id="date"
              type="date"
              value={getCurrentDateValue()}
              onChange={handleDateChange}
              placeholder="Select date"
            />
            <p className="text-xs text-gray-500">{getHelperText()}</p>
          </div>
        )}

        {/* Filter Info Message */}
        {localFilters.type !== 'all' && getFilterInfo() && (
          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
            {getFilterInfo()}
          </div>
        )}

        {/* Error Message */}
        {dateError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {dateError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <Button 
            onClick={handleValidate} 
            className="w-full"
            variant="default"
          >
            Valider
          </Button>
          <Button 
            onClick={handleReset} 
            variant="outline" 
            className="w-full"
          >
            Réinitialiser
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}