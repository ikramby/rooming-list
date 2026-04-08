'use client';

import { FilterOptions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

interface ReservationFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function ReservationFilters({ filters, onFiltersChange }: ReservationFiltersProps) {
  const handleTypeChange = (newType: FilterOptions['type']) => {
    onFiltersChange({ ...filters, type: newType });
  };

  const handleStartDateChange = (date: string) => {
    onFiltersChange({ ...filters, startDate: date });
  };

  const handleEndDateChange = (date: string) => {
    onFiltersChange({ ...filters, endDate: date });
  };

  const handleSearchChange = (term: string) => {
    onFiltersChange({ ...filters, searchTerm: term });
  };

  const clearFilters = () => {
    onFiltersChange({
      type: 'all',
      startDate: undefined,
      endDate: undefined,
      searchTerm: undefined,
    });
  };

  const hasActiveFilters =
    filters.type !== 'all' || filters.startDate || filters.endDate || filters.searchTerm;

  return (
    <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Trip Type</label>
          <div className="flex gap-2">
            {(['all', 'departure', 'arrival'] as const).map((type) => (
              <Button
                key={type}
                variant={filters.type === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTypeChange(type)}
                className="flex-1"
              >
                {type === 'all' ? 'All' : type === 'departure' ? 'Departure' : 'Arrival'}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="start-date" className="text-sm font-medium">
              Start Date
            </label>
            <Input
              id="start-date"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="end-date" className="text-sm font-medium">
              End Date
            </label>
            <Input
              id="end-date"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Search Filter */}
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search (Name, Booking Ref, Hotel)
          </label>
          <Input
            id="search"
            type="text"
            placeholder="Search reservations..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-white dark:bg-slate-800"
          />
        </div>
      </div>
    </Card>
  );
}
